package uno.snappy.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uno.snappy.app.data.buildCashSummary

private fun parseAmount(s: String): Double? = s.trim().replace(',', '.').toDoubleOrNull()

// Caja: el turno vigente, igual que la pantalla Caja del panel web (mismos totales y mismas reglas).
@Composable
fun CajaScreen(state: UiState, vm: AppController) {
    // Cuando entra o cambia un pedido se vuelven a leer los pedidos del turno.
    LaunchedEffect(state.orders) { vm.refreshCash() }
    var openDialog by remember { mutableStateOf(false) }
    var expenseDialog by remember { mutableStateOf(false) }
    var closeConfirm by remember { mutableStateOf(false) }
    val shift = state.shift

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Column {
            Text("CAJA", style = MaterialTheme.typography.labelSmall, color = Graphite)
            Text(if (shift != null) "Turno de hoy" else "Sin turno abierto", style = MaterialTheme.typography.headlineSmall)
            if (shift != null) Text("Abierto a las ${formatHour(shift.openedAt)}", style = MaterialTheme.typography.bodySmall, color = Graphite)
        }

        if (!state.cashLoaded) {
            Text("Cargando…", color = Graphite)
            return@Column
        }

        if (shift == null) {
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White).padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text("No hay un turno abierto.", fontWeight = FontWeight.Bold)
                Text("Iniciá el turno con el monto de cambio para empezar a registrar las ventas del día.", color = Graphite, style = MaterialTheme.typography.bodyMedium)
                Button(onClick = { openDialog = true }, colors = ButtonDefaults.buttonColors(containerColor = Fresco, contentColor = Ink)) { Text("Iniciar turno") }
            }
        } else {
            val sum = remember(state.shiftOrders, state.expenses, shift) { buildCashSummary(state.shiftOrders, state.expenses, shift.openingBalance ?: 0.0) }

            // Total del día
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(Ink).padding(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("TOTAL VENDIDO", color = Color(0xFFB7B8AE), style = MaterialTheme.typography.labelSmall, modifier = Modifier.weight(1f))
                    Text(
                        "ABIERTA", color = Color(0xFF7FE3B6), style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFF1F3D2F)).padding(horizontal = 8.dp, vertical = 3.dp),
                    )
                }
                Text(formatMoney(sum.totalSales), color = Color.White, fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 38.sp)
                Text("${sum.orderCount} ${if (sum.orderCount == 1) "operación" else "operaciones"}", color = Color(0xFFB7B8AE), style = MaterialTheme.typography.bodySmall)
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MiniCard("EFECTIVO", formatMoney(sum.cash), "Ventas en efectivo + cambio inicial", Modifier.weight(1f))
                MiniCard("DIGITAL", formatMoney(sum.digital), "Tarjeta, transferencia y Mercado Pago", Modifier.weight(1f))
            }

            Card("Por forma de pago") {
                val labels = listOf("efectivo" to "Efectivo", "tarjeta" to "Tarjeta", "transferencia" to "Transferencia", "mercadopago" to "Mercado Pago", "otros" to "Otros")
                labels.filter { (k, _) -> k != "otros" || (sum.byPay["otros"] ?: 0.0) > 0.0 }.forEach { (k, l) -> Line(l, formatMoney(sum.byPay[k] ?: 0.0)) }
            }

            Card("Ventas por tipo") {
                listOf("mesa" to "Mesa", "retiro" to "Retiro", "delivery" to "Delivery", "mostrador" to "Mostrador").forEach { (k, l) ->
                    val t = sum.byType[k]
                    Line(l, formatMoney(t?.total ?: 0.0), sub = "${t?.count ?: 0} ${if ((t?.count ?: 0) == 1) "pedido" else "pedidos"}")
                }
            }

            Card("Resumen del turno") {
                Line("Cambio inicial", formatMoney(sum.opening))
                Line("Ventas totales", formatMoney(sum.totalSales))
                Line("Gastos", "− " + formatMoney(sum.expenses))
                Line("Envíos (al repartidor)", "− " + formatMoney(sum.deliveryTotal), sub = "${sum.deliveryCount} ${if (sum.deliveryCount == 1) "envío" else "envíos"}")
                HorizontalDivider(Modifier.padding(vertical = 4.dp))
                Line("Ganancia neta", formatMoney(sum.net), bold = true, sub = "Ventas − gastos − envíos")
            }

            Card("Gastos del turno") {
                if (state.expenses.isEmpty()) Text("Todavía no cargaste gastos.", color = Graphite, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(vertical = 6.dp))
                state.expenses.forEach { e ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f).padding(vertical = 4.dp)) { Text(e.description ?: "Gasto", fontWeight = FontWeight.Medium) }
                        Text(formatMoney(e.amount), fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold)
                        IconButton(onClick = { vm.deleteExpense(e) }) { Icon(Icons.Filled.Delete, contentDescription = "Borrar gasto", tint = Alert) }
                    }
                }
                OutlinedButton(onClick = { expenseDialog = true }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp)) {
                    Icon(Icons.Filled.Add, contentDescription = null); Text(" Agregar gasto")
                }
            }

            Button(
                onClick = { closeConfirm = true },
                modifier = Modifier.fillMaxWidth().height(54.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Fresco, contentColor = Ink),
            ) { Text("Cerrar caja", fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 17.sp) }
            Text("Se guarda el resumen del turno con estos totales.", color = Graphite, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 16.dp))
        }
    }

    if (openDialog) OpeningDialog(onClose = { openDialog = false }) { amount -> vm.openShift(amount); openDialog = false }
    if (expenseDialog) ExpenseDialog(onClose = { expenseDialog = false }) { d, a -> vm.addExpense(d, a); expenseDialog = false }
    if (closeConfirm) AlertDialog(
        onDismissRequest = { closeConfirm = false },
        title = { Text("¿Cerrar la caja?") },
        text = { Text("Se guarda el resumen del turno con los totales de ahora. Los pedidos que entren después van al próximo turno.") },
        confirmButton = { TextButton(onClick = { closeConfirm = false; vm.closeShift() }) { Text("Cerrar caja") } },
        dismissButton = { TextButton(onClick = { closeConfirm = false }) { Text("Cancelar") } },
    )
}

