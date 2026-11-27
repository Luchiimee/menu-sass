package uno.snappy.app.ui

import android.app.Application
import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import uno.snappy.app.data.AlertSettings
import uno.snappy.app.push.AlertPlayer
import com.google.firebase.messaging.FirebaseMessaging
import io.github.jan.supabase.realtime.RealtimeChannel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import uno.snappy.app.data.CategoryDto
import uno.snappy.app.data.OrderDto
import uno.snappy.app.data.OrderStatus
import uno.snappy.app.data.ProductDto
import uno.snappy.app.data.RestaurantDto
import uno.snappy.app.data.TableDto
import uno.snappy.app.data.CashShiftDto
import uno.snappy.app.data.ExpenseDto
import uno.snappy.app.data.ExtraDto
import uno.snappy.app.data.buildCashSummary
import uno.snappy.app.data.cashShiftRange
import uno.snappy.app.data.normalizeCloseHour
import uno.snappy.app.data.todayAR
import uno.snappy.app.data.ImageUtil
import uno.snappy.app.data.Repository

enum class Stage { LOADING, LOGIN, READY }

data class UiState(
    val cashDate: String? = null,
    val viewShift: CashShiftDto? = null,
    val dayShifts: List<CashShiftDto> = emptyList(),
    val cashLocked: Boolean = false,
    val staleDismissed: Boolean = false,
    val ordersKind: String = "delivery",
    val mainTab: Int = 0,
    val focusKind: String? = null,
    val moreRequest: String? = null,
    val stage: Stage = Stage.LOADING,
    val loginError: String? = null,
    val loggingIn: Boolean = false,
    val restaurant: RestaurantDto? = null,
    val orders: List<OrderDto> = emptyList(),
    val categories: List<CategoryDto> = emptyList(),
    val products: List<ProductDto> = emptyList(),
    val tables: List<TableDto> = emptyList(),
    val extras: List<ExtraDto> = emptyList(),
    val payments: List<uno.snappy.app.data.BillingPaymentDto> = emptyList(),
    val paymentsLoaded: Boolean = false,
    // Caja: turno abierto (null = no hay), sus pedidos y gastos
    val shift: CashShiftDto? = null,
    val shiftOrders: List<OrderDto> = emptyList(),
    val expenses: List<ExpenseDto> = emptyList(),
    val cashLoaded: Boolean = false,
    val message: String? = null,
    val savingProduct: Boolean = false,
    val formError: String? = null,
    // Aviso de pedido nuevo (ajustes de este dispositivo)
    val alertRepeat: Boolean = false,
    val alertSound: String = AlertSettings.SOUND_NOTIFICATION,
    val alertInterval: Int = 20,
    val ringing: Boolean = false,
    val silenced: Boolean = false,
)

private data class AlarmKey(val pending: Int, val repeat: Boolean, val sound: String, val interval: Int, val silenced: Boolean)

