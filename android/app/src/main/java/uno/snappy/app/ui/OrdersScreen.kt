package uno.snappy.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import uno.snappy.app.data.OrderDto
import uno.snappy.app.data.OrderStatus
import uno.snappy.app.data.nextStep
import uno.snappy.app.data.orderTypeLabel
import uno.snappy.app.data.statusLabel

@Composable
fun OrdersScreen(state: UiState, vm: AppViewModel) {
    var tab by remember { mutableIntStateOf(0) }
    val active = state.orders.filter { OrderStatus.isActive(it.status) }
    val history = state.orders.filter { !OrderStatus.isActive(it.status) }
    val list = if (tab == 0) active else history

    Column(Modifier.fillMaxSize()) {
        // Encabezado: nombre del local, abierto/cerrado y actualizar
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(state.restaurant?.name ?: "Mi local", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Text(if (state.restaurant?.isOpen == true) "Abierto" else "Cerrado", color = if (state.restaurant?.isOpen == true) Fresco else Graphite)
            }
            Switch(checked = state.restaurant?.isOpen == true, onCheckedChange = vm::setOpen)
            IconButton(onClick = vm::refreshOrders) { Icon(Icons.Filled.Refresh, contentDescription = "Actualizar") }
        }
        TabRow(selectedTabIndex = tab) {
            Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Activos (${active.size})") })
            Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Historial") })
        }
        if (list.isEmpty()) {
            Text(
                if (tab == 0) "No hay pedidos activos. Cuando llegue uno suena y aparece acá." else "Todavía no hay pedidos terminados esta semana.",
                color = Graphite, modifier = Modifier.padding(24.dp),
            )
        }
        LazyColumn(Modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(list, key = { it.id }) { order -> OrderCard(order = order, vm = vm) }
        }
    }
}

// "2 x Hamburguesa" por cada ítem. Tolera ítems con formas distintas (name/quantity o title/qty).
private fun itemLines(order: OrderDto): List<String> {
    val arr = order.items as? JsonArray ?: return emptyList()
    return arr.mapNotNull { el ->
        val o = el as? JsonObject ?: return@mapNotNull null
        fun str(vararg keys: String) = keys.firstNotNullOfOrNull { k -> o[k]?.let { runCatching { it.jsonPrimitive.content }.getOrNull() } }
        val name = str("name", "title", "product_name") ?: return@mapNotNull null
        val qty = str("quantity", "qty", "cantidad") ?: "1"
        "$qty x $name"
    }
}

@Composable
private fun OrderCard(order: OrderDto, vm: AppViewModel) {
    val step = nextStep(order.status, order.orderType)
    val isNew = order.status == OrderStatus.PENDIENTE
    val needsTransferCheck = order.paymentMethod == "transferencia" && order.pagoConfirmado != true && OrderStatus.isActive(order.status)

    Card(
        colors = CardDefaults.cardColors(containerColor = if (isNew) Color(0xFFE8F7F1) else Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    listOfNotNull(orderTypeLabel(order.orderType), order.tableNumber?.takeIf { it.isNotBlank() }?.let { "N° $it" }).joinToString(" "),
                    fontWeight = FontWeight.Black, modifier = Modifier.weight(1f),
                )
                Text(formatHour(order.createdAt), color = Graphite)
            }
            Text(statusLabel(order.status), color = if (isNew) Fresco else Graphite, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            Text(listOfNotNull(order.customerName, order.customerPhone).joinToString(" · "))
            order.address?.takeIf { it.isNotBlank() }?.let { Text(it, color = Graphite) }
            Spacer(Modifier.height(6.dp))
            itemLines(order).forEach { Text(it) }
            order.notes?.takeIf { it.isNotBlank() }?.let { Text("Nota: $it", color = Brasa) }
            Spacer(Modifier.height(8.dp))
            Row {
                Text(
                    "${formatMoney(order.total)} · ${order.paymentMethod ?: ""}",
                    fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f),
                )
            }
            if (needsTransferCheck) {
                Spacer(Modifier.height(8.dp))
                OutlinedButton(onClick = { vm.confirmTransfer(order) }, modifier = Modifier.fillMaxWidth()) { Text("Confirmar transferencia recibida") }
            }
            if (step != null) {
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { vm.advance(order, step.status) }, modifier = Modifier.weight(1f)) { Text(step.label, fontWeight = FontWeight.Bold) }
                    OutlinedButton(onClick = { vm.cancel(order) }) { Text("Cancelar") }
                }
            }
        }
    }
}
