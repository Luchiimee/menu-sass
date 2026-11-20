package uno.snappy.app.ui

import android.app.Application
import android.media.RingtoneManager
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.messaging.FirebaseMessaging
import io.github.jan.supabase.realtime.RealtimeChannel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uno.snappy.app.data.CategoryDto
import uno.snappy.app.data.OrderDto
import uno.snappy.app.data.OrderStatus
import uno.snappy.app.data.ProductDto
import uno.snappy.app.data.RestaurantDto
import uno.snappy.app.data.Repository

enum class Stage { LOADING, LOGIN, READY }

data class UiState(
    val stage: Stage = Stage.LOADING,
    val loginError: String? = null,
    val loggingIn: Boolean = false,
    val restaurant: RestaurantDto? = null,
    val orders: List<OrderDto> = emptyList(),
    val categories: List<CategoryDto> = emptyList(),
    val products: List<ProductDto> = emptyList(),
    val message: String? = null,
)

class AppViewModel(app: Application) : AndroidViewModel(app) {
    private val repo = Repository()
    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    private var liveJob: Job? = null
    private var liveChannel: RealtimeChannel? = null

    init {
        viewModelScope.launch {
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
        viewModelScope.launch {
            try {
                repo.signIn(email, password)
                enter()
            } catch (e: Exception) {
                _state.update { it.copy(loggingIn = false, loginError = "Email o contraseña incorrectos.") }
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
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
            _state.value = UiState(stage = Stage.LOGIN)
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
        startLive(restaurant.id)
        registerPush()
    }

    // Guarda el token de Firebase de este celu para recibir los pedidos con la app cerrada.
    private fun registerPush() {
        runCatching {
            FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
                viewModelScope.launch { runCatching { repo.saveFcmToken(token) } }
            }
        }
    }

    fun refreshOrders() {
        val id = _state.value.restaurant?.id ?: return
        viewModelScope.launch {
            runCatching { repo.recentOrders(id) }
                .onSuccess { list -> _state.update { it.copy(orders = list) } }
                .onFailure { _state.update { s -> s.copy(message = "No se pudieron cargar los pedidos.") } }
        }
    }

    fun refreshCatalog() {
        val id = _state.value.restaurant?.id ?: return
        viewModelScope.launch {
            runCatching { repo.categories(id) to repo.products(id) }
                .onSuccess { (c, p) -> _state.update { it.copy(categories = c, products = p) } }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo cargar el catálogo.") } }
        }
    }

    // Pedidos en vivo: un pedido nuevo suena y aparece solo.
    private fun startLive(restaurantId: String) {
        stopLive()
        liveJob = viewModelScope.launch {
            try {
                val (channel, flow) = repo.orderEvents(restaurantId)
                liveChannel = channel
                flow.collect { event ->
                    when (event) {
                        is Repository.OrderEvent.Inserted -> {
                            _state.update { s ->
                                if (s.orders.any { it.id == event.order.id }) s else s.copy(orders = listOf(event.order) + s.orders)
                            }
                            if (event.order.status == OrderStatus.PENDIENTE) beep()
                        }
                        is Repository.OrderEvent.Updated ->
                            _state.update { s -> s.copy(orders = s.orders.map { if (it.id == event.order.id) event.order else it }) }
                        is Repository.OrderEvent.Deleted ->
                            _state.update { s -> s.copy(orders = s.orders.filter { it.id != event.id }) }
                    }
                }
            } catch (_: Exception) {
                _state.update { it.copy(message = "Se perdió la conexión en vivo. Tirá hacia abajo para actualizar.") }
            }
        }
    }

    private fun stopLive() {
        liveJob?.cancel()
        liveJob = null
        val ch = liveChannel
        liveChannel = null
        if (ch != null) viewModelScope.launch { runCatching { ch.unsubscribe() } }
    }

    private fun beep() {
        runCatching {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            RingtoneManager.getRingtone(getApplication(), uri)?.play()
        }
    }

    // ---- Acciones sobre pedidos (primero se ve el cambio, después se guarda) ----
    fun advance(order: OrderDto, newStatus: String) {
        val restaurantId = _state.value.restaurant?.id ?: return
        _state.update { s -> s.copy(orders = s.orders.map { if (it.id == order.id) it.copy(status = newStatus) else it }) }
        viewModelScope.launch {
            runCatching {
                if (order.status == OrderStatus.PENDIENTE && newStatus == OrderStatus.RECIBIDO) repo.takeOrder(order, restaurantId)
                else repo.setOrderStatus(order.id, newStatus)
            }.onFailure {
                _state.update { s -> s.copy(message = "No se pudo guardar el cambio.") }
                refreshOrders()
            }
        }
    }

    fun cancel(order: OrderDto) = advance(order, OrderStatus.CANCELADO)

    fun confirmTransfer(order: OrderDto) {
        _state.update { s -> s.copy(orders = s.orders.map { if (it.id == order.id) it.copy(pagoConfirmado = true) else it }) }
        viewModelScope.launch {
            runCatching { repo.confirmTransferPayment(order.id) }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo confirmar el pago."); }; refreshOrders() }
        }
    }

    fun setOpen(open: Boolean) {
        val r = _state.value.restaurant ?: return
        _state.update { it.copy(restaurant = r.copy(isOpen = open)) }
        viewModelScope.launch {
            runCatching { repo.setOpen(r.id, open) }
                .onFailure { _state.update { s -> s.copy(restaurant = r, message = "No se pudo cambiar el estado del local.") } }
        }
    }

    // ---- Catálogo ----
    fun setAvailable(product: ProductDto, available: Boolean) {
        _state.update { s -> s.copy(products = s.products.map { if (it.id == product.id) it.copy(isAvailable = available) else it }) }
        viewModelScope.launch {
            runCatching { repo.setProductAvailable(product.id, available) }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo guardar.") }; refreshCatalog() }
        }
    }

    fun setPrice(product: ProductDto, price: Double) {
        _state.update { s -> s.copy(products = s.products.map { if (it.id == product.id) it.copy(price = price) else it }) }
        viewModelScope.launch {
            runCatching { repo.setProductPrice(product.id, price) }
                .onFailure { _state.update { s -> s.copy(message = "No se pudo guardar el precio.") }; refreshCatalog() }
        }
    }

    fun messageShown() = _state.update { it.copy(message = null) }

    override fun onCleared() {
        stopLive()
        super.onCleared()
    }
}
