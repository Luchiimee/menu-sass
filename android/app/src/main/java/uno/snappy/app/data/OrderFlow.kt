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

// Etapa visual de un pedido: define la columna (tablet), el color de la tarjeta y el orden en la lista.
enum class OrderStage { NUEVO, COCINA, LISTO, FINAL }

fun orderStage(o: OrderDto): OrderStage = when (o.status) {
    OrderStatus.PENDIENTE, "esperando_confirmacion" -> OrderStage.NUEVO
    OrderStatus.RECIBIDO, OrderStatus.EN_PROCESO -> OrderStage.COCINA
    OrderStatus.EN_CAMINO -> OrderStage.LISTO
    // En mesa, "entregado" es que la mesa está comiendo: el pedido sigue abierto hasta cobrar.
    OrderStatus.ENTREGADO -> if (o.orderType == "mesa") OrderStage.LISTO else OrderStage.FINAL
    else -> OrderStage.FINAL
}

// Tipo normalizado: lo que no es retiro ni mesa se trata como delivery.
fun orderKind(o: OrderDto): String = when (o.orderType) {
    "retiro" -> "retiro"
    "mesa" -> "mesa"
    else -> "delivery"
}

// Siguiente paso del pedido y el texto del botón. null = no hay paso siguiente.
// Igual que el panel web: mesa (aceptar, entregado, cobrar), delivery y retiro (tomar, cocina, listo o enviado, entregado).
data class NextStep(val status: String, val label: String)

fun nextStep(status: String?, orderType: String?): NextStep? {
    if (orderType == "mesa") return when (status) {
        OrderStatus.PENDIENTE -> NextStep(OrderStatus.EN_PROCESO, "Aceptar pedido")
        OrderStatus.EN_PROCESO -> NextStep(OrderStatus.ENTREGADO, "Marcar entregado")
        else -> null
    }
    val retiro = orderType == "retiro"
    return when (status) {
        OrderStatus.PENDIENTE -> NextStep(OrderStatus.RECIBIDO, "Tomar pedido")
        OrderStatus.RECIBIDO -> NextStep(OrderStatus.EN_PROCESO, "Enviar a cocina")
        OrderStatus.EN_PROCESO ->
            if (retiro) NextStep(OrderStatus.EN_CAMINO, "Notificar: pedido listo")
            else NextStep(OrderStatus.EN_CAMINO, "Enviar pedido")
        OrderStatus.EN_CAMINO ->
            if (retiro) NextStep(OrderStatus.ENTREGADO, "Entregar al cliente")
            else NextStep(OrderStatus.ENTREGADO, "Finalizar pedido")
        else -> null
    }
}

// Texto del estado, según el tipo de pedido.
fun statusText(o: OrderDto): String = when (o.status) {
    OrderStatus.PENDIENTE -> if (o.orderType == "mesa") "Nuevo pedido" else "Nuevo"
    OrderStatus.RECIBIDO -> "Recibido"
    OrderStatus.EN_PROCESO -> if (o.orderType == "mesa") "En cocina" else "Preparando"
    OrderStatus.EN_CAMINO -> if (o.orderType == "retiro") "Listo para retirar" else "En camino"
    OrderStatus.ENTREGADO -> if (o.orderType == "mesa") "Servida" else "Entregado"
    OrderStatus.COMPLETADO -> if (o.orderType == "mesa") "Cobrada" else "Entregado"
    OrderStatus.CANCELADO -> "Cancelado"
    "esperando_confirmacion" -> "Esperando confirmación"
    else -> o.status ?: "-"
}

// Nombre de la columna (tablet) para cada etapa.
fun stageLabel(stage: OrderStage, kind: String): String = when (stage) {
    OrderStage.NUEVO -> "Sin atender"
    OrderStage.COCINA -> "En cocina"
    OrderStage.LISTO -> when (kind) {
        "retiro" -> "Listo para retirar"
        "mesa" -> "Servidas"
        else -> "En camino"
    }
    OrderStage.FINAL -> "Finalizados"
}

// "4" pasa a "Mesa 4"; si ya viene con nombre ("Terraza 2") se deja como está.
fun tableLabel(name: String?): String {
    val n = name?.trim().orEmpty()
    if (n.isEmpty()) return "Mesa"
    return if (n.all { it.isDigit() }) "Mesa $n" else n
}
