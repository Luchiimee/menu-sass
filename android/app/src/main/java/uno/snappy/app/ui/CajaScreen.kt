package uno.snappy.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
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
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import uno.snappy.app.data.buildCashSummary
import uno.snappy.app.data.cashSummaryFromJson
import uno.snappy.app.data.normalizeCloseHour
import uno.snappy.app.data.parseTs
import uno.snappy.app.data.todayAR

private fun parseAmount(s: String): Double? = s.trim().replace(',', '.').toDoubleOrNull()
private val AR = ZoneOffset.ofHours(-3)
private fun hhmm(ts: String?): String = parseTs(ts)?.atOffset(AR)?.format(DateTimeFormatter.ofPattern("HH:mm")) ?: ""
private fun full(ts: String?): String = parseTs(ts)?.atOffset(AR)?.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) ?: ""
private fun dmy(date: String): String = runCatching { LocalDate.parse(date).format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) }.getOrDefault(date)

// Caja: mismo contenido que la pantalla Caja del panel web (turnos por día, resumen, gastos e historial).
@Composable
fun CajaScreen(state: UiState, vm: AppController) {
    // Cuando entra o cambia un pedido se vuelven a leer los pedidos del turno.
    LaunchedEffect(state.orders) { vm.refreshCash() }
    var openDialog by remember { mutableStateOf(false) }
    var expenseDialog by remember { mutableStateOf(false) }
    var saleDialog by remember { mutableStateOf(false) }
    var balanceDialog by remember { mutableStateOf(false) }
    var closeHourDialog by remember { mutableStateOf(false) }
    var closeConfirm by remember { mutableStateOf(false) }
    val view = state.viewShift
    val active = state.shift
    val isOpen = view != null && view.closedAt == null
    val date = state.cashDate ?: todayAR()
    val isToday = date == todayAR()
    val closeHour = normalizeCloseHour(state.restaurant?.cashCloseHour)

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("CAJA", style = MaterialTheme.typography.labelSmall, color = Graphite)

        if (state.cashLocked) {
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White).padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Icon(Icons.Filled.Lock, contentDescription = null, tint = Graphite, modifier = Modifier.size(32.dp))
                Text("La Caja es del Plan Plus", fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Text("Las métricas y el arqueo de caja son exclusivos del Plan Plus. Podés cambiar de plan desde el panel web.", color = Graphite, style = MaterialTheme.typography.bodyMedium)
            }
            return@Column
        }
        if (!state.cashLoaded) { Text("Cargando…", color = Graphite); return@Column }

        // Navegación por día
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Color.White).padding(4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { vm.setCashDate(LocalDate.parse(date).minusDays(1).toString()) }) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Día anterior") }
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(dmy(date), fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                if (!isToday) Text("Volver a hoy", color = Color(0xFF0B7A52), style = MaterialTheme.typography.labelMedium, modifier = Modifier.clickable { vm.setCashDate(todayAR()) })
            }
            IconButton(enabled = !isToday, onClick = { vm.setCashDate(LocalDate.parse(date).plusDays(1).toString()) }) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Día siguiente") }
        }
        if (state.dayShifts.size > 1) {
            val idx = state.dayShifts.indexOfFirst { it.id == view?.id }.coerceAtLeast(0)
            Row(Modifier.clip(RoundedCornerShape(14.dp)).background(Color.White).padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(enabled = idx > 0, onClick = { vm.pickShift(state.dayShifts[idx - 1].id) }) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Turno anterior") }
                Text("TURNO ${idx + 1} / ${state.dayShifts.size}", style = MaterialTheme.typography.labelMedium, color = Graphite)
                IconButton(enabled = idx < state.dayShifts.lastIndex, onClick = { vm.pickShift(state.dayShifts[idx + 1].id) }) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Turno siguiente") }
            }
        }

        // Acciones
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (active == null) Button(onClick = { openDialog = true }, colors = ButtonDefaults.buttonColors(containerColor = Fresco, contentColor = Ink), modifier = Modifier.weight(1f)) { Text("Iniciar turno", fontWeight = FontWeight.Bold) }
            if (isOpen && active != null) Button(onClick = { closeConfirm = true }, colors = ButtonDefaults.buttonColors(containerColor = Alert, contentColor = Color.White), modifier = Modifier.weight(1f)) { Text("Cerrar turno", fontWeight = FontWeight.Bold) }
            if (isOpen) {
                OutlinedButton(onClick = { saleDialog = true }) { Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(16.dp)); Text(" Venta") }
                OutlinedButton(onClick = { expenseDialog = true }) { Text("Gasto", color = Alert) }
            }
        }

        if (view == null) {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Sin turnos para este día", fontWeight = FontWeight.Bold, color = Graphite)
                if (active == null) Text("Iniciá un turno con el monto de cambio para empezar a registrar las ventas.", color = Graphite, style = MaterialTheme.typography.bodyMedium)
            }
        } else {
            val sum = remember(state.shiftOrders, state.expenses, view) {
                view.summary?.takeIf { view.closedAt != null }?.let { cashSummaryFromJson(it) }
                    ?: buildCashSummary(state.shiftOrders, state.expenses, view.openingBalance ?: 0.0)
            }

            if (isOpen && view.openedType == "auto") {
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Color(0xFFF5E8DF)).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Turno abierto automáticamente", fontWeight = FontWeight.Bold, color = Brasa)
                        Text("Se abrió con el primer pedido del día: el cambio inicial quedó en $0. Actualizalo para un arqueo correcto.", style = MaterialTheme.typography.bodySmall, color = Brasa)
                    }
                    TextButton(onClick = { balanceDialog = true }) { Text("Editar cambio", color = Brasa, fontWeight = FontWeight.Bold) }
                }
            }
            if (!isOpen) {
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Ink).padding(16.dp)) {
                    Text("Turno cerrado — ${if (view.closeType == "auto") "Cierre automático" else "Cierre manual"}", color = Color.White, fontWeight = FontWeight.Bold)
                    Text("Abierto: ${full(view.openedAt)} hs", color = Color(0xFFB7B8AE), style = MaterialTheme.typography.bodySmall)
                    Text("Cerrado: ${full(view.closedAt)} hs", color = Color(0xFFB7B8AE), style = MaterialTheme.typography.bodySmall)
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MiniCard("EFECTIVO", formatMoney(sum.cash), "Ventas efectivo + inicio de caja", Modifier.weight(1f))
                MiniCard("DIGITAL", formatMoney(sum.digital), "Transferencias y tarjetas", Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Column(Modifier.weight(1f).clip(RoundedCornerShape(20.dp)).background(Fresco).padding(16.dp)) {
                    Text("TOTAL VENDIDO", style = MaterialTheme.typography.labelSmall, color = Color(0xFF0C2D1F))
                    Text(formatMoney(sum.totalSales), fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Color(0xFF0C2D1F))
                    Text("${sum.orderCount} ${if (sum.orderCount == 1) "operación" else "operaciones"}", style = MaterialTheme.typography.bodySmall, color = Color(0xFF0C2D1F))
                }
                Column(Modifier.weight(1f).clip(RoundedCornerShape(20.dp)).background(Ink).padding(16.dp)) {
                    Text("NETO", style = MaterialTheme.typography.labelSmall, color = Color(0xFFB7B8AE))
                    if (isOpen) {
                        Text("—", fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Color(0x55FFFFFF))
                        Text("Disponible al cerrar", style = MaterialTheme.typography.bodySmall, color = Color(0xFFB7B8AE))
                    } else {
                        Text(formatMoney(sum.net), fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Color.White)
                        Text("Ventas − gastos − delivery", style = MaterialTheme.typography.bodySmall, color = Color(0xFFB7B8AE))
                    }
                }
            }

            Card("Ventas por tipo") {
                val labels = mapOf("mesa" to "Mesa", "retiro" to "Retiro", "delivery" to "Delivery", "mostrador" to "Mostrador")
                labels.forEach { (k, l) ->
                    val t = sum.byType[k]
                    if ((t?.count ?: 0) > 0) Line(l, formatMoney(t?.total ?: 0.0), sub = "${t?.count} ${if (t?.count == 1) "pedido" else "pedidos"}")
                }
                if (sum.orderCount == 0) Text("Sin ventas en este turno", color = Graphite, style = MaterialTheme.typography.bodyMedium)
            }
            Card("Por método de pago") {
                listOf("efectivo" to "Efectivo", "tarjeta" to "Tarjeta", "transferencia" to "Transferencia", "mercadopago" to "Mercado Pago", "otros" to "Otros")
                    .filter { (k, _) -> if (k == "mercadopago") sum.byPay.containsKey("mercadopago") else if (k == "otros") (sum.byPay["otros"] ?: 0.0) > 0.0 else true }
                    .forEach { (k, l) -> Line(l, formatMoney(sum.byPay[k] ?: 0.0)) }
            }
            Card("Resumen del turno") {
                Line("Ventas totales", formatMoney(sum.totalSales))
                Line("Gastos", "− " + formatMoney(sum.expenses))
                if (sum.deliveryTotal > 0) Line("Envíos (al repartidor)", "− " + formatMoney(sum.deliveryTotal), sub = if (sum.deliveryCount > 0) "${sum.deliveryCount} ${if (sum.deliveryCount == 1) "envío" else "envíos"}" else null)
                HorizontalDivider(Modifier.padding(vertical = 4.dp))
                Line("Ganancia neta", formatMoney(sum.net), bold = true)
            }

            Card("Gastos del turno") {
                if (state.expenses.isEmpty()) Text("Sin gastos registrados", color = Graphite, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(vertical = 6.dp))
                state.expenses.forEach { e ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f).padding(vertical = 4.dp)) {
                            Text(e.description ?: "Gasto", fontWeight = FontWeight.Medium)
                            Text(listOfNotNull(e.category?.takeIf { it.isNotBlank() }, hhmm(e.createdAt).takeIf { it.isNotEmpty() }).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = Graphite)
                        }
                        Text(formatMoney(e.amount), fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold)
                        if (isOpen) IconButton(onClick = { vm.deleteExpense(e) }) { Icon(Icons.Filled.Delete, contentDescription = "Borrar gasto", tint = Alert) }
                    }
                }
                if (isOpen) OutlinedButton(onClick = { expenseDialog = true }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp)) { Icon(Icons.Filled.Add, contentDescription = null); Text(" Agregar gasto") }
            }

            Card("Historial del turno") {
                if (state.shiftOrders.isEmpty()) Text("Sin movimientos en este turno", color = Graphite, style = MaterialTheme.typography.bodyMedium)
                state.shiftOrders.forEach { o ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(hhmm(o.createdAt), color = Graphite, style = MaterialTheme.typography.bodySmall, modifier = Modifier.width(44.dp))
                        Column(Modifier.weight(1f)) {
                            Text(o.customerName ?: "—", fontWeight = FontWeight.Medium)
                            Text("${(o.orderType ?: "").uppercase()} · ${o.paymentMethod ?: ""}", style = MaterialTheme.typography.labelSmall, color = Graphite)
                        }
                        Text(formatMoney(o.total), fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold)
                    }
                }
            }
            if (isOpen) TextButton(onClick = { balanceDialog = true }) { Text("Editar cambio inicial (${formatMoney(view.openingBalance ?: 0.0)})") }
        }

        Card("Horario de cierre de caja") {
            Text("Define cuándo termina tu día de caja. Un mismo día puede tener varios turnos.", style = MaterialTheme.typography.bodySmall, color = Graphite)
            Row(Modifier.fillMaxWidth().clickable { closeHourDialog = true }.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Hora de cierre", Modifier.weight(1f), fontWeight = FontWeight.Medium)
                Text(closeHour, fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Cierre automático", fontWeight = FontWeight.Medium)
                    Text(if (state.restaurant?.cashAutoCloseEnabled == true) "Cierra el turno abierto en el próximo cierre automático (una vez por día)" else "Solo cierre manual", style = MaterialTheme.typography.bodySmall, color = Graphite)
                }
                Switch(checked = state.restaurant?.cashAutoCloseEnabled == true, onCheckedChange = vm::setCashAutoClose, colors = snappySwitchColors())
            }
            Text("El cambio de horario aplica desde el próximo turno.", style = MaterialTheme.typography.labelSmall, color = Graphite)
        }
        androidx.compose.foundation.layout.Spacer(Modifier.height(12.dp))
    }

    if (openDialog) AmountDialog("Iniciar turno", "Ingresá el monto de efectivo (cambio) con el que arrancás el turno.", "Abrir turno", "0", onClose = { openDialog = false }) { vm.openShift(it ?: 0.0); openDialog = false }
    if (balanceDialog) AmountDialog("Editar cambio inicial", "Monto de efectivo con el que arrancó este turno.", "Guardar", (view?.openingBalance ?: 0.0).let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() }, onClose = { balanceDialog = false }) { v -> if (v != null) vm.updateOpeningBalance(v); balanceDialog = false }
    if (expenseDialog) ExpenseDialog(onClose = { expenseDialog = false }) { d, a, c -> vm.addExpense(d, a, c); expenseDialog = false }
    if (saleDialog) SaleDialog(onClose = { saleDialog = false }) { c, t, m -> vm.addManualSale(c, t, m); saleDialog = false }
    if (closeHourDialog) CloseHourDialog(closeHour, onClose = { closeHourDialog = false }) { vm.setCashCloseHour(it); closeHourDialog = false }
    if (closeConfirm) AlertDialog(
        onDismissRequest = { closeConfirm = false },
        title = { Text("¿Cerrar turno?") },
        text = { Text("El resumen del turno quedará congelado. No podrás agregar más ventas ni gastos.") },
        confirmButton = { TextButton(onClick = { closeConfirm = false; vm.closeShift() }) { Text("Sí, cerrar", color = Alert) } },
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
private fun AmountDialog(title: String, text: String, confirm: String, initial: String, onClose: () -> Unit, onConfirm: (Double?) -> Unit) {
    var v by remember { mutableStateOf(if (initial == "0") "" else initial) }
    AlertDialog(
        onDismissRequest = onClose, title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text, color = Graphite)
                OutlinedTextField(v, { v = it }, label = { Text("Monto") }, prefix = { Text("$ ") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
            }
        },
        confirmButton = { TextButton(onClick = { onConfirm(parseAmount(v)) }) { Text(confirm) } },
        dismissButton = { TextButton(onClick = onClose) { Text("Cancelar") } },
    )
}

