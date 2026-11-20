package uno.snappy.app.data

import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.filter.FilterOperator
import io.github.jan.supabase.realtime.PostgresAction
import io.github.jan.supabase.realtime.RealtimeChannel
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.decodeRecord
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.storage.storage
import java.util.UUID
import kotlinx.serialization.json.JsonNull
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.time.Instant
import java.time.temporal.ChronoUnit

@Serializable
private data class FcmTokenRow(val token: String, @SerialName("user_id") val userId: String)

// Todas las lecturas y escrituras de la app. Mismas tablas y mismas reglas que el panel web.
class Repository {
    private val supabase get() = SupabaseProvider.client

    // ---- Sesión ----
    suspend fun awaitSession() = supabase.auth.awaitInitialization()
    fun hasSession(): Boolean = supabase.auth.currentSessionOrNull() != null

    suspend fun signIn(email: String, password: String) {
        supabase.auth.signInWith(Email) {
            this.email = email.trim()
            this.password = password
        }
    }

    suspend fun signOut() = supabase.auth.signOut()

    // ---- Avisos push (FCM): el celu guarda su token para que el servidor le mande los pedidos nuevos ----
    suspend fun saveFcmToken(token: String) {
        val userId = supabase.auth.currentUserOrNull()?.id ?: return
        supabase.from("fcm_tokens").upsert(FcmTokenRow(token, userId)) { onConflict = "token" }
    }

    suspend fun deleteFcmToken(token: String) {
        supabase.from("fcm_tokens").delete { filter { eq("token", token) } }
    }

    // ---- Local del dueño ----
    suspend fun myRestaurant(): RestaurantDto? {
        val userId = supabase.auth.currentUserOrNull()?.id ?: return null
        return supabase.from("restaurants")
            .select { filter { eq("user_id", userId) }; limit(1) }
            .decodeList<RestaurantDto>()
            .firstOrNull()
    }

    suspend fun setOpen(restaurantId: String, open: Boolean) {
        supabase.from("restaurants").update({ set("is_open", open) }) { filter { eq("id", restaurantId) } }
    }

    // ---- Pedidos ----
    // Últimos 7 días, sin los de apertura de caja (igual que el panel web).
    suspend fun recentOrders(restaurantId: String): List<OrderDto> {
        val since = Instant.now().minus(7, ChronoUnit.DAYS).toString()
        return supabase.from("orders")
            .select {
                filter {
                    eq("restaurant_id", restaurantId)
                    neq("order_type", "apertura")
                    gte("created_at", since)
                }
                order("created_at", Order.DESCENDING)
            }
            .decodeList<OrderDto>()
    }

    suspend fun setOrderStatus(orderId: String, status: String) {
        supabase.from("orders").update({ set("status", status) }) { filter { eq("id", orderId) } }
    }

    // "Tomar pedido": igual que el panel web. Si el turno de caja del pedido ya se cerró, pasa al turno vigente
    // en el mismo update (los cierres excluyen los pendientes y si no, no contaría en ninguna caja).
    suspend fun takeOrder(order: OrderDto, restaurantId: String) {
        var newShiftId: String? = null
        if (order.status == OrderStatus.PENDIENTE && order.shiftId != null) {
            val shift = supabase.from("cash_shifts")
                .select { filter { eq("id", order.shiftId!!) }; limit(1) }
                .decodeList<CashShiftDto>()
                .firstOrNull()
            if (shift?.closedAt != null) {
                newShiftId = runCatching {
                    supabase.postgrest.rpc("get_or_create_shift", buildJsonObject { put("p_restaurant_id", restaurantId) })
                        .decodeAs<String>()
                }.getOrNull()
            }
        }
        val shiftToSet: String? = newShiftId
        supabase.from("orders").update({
            set("status", OrderStatus.RECIBIDO)
            if (shiftToSet != null) set("shift_id", shiftToSet)
        }) { filter { eq("id", order.id) } }
    }

