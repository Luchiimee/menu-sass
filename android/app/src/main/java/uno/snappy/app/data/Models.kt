package uno.snappy.app.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

// Las columnas son las de public.restaurants / orders / products / categories (las mismas que usa el panel web).
// Solo se declaran las que la app usa: el resto se ignora al leer.

@Serializable
data class RestaurantDto(
    val id: String,
    val name: String? = null,
    @SerialName("is_open") val isOpen: Boolean? = null,
    @SerialName("subscription_plan") val subscriptionPlan: String? = null,
)

@Serializable
data class OrderDto(
    val id: String,
    @SerialName("restaurant_id") val restaurantId: String,
    val items: JsonElement? = null,
    val total: Double? = null,
    @SerialName("delivery_cost") val deliveryCost: Double? = null,
    val status: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("payment_method") val paymentMethod: String? = null,
    @SerialName("payment_status") val paymentStatus: String? = null,
    @SerialName("pago_confirmado") val pagoConfirmado: Boolean? = null,
    @SerialName("order_type") val orderType: String? = null,
    @SerialName("customer_name") val customerName: String? = null,
    @SerialName("customer_phone") val customerPhone: String? = null,
    val address: String? = null,
    val notes: String? = null,
    @SerialName("table_number") val tableNumber: String? = null,
    @SerialName("shift_id") val shiftId: String? = null,
)

@Serializable
data class CashShiftDto(
    val id: String,
    @SerialName("closed_at") val closedAt: String? = null,
)

@Serializable
data class CategoryDto(
    val id: String,
    val name: String,
    @SerialName("sort_order") val sortOrder: Int? = null,
)

@Serializable
data class ProductDto(
    val id: String,
    @SerialName("category_id") val categoryId: String? = null,
    val name: String,
    val description: String? = null,
    val price: Double? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("is_available") val isAvailable: Boolean? = null,
    @SerialName("sale_type") val saleType: String? = null,
)

@Serializable
data class TableDto(
    val id: String,
    val name: String,
    val status: String? = null,
    @SerialName("needs_attention") val needsAttention: Boolean? = null,
)