@Composable
private fun MiniCard(label: String, value: String, hint: String, modifier: Modifier) {
    Column(modifier.clip(RoundedCornerShape(20.dp)).background(Color.White).padding(16.dp)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = Graphite)
        Text(value, fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Text(hint, style = MaterialTheme.typography.bodySmall, color = Graphite)
    }
}

@Composable
private fun Card(title: String, content: @Composable () -> Unit) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White).padding(16.dp)) {
        Text(title.uppercase(), style = MaterialTheme.typography.labelSmall, color = Graphite, modifier = Modifier.padding(bottom = 6.dp))
        content()
    }
}

@Composable
private fun Line(label: String, value: String, bold: Boolean = false, sub: String? = null) {
    Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(label, fontWeight = if (bold) FontWeight.Bold else FontWeight.Medium)
            if (sub != null) Text(sub, style = MaterialTheme.typography.bodySmall, color = Graphite)
        }
        Text(value, fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = if (bold) 19.sp else 15.sp)
    }
}

@Composable
private fun OpeningDialog(onClose: () -> Unit, onConfirm: (Double) -> Unit) {
    var text by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onClose,
        title = { Text("Monto de cambio inicial") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Es la plata con la que arrancás la caja. Si no tenés cambio, dejalo en 0.", color = Graphite)
                OutlinedTextField(
                    text, { text = it }, label = { Text("Monto") }, prefix = { Text("$ ") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                )
            }
        },
        confirmButton = { TextButton(onClick = { onConfirm(parseAmount(text) ?: 0.0) }) { Text("Iniciar turno") } },
        dismissButton = { TextButton(onClick = onClose) { Text("Cancelar") } },
    )
}

@Composable
private fun ExpenseDialog(onClose: () -> Unit, onConfirm: (String, Double) -> Unit) {
    var desc by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    val value = parseAmount(amount)
    AlertDialog(
        onDismissRequest = onClose,
        title = { Text("Agregar gasto") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(desc, { desc = it }, label = { Text("Descripción") }, placeholder = { Text("Ej: Hielo") }, singleLine = true)
                OutlinedTextField(
                    amount, { amount = it }, label = { Text("Monto") }, prefix = { Text("$ ") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                )
            }
        },
        confirmButton = { TextButton(enabled = desc.isNotBlank() && value != null && value > 0, onClick = { onConfirm(desc, value ?: 0.0) }) { Text("Guardar") } },
        dismissButton = { TextButton(onClick = onClose) { Text("Cancelar") } },
    )
}