    // "Confirmar pago y cerrar" de una mesa: igual que el panel web (la mesa queda libre al completarse).
    suspend fun closeTableOrder(orderId: String) {
        supabase.from("orders").update({
            set("status", OrderStatus.COMPLETADO)
            set("payment_status", "pagado")
        }) { filter { eq("id", orderId) } }
    }

    suspend fun confirmTransferPayment(orderId: String) {
        supabase.from("orders").update({ set("pago_confirmado", true) }) { filter { eq("id", orderId) } }
    }

    // Cambios en vivo de los pedidos del local. El canal se devuelve para poder cerrarlo.
    sealed interface OrderEvent {
        data class Inserted(val order: OrderDto) : OrderEvent
        data class Updated(val order: OrderDto) : OrderEvent
        data class Deleted(val id: String) : OrderEvent
    }

    suspend fun orderEvents(restaurantId: String): Pair<RealtimeChannel, Flow<OrderEvent>> {
        val channel = supabase.channel("orders-$restaurantId")
        val flow = channel.postgresChangeFlow<PostgresAction>(schema = "public") {
            table = "orders"
            filter("restaurant_id", FilterOperator.EQ, restaurantId)
        }.map { action ->
            when (action) {
                is PostgresAction.Insert -> OrderEvent.Inserted(action.decodeRecord<OrderDto>())
                is PostgresAction.Update -> OrderEvent.Updated(action.decodeRecord<OrderDto>())
                is PostgresAction.Delete -> OrderEvent.Deleted(action.oldRecord["id"].toString().trim('"'))
                else -> OrderEvent.Deleted("")
            }
        }
        channel.subscribe()
        return channel to flow
    }

    // ---- Mesas ----
    suspend fun tables(restaurantId: String): List<TableDto> =
        supabase.from("tables")
            .select { filter { eq("restaurant_id", restaurantId) }; order("name", Order.ASCENDING) }
            .decodeList<TableDto>()

    suspend fun resetAttention(tableId: String) {
        supabase.from("tables").update({ set("needs_attention", false) }) { filter { eq("id", tableId) } }
    }

    // Cambios en vivo de las mesas (llamados al mozo, etc.): solo avisa que hay que releer la lista.
    suspend fun tableChanges(restaurantId: String): Pair<RealtimeChannel, Flow<Unit>> {
        val channel = supabase.channel("tables-$restaurantId")
        val flow = channel.postgresChangeFlow<PostgresAction>(schema = "public") {
            table = "tables"
            filter("restaurant_id", FilterOperator.EQ, restaurantId)
        }.map { }
        channel.subscribe()
        return channel to flow
    }

    // "Ocupar mesa" del panel web: pedido de mesa en cocina, a nombre de "Cliente Local", en el turno vigente.
    suspend fun openTable(restaurantId: String, tableName: String) {
        val shiftId = runCatching {
            supabase.postgrest.rpc("get_or_create_shift", buildJsonObject { put("p_restaurant_id", restaurantId) }).decodeAs<String>()
        }.getOrNull()
        supabase.from("orders").insert(buildJsonObject {
            put("restaurant_id", restaurantId)
            put("table_number", tableName)
            put("customer_name", "Cliente Local")
            put("order_type", "mesa")
            put("status", OrderStatus.EN_PROCESO)
            put("total", 0)
            put("items", kotlinx.serialization.json.JsonArray(emptyList()))
            put("payment_method", "efectivo")
            if (shiftId != null) put("shift_id", shiftId)
        })
    }

    // Suma un producto (cantidad 1) al consumo de la mesa y al total, con la misma forma de ítem que el panel web.
    suspend fun addItemToOrder(order: OrderDto, name: String, price: Double) {
        val old = (order.items as? kotlinx.serialization.json.JsonArray)?.toList() ?: emptyList()
        val item = buildJsonObject {
            put("id", "app-${UUID.randomUUID()}")
            put("name", name)
            put("price", price)
            put("quantity", 1)
            put("uniqueId", UUID.randomUUID().toString())
            put("extrasList", kotlinx.serialization.json.JsonArray(emptyList()))
        }
        val items = kotlinx.serialization.json.JsonArray(old + item)
        val total = (order.total ?: 0.0) + price
        supabase.from("orders").update({
            set("items", items)
            set("total", total)
        }) { filter { eq("id", order.id) } }
    }

