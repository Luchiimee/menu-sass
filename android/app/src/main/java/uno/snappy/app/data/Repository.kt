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
    ) {
        if (id == null) {
            val cat = categoryId ?: defaultCategoryId(restaurantId)
            supabase.from("products").insert(buildJsonObject {
                put("restaurant_id", restaurantId)
                put("name", name)
                put("description", description)
                put("price", price ?: 0.0)
                if (imageUrl != null) put("image_url", imageUrl)
                if (cat != null) put("category_id", cat) else put("category_id", JsonNull)
                put("sale_type", "unidad")
            })
        } else {
            supabase.from("products").update({
                set("name", name)
                set("description", description)
                if (price != null) set("price", price)
                if (imageUrl != null) set("image_url", imageUrl)
                if (categoryId != null) set("category_id", categoryId)
            }) { filter { eq("id", id) } }
        }
    }

    suspend fun deleteProduct(productId: String) {
        supabase.from("products").delete { filter { eq("id", productId) } }
    }
}