@Composable
private fun ExpenseDialog(onClose: () -> Unit, onConfirm: (String, Double, String?) -> Unit) {
    var desc by remember { mutableStateOf("") }
    var cat by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    val value = parseAmount(amount)
    AlertDialog(
        onDismissRequest = onClose, title = { Text("Agregar gasto") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(desc, { desc = it }, label = { Text("Descripción *") }, placeholder = { Text("Ej: Hielo") }, singleLine = true)
                OutlinedTextField(cat, { cat = it }, label = { Text("Categoría (opcional)") }, singleLine = true)
                OutlinedTextField(amount, { amount = it }, label = { Text("Importe *") }, prefix = { Text("$ ") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
            }
        },
        confirmButton = { TextButton(enabled = desc.isNotBlank() && value != null && value > 0, onClick = { onConfirm(desc, value ?: 0.0, cat.ifBlank { null }) }) { Text("Guardar") } },
        dismissButton = { TextButton(onClick = onClose) { Text("Cancelar") } },
    )
}

@Composable
private fun SaleDialog(onClose: () -> Unit, onConfirm: (String, Double, String) -> Unit) {
    var concept by remember { mutableStateOf("") }
    var total by remember { mutableStateOf("") }
    var method by remember { mutableStateOf("efectivo") }
    val value = parseAmount(total)
    AlertDialog(
        onDismissRequest = onClose, title = { Text("Registrar venta") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(concept, { concept = it }, label = { Text("Concepto") }, placeholder = { Text("Venta Manual") }, singleLine = true)
                OutlinedTextField(total, { total = it }, label = { Text("Monto total") }, prefix = { Text("$ ") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                Text("MEDIO DE PAGO", style = MaterialTheme.typography.labelSmall, color = Graphite)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("efectivo" to "Efectivo", "transferencia" to "Transf.", "tarjeta" to "Tarjeta").forEach { (k, l) ->
                        val on = method == k
                        Box(
                            Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(if (on) Color(0xFFD6F3E6) else Surface2).clickable { method = k }.padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center,
                        ) { Text(l, fontWeight = if (on) FontWeight.Bold else FontWeight.Medium, color = if (on) Color(0xFF0B5A3C) else Ink, fontSize = 13.sp) }
                    }
                }
            }
        },
        confirmButton = { TextButton(enabled = value != null && value > 0, onClick = { onConfirm(concept, value ?: 0.0, method) }) { Text("Confirmar venta") } },
        dismissButton = { TextButton(onClick = onClose) { Text("Cancelar") } },
    )
}

@Composable
private fun CloseHourDialog(current: String, onClose: () -> Unit, onConfirm: (String) -> Unit) {
    var text by remember { mutableStateOf(current) }
    val ok = Regex("^([01]\\d|2[0-3]):[0-5]\\d$").matches(text)
    AlertDialog(
        onDismissRequest = onClose, title = { Text("Hora de cierre") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Formato HH:MM, hora de Argentina. Si el cierre es 03:00, la caja del 20 va de las 03:00 del 20 a las 03:00 del 21.", color = Graphite, style = MaterialTheme.typography.bodySmall)
                OutlinedTextField(text, { text = it.take(5) }, label = { Text("Hora") }, singleLine = true, isError = !ok, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
            }
        },
        confirmButton = { TextButton(enabled = ok, onClick = { onConfirm(text) }) { Text("Guardar") } },
        dismissButton = { TextButton(onClick = onClose) { Text("Cancelar") } },
    )
}