    // ---- Catálogo ----
    suspend fun categories(restaurantId: String): List<CategoryDto> =
        supabase.from("categories")
            .select { filter { eq("restaurant_id", restaurantId) }; order("sort_order", Order.ASCENDING) }
            .decodeList<CategoryDto>()

    suspend fun products(restaurantId: String): List<ProductDto> =
        supabase.from("products")
            .select { filter { eq("restaurant_id", restaurantId) }; order("name", Order.ASCENDING) }
            .decodeList<ProductDto>()

    suspend fun setProductAvailable(productId: String, available: Boolean) {
        supabase.from("products").update({ set("is_available", available) }) { filter { eq("id", productId) } }
    }

    suspend fun setProductPrice(productId: String, price: Double) {
        supabase.from("products").update({ set("price", price) }) { filter { eq("id", productId) } }
    }

    // ---- Alta, edición y baja de productos ----
    // Sube la foto al mismo bucket público "images" que usa la web (prod_<id>.jpg) y devuelve la URL pública.
    suspend fun uploadProductImage(bytes: ByteArray): String {
        val path = "prod_${UUID.randomUUID()}.jpg"
        val bucket = supabase.storage.from("images")
        bucket.upload(path, bytes)
        return bucket.publicUrl(path)
    }

    // Igual que la web: si no hay categoría elegida usa la primera, y si no existe ninguna crea "General".
    private suspend fun defaultCategoryId(restaurantId: String): String? {
        categories(restaurantId).firstOrNull()?.let { return it.id }
        return supabase.from("categories")
            .insert(buildJsonObject { put("restaurant_id", restaurantId); put("name", "General"); put("sort_order", 1) }) { select() }
            .decodeSingle<CategoryDto>().id
    }

    // imageUrl == null: no se toca la foto actual. price == null: no se toca el precio (productos por peso).
    suspend fun saveProduct(
        restaurantId: String, id: String?, name: String, description: String,
        price: Double?, categoryId: String?, imageUrl: String?,
        extraIds: List<String>, destacado: Boolean,
    ) {
        var productId = id
        if (id == null) {
            val cat = categoryId ?: defaultCategoryId(restaurantId)
            productId = supabase.from("products").insert(buildJsonObject {
                put("restaurant_id", restaurantId)
                put("name", name)
                put("description", description)
                put("price", price ?: 0.0)
                if (imageUrl != null) put("image_url", imageUrl)
                if (cat != null) put("category_id", cat) else put("category_id", JsonNull)
                put("sale_type", "unidad")
                put("es_destacado", destacado)
            }) { select() }.decodeSingle<ProductDto>().id
        } else {
            supabase.from("products").update({
                set("name", name)
                set("description", description)
                if (price != null) set("price", price)
                if (imageUrl != null) set("image_url", imageUrl)
                if (categoryId != null) set("category_id", categoryId)
                set("es_destacado", destacado)
            }) { filter { eq("id", id) } }
        }
        val pid = productId ?: return
        // Solo un destacado a la vez (igual que la web)
        if (destacado) supabase.from("products").update({ set("es_destacado", false) }) {
            filter { eq("restaurant_id", restaurantId); neq("id", pid); eq("es_destacado", true) }
        }
        supabase.from("product_extras").delete { filter { eq("product_id", pid) } }
        if (extraIds.isNotEmpty()) supabase.from("product_extras").insert(extraIds.map { eid ->
            buildJsonObject { put("product_id", pid); put("extra_id", eid) }
        })
    }

    suspend fun productExtraIds(productId: String): List<String> =
        supabase.from("product_extras").select { filter { eq("product_id", productId) } }
            .decodeList<kotlinx.serialization.json.JsonObject>()
            .mapNotNull { it["extra_id"]?.let { v -> (v as? kotlinx.serialization.json.JsonPrimitive)?.content } }

    suspend fun deleteProduct(productId: String) {
        supabase.from("products").delete { filter { eq("id", productId) } }
    }