// Cerebro de la app. Vive mientras viva el proceso (no la pantalla): así la escucha de pedidos y la alarma
// siguen andando aunque se cierre la ventana o se apague la pantalla.
class AppController(private val app: Application) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val repo = Repository()
    private val settings = AlertSettings(app)
    private val alertPlayer = AlertPlayer(app)
    private val _state = MutableStateFlow(UiState(alertRepeat = settings.repeat, alertSound = settings.sound, alertInterval = settings.intervalSec))
    val state: StateFlow<UiState> = _state.asStateFlow()

    private var liveJob: Job? = null
    private var tablesJob: Job? = null
    private var tablesChannel: RealtimeChannel? = null
    private var liveChannel: RealtimeChannel? = null

    init {
        // Alarma de pedido nuevo: si está en "repetir", suena hasta que no queden pedidos sin atender (o se silencie).
        scope.launch {
            var lastPending = 0
            _state
                .map { s ->
                    AlarmKey(
                        pending = if (s.stage == Stage.READY) s.orders.count { it.status == OrderStatus.PENDIENTE } else 0,
                        repeat = s.alertRepeat, sound = s.alertSound, interval = s.alertInterval, silenced = s.silenced,
                    )
                }
                .distinctUntilChanged()
                .collect { key ->
                    // Un pedido nuevo vuelve a hacer sonar aunque se haya silenciado el anterior
                    if (key.silenced && (key.pending == 0 || key.pending > lastPending)) {
                        _state.update { it.copy(silenced = false) }
                    }
                    lastPending = key.pending
                    val ring = key.repeat && key.pending > 0 && !key.silenced
                    if (ring) alertPlayer.start(key.sound, key.interval) else alertPlayer.stop()
                    _state.update { if (it.ringing == ring) it else it.copy(ringing = ring) }
                }
        }
        // Vuelta del login con Google: llega la sesión y, solo si lo pedimos nosotros, entramos al panel.
        scope.launch {
            repo.sessionStatus().collect { s ->
                if (googlePending && repo.isAuthenticated(s) && _state.value.stage == Stage.LOGIN) {
                    googlePending = false
                    _state.update { it.copy(loggingIn = true, loginError = null) }
                    enter()
                }
            }
        }
        scope.launch {
            runCatching { repo.awaitSession() }
            if (repo.hasSession()) enter() else _state.update { it.copy(stage = Stage.LOGIN) }
        }
    }

    fun signIn(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _state.update { it.copy(loginError = "Completá el email y la contraseña.") }
            return
        }
        _state.update { it.copy(loggingIn = true, loginError = null) }
        scope.launch {
            try {
                repo.signIn(email, password)
                enter()
            } catch (e: Exception) {
                _state.update { it.copy(loggingIn = false, loginError = "Email o contraseña incorrectos.") }
            }
        }
    }

    private var googlePending = false

    // Entra con Google: abre el navegador y, cuando vuelve con la sesión, el collector de init() llama a enter().
    fun signInWithGoogle() {
        googlePending = true
        _state.update { it.copy(loginError = null) }
        scope.launch {
            try { repo.signInWithGoogle() } catch (e: Exception) {
                googlePending = false
                _state.update { it.copy(loginError = "No se pudo abrir el ingreso con Google.") }
            }
        }
    }

    fun signOut() {
        scope.launch {
            stopLive()
            // Sacamos este celu de los avisos antes de cerrar sesión (si no, seguiría recibiendo pedidos).
            runCatching {
                val token = kotlinx.coroutines.suspendCancellableCoroutine<String?> { cont ->
                    FirebaseMessaging.getInstance().token
                        .addOnSuccessListener { cont.resume(it) {} }
                        .addOnFailureListener { cont.resume(null) {} }
                }
                if (token != null) repo.deleteFcmToken(token)
            }
            runCatching { repo.signOut() }
            _state.value = UiState(stage = Stage.LOGIN, alertRepeat = settings.repeat, alertSound = settings.sound, alertInterval = settings.intervalSec)
        }
    }

    private suspend fun enter() {
        val restaurant = runCatching { repo.myRestaurant() }.getOrNull()
        if (restaurant == null) {
            _state.update { it.copy(stage = Stage.LOGIN, loggingIn = false, loginError = "Esta cuenta no tiene un local en Snappy.") }
            runCatching { repo.signOut() }
            return
        }
        _state.update { it.copy(stage = Stage.READY, loggingIn = false, restaurant = restaurant) }
        refreshOrders()
        refreshCatalog()
        refreshExtras()
        refreshCash()
        refreshTables()
        startLive(restaurant.id)
        startTablesLive(restaurant.id)
        registerPush()
    }

    // Guarda el token de Firebase de este celu para recibir los pedidos con la app cerrada.
    private fun registerPush() {
        runCatching {
            FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
                scope.launch { runCatching { repo.saveFcmToken(token) } }
            }
        }
    }

    fun refreshOrders() {
        val id = _state.value.restaurant?.id ?: return
        scope.launch {
            runCatching { repo.recentOrders(id) }
                .onSuccess { list -> _state.update { it.copy(orders = list) } }
                .onFailure { _state.update { s -> s.copy(message = "No se pudieron cargar los pedidos.") } }
        }
    }

    // Vuelve a leer todo y re-engancha el "en vivo". Se usa al volver a la app, cada tanto y al tirar hacia abajo.
    // Al volver del celu dormido el wifi tarda un poco: si falla, reintenta solo (sin avisos) antes de rendirse.
    fun resync() {
        scope.launch {
            for (wait in listOf(0L, 2_000L, 5_000L, 10_000L)) {
                delay(wait)
                if (resyncNow(quiet = true)) return@launch
            }
            _state.update { it.copy(message = "No hay conexión. Revisá tu internet.") }
        }
    }

    suspend fun resyncNow(quiet: Boolean = false): Boolean {
        val id = _state.value.restaurant?.id ?: return false
        repo.ensureSession()
        var orders = runCatching { repo.recentOrders(id) }.getOrNull()
        // Una lista vacía justo al volver, cuando antes había pedidos, casi seguro es una lectura sin sesión: se vuelve a leer.
        if (orders != null && orders.isEmpty() && _state.value.orders.isNotEmpty()) {
            delay(1_500)
            repo.ensureSession()
            orders = runCatching { repo.recentOrders(id) }.getOrNull()
        }
        val tables = runCatching { repo.tables(id) }.getOrNull()
        if (orders != null) _state.update { it.copy(orders = orders) }
        if (tables != null) _state.update { it.copy(tables = tables) }
        loadCash()
        if (orders == null) {
            if (!quiet) _state.update { it.copy(message = "No hay conexión. Revisá tu internet.") }
            return false
        }
        startLive(id)
        startTablesLive(id)
        return true
    }

    fun refreshTables() {
        val id = _state.value.restaurant?.id ?: return
        scope.launch { runCatching { repo.tables(id) }.onSuccess { t -> _state.update { it.copy(tables = t) } } }
    }

    fun openTable(table: TableDto) {
        val id = _state.value.restaurant?.id ?: return
        scope.launch {
            runCatching { repo.openTable(id, table.name) }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo abrir la mesa.") } }
        }
    }

    fun addProductToOrder(order: OrderDto, product: ProductDto) {
        val price = product.price ?: return
        _state.update { s ->
            s.copy(orders = s.orders.map {
                if (it.id != order.id) it else it.copy(total = (it.total ?: 0.0) + price)
            })
        }
        scope.launch {
            runCatching { repo.addItemToOrder(order, product.name, price) }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo agregar el producto.") }; refreshOrders() }
        }
    }

    fun resetAttention(table: TableDto) {
        _state.update { s -> s.copy(tables = s.tables.map { if (it.id == table.id) it.copy(needsAttention = false) else it }) }
        scope.launch { runCatching { repo.resetAttention(table.id) }.onFailure { refreshTables() } }
    }

    fun refreshCatalog() {
        val id = _state.value.restaurant?.id ?: return
        scope.launch {
            runCatching { repo.categories(id) to repo.products(id) }
                .onSuccess { (c, p) -> _state.update { it.copy(categories = c, products = p) } }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo cargar el catálogo.") } }
        }
    }

    // Pedidos en vivo: un pedido nuevo suena y aparece solo.
    private fun startLive(restaurantId: String) {
        stopLive()
        liveJob = scope.launch {
            var failures = 0
            // Si el "en vivo" se corta (internet, celu dormido) se reconecta solo, sin molestar con avisos.
            while (true) {
            try {
                val (channel, flow) = repo.orderEvents(restaurantId)
                liveChannel = channel
                failures = 0
                flow.collect { event ->
                    when (event) {
                        is Repository.OrderEvent.Inserted -> {
                            _state.update { s ->
                                if (s.orders.any { it.id == event.order.id }) s else s.copy(orders = listOf(event.order) + s.orders)
                            }
                            // El sonido lo pone el aviso de Firebase; la app solo suena si las notificaciones están bloqueadas
                            if (event.order.status == OrderStatus.PENDIENTE && !_state.value.alertRepeat &&
                                !NotificationManagerCompat.from(app).areNotificationsEnabled()
                            ) beep()
                        }
                        is Repository.OrderEvent.Updated ->
                            _state.update { s -> s.copy(orders = s.orders.map { if (it.id == event.order.id) event.order else it }) }
                        is Repository.OrderEvent.Deleted ->
                            _state.update { s -> s.copy(orders = s.orders.filter { it.id != event.id }) }
                    }
                }
                failures = 0
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (_: Exception) {
                failures++
                if (failures == 4) _state.update { it.copy(message = "Sin conexión en vivo. Tirá hacia abajo para actualizar.") }
            }
            liveChannel?.let { repo.closeChannel(it) }
            liveChannel = null
            delay(if (failures < 4) 3_000L else 15_000L)
            // Mientras se reconecta, se vuelven a leer los pedidos para no perder ninguno
            runCatching { repo.recentOrders(restaurantId) }.getOrNull()?.let { o -> _state.update { it.copy(orders = o) } }
            }
        }
    }

    private fun startTablesLive(restaurantId: String) {
        tablesJob?.cancel()
        tablesJob = scope.launch {
            try {
                val (channel, flow) = repo.tableChanges(restaurantId)
                tablesChannel = channel
                flow.collect { refreshTables() }
            } catch (_: Exception) { }
        }
    }

    private fun stopLive() {
        tablesJob?.cancel()
        tablesJob = null
        val tch = tablesChannel
        tablesChannel = null
        if (tch != null) scope.launch { repo.closeChannel(tch) }
        liveJob?.cancel()
        liveJob = null
        val ch = liveChannel
        liveChannel = null
        if (ch != null) scope.launch { repo.closeChannel(ch) }
    }

    private fun beep() = alertPlayer.playOnce(_state.value.alertSound)

    // ---- Ajustes del aviso ----
    fun setAlertRepeat(value: Boolean) {
        settings.repeat = value
        _state.update { it.copy(alertRepeat = value) }
    }

    fun setAlertSound(sound: String) {
        settings.sound = sound
        _state.update { it.copy(alertSound = sound) }
        alertPlayer.playOnce(sound)
    }

    fun setAlertInterval(seconds: Int) {
        settings.intervalSec = seconds
        _state.update { it.copy(alertInterval = seconds) }
    }

    fun testSound() = alertPlayer.playOnce(_state.value.alertSound)

    fun silence() = _state.update { it.copy(silenced = true) }

    // ---- Acciones sobre pedidos (primero se ve el cambio, después se guarda) ----
    fun advance(order: OrderDto, newStatus: String) {
        val restaurantId = _state.value.restaurant?.id ?: return
        _state.update { s -> s.copy(orders = s.orders.map { if (it.id == order.id) it.copy(status = newStatus) else it }) }
        scope.launch {
            runCatching {
                if (order.status == OrderStatus.PENDIENTE && newStatus == OrderStatus.RECIBIDO) repo.takeOrder(order, restaurantId)
                else repo.setOrderStatus(order.id, newStatus)
            }.onFailure {
                _state.update { s -> s.copy(message = "No se pudo guardar el cambio.") }
                refreshOrders()
            }
        }
    }

    // Mesa: confirmar el cobro y liberar la mesa.
    fun closeTableOrder(order: OrderDto) {
        _state.update { s -> s.copy(orders = s.orders.map { if (it.id == order.id) it.copy(status = OrderStatus.COMPLETADO, paymentStatus = "pagado") else it }) }
        scope.launch {
            runCatching { repo.closeTableOrder(order.id) }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo cerrar la mesa.") }; refreshOrders() }
        }
    }

    fun cancel(order: OrderDto) = advance(order, OrderStatus.CANCELADO)

    fun confirmTransfer(order: OrderDto) {
        _state.update { s -> s.copy(orders = s.orders.map { if (it.id == order.id) it.copy(pagoConfirmado = true) else it }) }
        scope.launch {
            runCatching { repo.confirmTransferPayment(order.id) }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo confirmar el pago."); }; refreshOrders() }
        }
    }

    fun focusOrderType(type: String) = _state.update { it.copy(focusKind = when (type) { "retiro" -> "retiro"; "mesa" -> "mesa"; else -> "delivery" }, ordersKind = when (type) { "retiro" -> "retiro"; "mesa" -> "mesa"; else -> "delivery" }) }
    fun rememberOrdersKind(kind: String) = _state.update { it.copy(ordersKind = kind) }
    fun rememberMainTab(tab: Int) = _state.update { it.copy(mainTab = tab) }
    fun focusConsumed() = _state.update { it.copy(focusKind = null) }
    // Abre una pantalla de Más (por ejemplo impresion) desde cualquier otra pestaña.
    fun openMore(page: String) = _state.update { it.copy(moreRequest = page) }
    fun moreConsumed() = _state.update { it.copy(moreRequest = null) }

    fun chooseTemplate(id: String) {
        val r = _state.value.restaurant ?: return
        _state.update { it.copy(restaurant = r.copy(templateId = id)) }
        scope.launch {
            runCatching { repo.applyTemplate(r.id, id) }
                .onSuccess { showMessage("Plantilla activada con sus colores originales.") }
                .onFailure { _state.update { s -> s.copy(restaurant = r, message = "No se pudo cambiar la plantilla.") } }
        }
    }

    fun setBestSellers(on: Boolean) {
        val r = _state.value.restaurant ?: return
        _state.update { it.copy(restaurant = r.copy(showBestSellers = on)) }
        scope.launch {
            runCatching { repo.setBestSellers(r.id, on) }
                .onSuccess { if (on) showMessage("Activado. La sección aparece en tu menú a los 30 días, calculada con tus ventas reales.") }
                .onFailure { _state.update { s -> s.copy(restaurant = r, message = "No se pudo cambiar la opción.") } }
        }
    }

    fun setOpen(open: Boolean) {
        val r = _state.value.restaurant ?: return
        _state.update { it.copy(restaurant = r.copy(isOpen = open)) }
        scope.launch {
            runCatching { repo.setOpen(r.id, open) }
                .onFailure { _state.update { s -> s.copy(restaurant = r, message = "No se pudo cambiar el estado del local.") } }
        }
    }

    // ---- Catálogo ----
    fun setAvailable(product: ProductDto, available: Boolean) {
        _state.update { s -> s.copy(products = s.products.map { if (it.id == product.id) it.copy(isAvailable = available) else it }) }
        scope.launch {
            runCatching { repo.setProductAvailable(product.id, available) }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo guardar.") }; refreshCatalog() }
        }
    }

    fun setPrice(product: ProductDto, price: Double) {
        _state.update { s -> s.copy(products = s.products.map { if (it.id == product.id) it.copy(price = price) else it }) }
        scope.launch {
            runCatching { repo.setProductPrice(product.id, price) }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo guardar el precio.") }; refreshCatalog() }
        }
    }

    // Tope de productos por plan (el mismo que la web: Light 20, GO 60, Plus sin tope). La base no lo fuerza, lo controla el cliente.
    fun productLimit(): Int = when (_state.value.restaurant?.subscriptionPlan) {
        "light" -> 20
        "go" -> 60
        else -> Int.MAX_VALUE
    }

    // Crea (id == null) o edita un producto. Si hay foto nueva, la achica y la sube antes de guardar.
    fun loadProductExtras(productId: String, onResult: (List<String>) -> Unit) {
        scope.launch { runCatching { repo.productExtraIds(productId) }.onSuccess(onResult) }
    }

    fun saveProduct(id: String?, name: String, description: String, price: Double?, categoryId: String?, imageUri: android.net.Uri?,
                    extraIds: List<String>, destacado: Boolean, onDone: () -> Unit) {
        val s = _state.value
        android.util.Log.d("Snappy", "saveProduct: tocó guardar (id=$id, foto=${imageUri != null}, productos=${s.products.size}, plan=${s.restaurant?.subscriptionPlan})")
        val restaurantId = s.restaurant?.id
        if (restaurantId == null) {
            _state.update { it.copy(formError = "No se encontró tu local. Cerrá sesión y volvé a entrar.") }
            return
        }
        if (s.savingProduct) return
        if (id == null && s.products.size >= productLimit()) {
            _state.update { it.copy(formError = "Llegaste al límite de ${productLimit()} productos de tu plan. Para cargar más, cambiá de plan desde la web.") }
            return
        }
        _state.update { it.copy(savingProduct = true, formError = null) }
        scope.launch {
            runCatching {
                val url = imageUri?.let { uri ->
                    val bytes = kotlinx.coroutines.withContext(Dispatchers.IO) { ImageUtil.compress(app, uri) }
                        ?: error("No se pudo leer la foto.")
                    repo.uploadProductImage(bytes)
                }
                repo.saveProduct(restaurantId, id, name.trim(), description.trim(), price, categoryId, url, extraIds, destacado)
            }.onSuccess {
                refreshCatalog()
                _state.update { it.copy(savingProduct = false) }
                onDone()
            }.onFailure { e ->
                _state.update { it.copy(savingProduct = false, formError = "No se pudo guardar: ${e::class.simpleName}: ${e.message?.take(180)}") }
                android.util.Log.e("Snappy", "saveProduct", e)
            }
        }
    }

    fun clearFormError() = _state.update { it.copy(formError = null) }

    fun deleteProduct(product: ProductDto, onDone: () -> Unit) {
        scope.launch {
            runCatching { repo.deleteProduct(product.id) }
                .onSuccess { refreshCatalog(); onDone() }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo borrar el producto.") } }
        }
    }

    // ---- Adicionales y categorías ----
    // Historial de cobros para la pantalla Plan (solo lectura).
    fun loadBilling() {
        val id = _state.value.restaurant?.id ?: return
        scope.launch {
            runCatching { repo.billingPayments(id) }
                .onSuccess { p -> _state.update { it.copy(payments = p, paymentsLoaded = true) } }
                .onFailure { _state.update { it.copy(paymentsLoaded = true) } }
        }
    }

    fun refreshExtras() {
        val id = _state.value.restaurant?.id ?: return
        scope.launch { runCatching { repo.extras(id) }.onSuccess { e -> _state.update { it.copy(extras = e) } } }
    }

    fun saveExtra(id: String?, name: String, price: Double, onDone: () -> Unit) {
        val rid = _state.value.restaurant?.id ?: return
        scope.launch {
            runCatching { repo.saveExtra(rid, id, name.trim(), price) }
                .onSuccess { refreshExtras(); onDone() }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo guardar el adicional.") } }
        }
    }

    fun deleteExtra(extra: ExtraDto) {
        scope.launch {
            runCatching { repo.deleteExtra(extra.id) }
                .onSuccess { refreshExtras() }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo borrar el adicional.") } }
        }
    }

    fun saveCategory(id: String?, name: String, onDone: () -> Unit) {
        val rid = _state.value.restaurant?.id ?: return
        val order = _state.value.categories.size + 1
        scope.launch {
            runCatching { repo.saveCategory(rid, id, name.trim(), order) }
                .onSuccess { refreshCatalog(); onDone() }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo guardar la categoría.") } }
        }
    }

    fun deleteCategory(category: CategoryDto) {
        scope.launch {
            runCatching { repo.deleteCategory(category.id) }
                .onSuccess { refreshCatalog() }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo borrar la categoría.") } }
        }
    }

    // ---- Caja ----
    fun refreshCash() { scope.launch { loadCash() } }

    private val cashPrefs by lazy { app.getSharedPreferences("snappy_cash", android.content.Context.MODE_PRIVATE) }
    private val betaEmails = setOf("luchiimee2@gmail.com")

    // Caja es del Plan Plus (o acceso anticipado), igual que la web
    private fun cashLockedFor(r: RestaurantDto): Boolean =
        r.subscriptionPlan != "plus" && (repo.currentEmail() ?: "").lowercase().trim() !in betaEmails

    // Lee la Caja del día elegido: sus turnos y los pedidos/gastos del turno que se está mirando.
    // `shift` es el turno abierto de verdad (el que recibe los pedidos), aunque sea de otro día.
    private suspend fun loadCash(pickShiftId: String? = null) {
        val st = _state.value
        val r = st.restaurant ?: return
        if (cashLockedFor(r)) { _state.update { it.copy(cashLocked = true, cashLoaded = true) }; return }
        val active = runCatching { repo.currentShift(r.id) }.getOrElse { return }
        val date = st.cashDate ?: todayAR()
        val (start, end) = cashShiftRange(date, normalizeCloseHour(r.cashCloseHour))
        val list = runCatching { repo.shiftsInRange(r.id, start, end) }.getOrElse { return }
        val keep = pickShiftId ?: st.viewShift?.id
        val idx = list.indexOfFirst { it.id == keep }.let { if (it >= 0) it else list.lastIndex }
        val view = list.getOrNull(idx)
        var orders = emptyList<OrderDto>()
        var exps = emptyList<ExpenseDto>()
        if (view != null) {
            orders = runCatching { repo.shiftOrders(view.id) }.getOrNull() ?: st.shiftOrders
            exps = runCatching { repo.shiftExpenses(view.id) }.getOrNull() ?: st.expenses
        }
        _state.update { it.copy(cashLocked = false, shift = active, dayShifts = list, viewShift = view, shiftOrders = orders, expenses = exps, cashLoaded = true) }
    }

    fun setCashDate(date: String) {
        _state.update { it.copy(cashDate = date, viewShift = null) }
        refreshCash()
    }

    fun pickShift(id: String) { scope.launch { loadCash(id) } }

    fun openShift(opening: Double) {
        val rid = _state.value.restaurant?.id ?: return
        scope.launch {
            runCatching { repo.openShift(rid, opening) }
                .onSuccess { _state.update { it.copy(cashDate = null, viewShift = null, staleDismissed = false) }; loadCash() }
                .onFailure { e -> _state.update { s -> s.copy(message = e.message?.takeIf { m -> m.startsWith("Ya hay") } ?: "No se pudo iniciar el turno.") } }
        }
    }

    fun closeShift() {
        val s = _state.value
        val shift = s.viewShift ?: return
        val summary = buildCashSummary(s.shiftOrders, s.expenses, shift.openingBalance ?: 0.0).toJson()
        scope.launch {
            runCatching { repo.closeShift(shift.id, summary) }
                .onSuccess { loadCash(); _state.update { it.copy(message = "Turno cerrado.") } }
                .onFailure { _state.update { st -> st.copy(message = "No se pudo cerrar el turno.") } }
        }
    }

    fun addExpense(description: String, amount: Double, category: String?) {
        val s = _state.value
        val rid = s.restaurant?.id ?: return
        val shift = s.viewShift ?: return
        scope.launch {
            runCatching { repo.addExpense(rid, shift.id, description.trim(), amount, category) }
                .onSuccess { loadCash() }
                .onFailure { _state.update { st -> st.copy(message = "No se pudo guardar el gasto.") } }
        }
    }

    fun deleteExpense(expense: ExpenseDto) {
        scope.launch {
            runCatching { repo.deleteExpense(expense.id) }
                .onSuccess { loadCash() }
                .onFailure { _state.update { st -> st.copy(message = "No se pudo borrar el gasto.") } }
        }
    }

    fun addManualSale(concept: String, total: Double, method: String) {
        val s = _state.value
        val rid = s.restaurant?.id ?: return
        scope.launch {
            runCatching { repo.addManualSale(rid, s.viewShift?.id, concept, total, method) }
                .onSuccess { loadCash() }
                .onFailure { _state.update { st -> st.copy(message = "No se pudo registrar la venta.") } }
        }
    }

    fun updateOpeningBalance(value: Double) {
        val shift = _state.value.viewShift ?: return
        scope.launch {
            runCatching { repo.updateOpeningBalance(shift.id, value) }
                .onSuccess { loadCash() }
                .onFailure { _state.update { st -> st.copy(message = "No se pudo cambiar el monto inicial.") } }
        }
    }

    fun setCashCloseHour(hhmm: String) {
        val r = _state.value.restaurant ?: return
        _state.update { it.copy(restaurant = r.copy(cashCloseHour = hhmm)) }
        scope.launch {
            runCatching { repo.setCashCloseHour(r.id, hhmm) }
                .onSuccess { _state.update { it.copy(message = "Hora de cierre guardada. Aplica desde el próximo turno.") } }
                .onFailure { _state.update { st -> st.copy(restaurant = r, message = "No se pudo guardar la hora de cierre.") } }
        }
    }

    fun setCashAutoClose(on: Boolean) {
        val r = _state.value.restaurant ?: return
        _state.update { it.copy(restaurant = r.copy(cashAutoCloseEnabled = on)) }
        scope.launch {
            runCatching { repo.setCashAutoClose(r.id, on) }
                .onFailure { _state.update { st -> st.copy(restaurant = r, message = "No se pudo cambiar el cierre automático.") } }
        }
    }

    // Aviso de turno viejo abierto (igual que StaleShiftPrompt de la web)
    private fun snoozeKey(id: String) = "stale_snooze_$id"
    fun isStaleSnoozed(id: String): Boolean = System.currentTimeMillis() < cashPrefs.getLong(snoozeKey(id), 0L)
    fun snoozeStale(id: String) {
        cashPrefs.edit().putLong(snoozeKey(id), System.currentTimeMillis() + 12L * 60 * 60 * 1000).apply()
        _state.update { it.copy(staleDismissed = true) }
    }
    fun dismissStale() = _state.update { it.copy(staleDismissed = true) }

    fun messageShown() = _state.update { it.copy(message = null) }

    fun showMessage(text: String) = _state.update { it.copy(message = text) }
}
