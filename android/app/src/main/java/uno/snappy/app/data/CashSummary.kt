package uno.snappy.app.data

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Resumen de caja: el mismo cálculo que buildShiftSummary del panel web (lib/cashUtils.ts).
data class TypeTotal(val count: Int, val total: Double)

private val SALE_TYPES = listOf("mesa", "retiro", "delivery", "mostrador")
private val PAYS = listOf("efectivo", "tarjeta", "transferencia", "mercadopago")

data class CashSummary(
    val byType: Map<String, TypeTotal>,
    val byPay: Map<String, Double>,
    val opening: Double,
    val deliveryCount: Int,
    val deliveryTotal: Double,
    val expenses: Double,
    val totalSales: Double,
    val orderCount: Int,
) {
    val net get() = totalSales - deliveryTotal - expenses
    val digital get() = (byPay["tarjeta"] ?: 0.0) + (byPay["transferencia"] ?: 0.0) + (byPay["mercadopago"] ?: 0.0)
    val cash get() = (byPay["efectivo"] ?: 0.0) + opening

    fun toJson(): JsonObject = buildJsonObject {
        put("salesByType", buildJsonObject {
            byType.forEach { (k, v) -> put(k, buildJsonObject { put("count", v.count); put("total", v.total) }) }
        })
        put("byPaymentMethod", buildJsonObject { byPay.forEach { (k, v) -> put(k, v) } })
        put("openingBalance", opening)
        put("deliveryCount", deliveryCount)
        put("deliveryCostTotal", deliveryTotal)
        put("totalExpenses", expenses)
        put("totalSales", totalSales)
        put("netProfit", net)
        put("orderCount", orderCount)
        put("deliveryBasis", "cobrado")
    }
}

fun buildCashSummary(orders: List<OrderDto>, expenses: List<ExpenseDto>, opening: Double): CashSummary {
    // Cuentan las ventas de mesa, retiro, delivery y mostrador; no los pendientes, cancelados ni la apertura.
    val sales = orders.filter { it.orderType in SALE_TYPES && it.status != OrderStatus.PENDIENTE && it.status != OrderStatus.CANCELADO }
    val byType = SALE_TYPES.associateWith { t ->
        val l = sales.filter { it.orderType == t }
        TypeTotal(l.size, l.sumOf { it.total ?: 0.0 })
    }
    val pay = linkedMapOf("efectivo" to 0.0, "tarjeta" to 0.0, "transferencia" to 0.0, "mercadopago" to 0.0, "otros" to 0.0)
    for (o in sales) {
        val key = o.paymentMethod?.takeIf { it in PAYS } ?: "otros"
        pay[key] = (pay[key] ?: 0.0) + (o.total ?: 0.0)
    }
    // Envío cobrado: plata del repartidor, no del local.
    val deliveries = sales.filter { it.orderType == "delivery" && (it.deliveryCost ?: 0.0) > 0.0 }
    return CashSummary(
        byType = byType,
        byPay = pay,
        opening = opening,
        deliveryCount = deliveries.size,
        deliveryTotal = deliveries.sumOf { it.deliveryCost ?: 0.0 },
        expenses = expenses.sumOf { it.amount ?: 0.0 },
        totalSales = byType.values.sumOf { it.total },
        orderCount = sales.size,
    )
}


// Resumen guardado al cerrar un turno (cash_shifts.summary). Un cierre viejo puede no traer algunas claves.
fun cashSummaryFromJson(j: JsonObject): CashSummary {
    fun num(e: kotlinx.serialization.json.JsonElement?): Double = (e as? kotlinx.serialization.json.JsonPrimitive)?.content?.toDoubleOrNull() ?: 0.0
    val types = (j["salesByType"] as? JsonObject).orEmpty().mapValues { (_, v) ->
        val o = v as? JsonObject
        TypeTotal(num(o?.get("count")).toInt(), num(o?.get("total")))
    }
    val pay = (j["byPaymentMethod"] as? JsonObject).orEmpty().mapValues { (_, v) -> num(v) }
    return CashSummary(
        byType = types, byPay = pay,
        opening = num(j["openingBalance"]),
        deliveryCount = num(j["deliveryCount"]).toInt(), deliveryTotal = num(j["deliveryCostTotal"]),
        expenses = num(j["totalExpenses"]), totalSales = num(j["totalSales"]), orderCount = num(j["orderCount"]).toInt(),
    )
}

private fun JsonObject?.orEmpty(): Map<String, kotlinx.serialization.json.JsonElement> = this ?: emptyMap()