    // ---- Adicionales (tabla extras, igual que la web) ----
    suspend fun extras(restaurantId: String): List<ExtraDto> =
        supabase.from("extras")
            .select { filter { eq("restaurant_id", restaurantId) }; order("name", Order.ASCENDING) }
            .decodeList<ExtraDto>()

    suspend fun saveExtra(restaurantId: String, id: String?, name: String, price: Double) {
        if (id == null) {
            supabase.from("extras").insert(buildJsonObject {
                put("restaurant_id", restaurantId); put("name", name); put("price", price); put("is_available", true)
            })
        } else {
            supabase.from("extras").update({ set("name", name); set("price", price) }) { filter { eq("id", id) } }
        }
    }

    suspend fun deleteExtra(id: String) {
        supabase.from("extras").delete { filter { eq("id", id) } }
    }

    // ---- Categorías (sin imagen en la app) ----
    suspend fun saveCategory(restaurantId: String, id: String?, name: String, sortOrder: Int) {
        if (id == null) {
            supabase.from("categories").insert(buildJsonObject {
                put("restaurant_id", restaurantId); put("name", name); put("sort_order", sortOrder)
            })
        } else {
            supabase.from("categories").update({ set("name", name) }) { filter { eq("id", id) } }
        }
    }

    suspend fun deleteCategory(id: String) {
        supabase.from("categories").delete { filter { eq("id", id) } }
    }

    // ---- Caja: turnos, gastos y cierre (mismas tablas y mismo resumen que el panel web) ----
    suspend fun currentShift(restaurantId: String): CashShiftDto? =
        supabase.from("cash_shifts")
            .select { filter { eq("restaurant_id", restaurantId); exact("closed_at", null) }; order("opened_at", Order.DESCENDING); limit(1) }
            .decodeList<CashShiftDto>().firstOrNull()

    suspend fun shiftOrders(shiftId: String): List<OrderDto> =
        supabase.from("orders").select { filter { eq("shift_id", shiftId) } }.decodeList<OrderDto>()

    suspend fun shiftExpenses(shiftId: String): List<ExpenseDto> =
        supabase.from("cash_expenses")
            .select { filter { eq("shift_id", shiftId) }; order("created_at", Order.ASCENDING) }
            .decodeList<ExpenseDto>()

    suspend fun addExpense(restaurantId: String, shiftId: String, description: String, amount: Double) {
        supabase.from("cash_expenses").insert(buildJsonObject {
            put("restaurant_id", restaurantId); put("shift_id", shiftId); put("description", description); put("amount", amount)
        })
    }

    suspend fun deleteExpense(id: String) {
        supabase.from("cash_expenses").delete { filter { eq("id", id) } }
    }

    // Como /api/cash/open de la web: crea el turno y la orden "apertura" con el monto de cambio.
    suspend fun openShift(restaurantId: String, opening: Double) {
        val shift = supabase.from("cash_shifts")
            .insert(buildJsonObject { put("restaurant_id", restaurantId); put("opening_balance", opening) }) { select() }
            .decodeSingle<CashShiftDto>()
        try {
            supabase.from("orders").insert(buildJsonObject {
                put("restaurant_id", restaurantId)
                put("total", opening)
                put("order_type", "apertura")
                put("customer_name", "MONTO INICIAL (CAMBIO)")
                put("payment_method", "efectivo")
                put("status", OrderStatus.COMPLETADO)
                put("shift_id", shift.id)
                put("items", kotlinx.serialization.json.JsonArray(emptyList()))
            })
        } catch (e: Exception) {
            // No dejar un turno abierto sin su apertura
            runCatching { supabase.from("cash_shifts").update({ set("closed_at", Instant.now().toString()) }) { filter { eq("id", shift.id) } } }
            throw e
        }
    }

    suspend fun closeShift(shiftId: String, summary: kotlinx.serialization.json.JsonObject) {
        supabase.from("cash_shifts").update({
            set("closed_at", Instant.now().toString())
            set("close_type", "manual")
            set("summary", summary)
        }) { filter { eq("id", shiftId) } }
    }
}
