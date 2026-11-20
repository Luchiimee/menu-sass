package uno.snappy.app.data

// Estados de un pedido, iguales a los del panel web (orders.status).
object OrderStatus {
    const val PENDIENTE = "pendiente"
    const val RECIBIDO = "recibido"
    const val EN_PROCESO = "en_proceso"
    const val EN_CAMINO = "en_camino"
    const val ENTREGADO = "entregado"
    const val COMPLETADO = "completado"
    const val CANCELADO = "cancelado"

    val ACTIVOS = setOf(PENDIENTE, RECIBIDO, EN_PROCESO, EN_CAMINO, "esperando_confirmacion")
    fun isActive(status: String?) = status in ACTIVOS
}

// Siguiente paso del pedido y el texto del botón. null = no hay paso siguiente.
data class NextStep(val status: String, val label: String)

fun nextStep(status: String?, orderType: String?): NextStep? = when (status) {
    OrderStatus.PENDIENTE -> NextStep(OrderStatus.RECIBIDO, "Tomar pedido")
    OrderStatus.RECIBIDO -> NextStep(OrderStatus.EN_PROCESO, "En preparación")
    OrderStatus.EN_PROCESO ->
        if (orderType == "delivery") NextStep(OrderStatus.EN_CAMINO, "Salió a entregar")
        else NextStep(OrderStatus.ENTREGADO, "Entregado")
    OrderStatus.EN_CAMINO -> NextStep(OrderStatus.ENTREGADO, "Entregado")
    else -> null
}

fun statusLabel(status: String?): String = when (status) {
    OrderStatus.PENDIENTE -> "Nuevo"
    OrderStatus.RECIBIDO -> "Recibido"
    OrderStatus.EN_PROCESO -> "En preparación"
    OrderStatus.EN_CAMINO -> "En camino"
    OrderStatus.ENTREGADO, OrderStatus.COMPLETADO -> "Entregado"
    OrderStatus.CANCELADO -> "Cancelado"
    "esperando_confirmacion" -> "Esperando confirmación"
    else -> status ?: "-"
}

fun orderTypeLabel(type: String?): String = when (type) {
    "delivery" -> "Delivery"
    "retiro" -> "Retiro"
    "mesa" -> "Mesa"
    else -> type ?: ""
}
