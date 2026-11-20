package uno.snappy.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import uno.snappy.app.data.OrderDto
import uno.snappy.app.data.OrderStage
import uno.snappy.app.data.nextStep
import uno.snappy.app.data.orderKind
import uno.snappy.app.data.orderStage
import uno.snappy.app.data.stageLabel
import uno.snappy.app.data.statusText
import uno.snappy.app.data.tableLabel

private enum class OrderTab(val kind: String, val label: String) {
    DELIVERY("delivery", "Delivery"),
    RETIRO("retiro", "Retiro"),
    MESA("mesa", "Mesa"),
}

@Composable
fun OrdersScreen(state: UiState, vm: AppController) {
    val orders = state.orders.filter { it.orderType != "apertura" }
    // El salón es del plan plus; si ya hay un pedido de mesa, la pestaña aparece igual.
    val hasSalon = state.restaurant?.subscriptionPlan == "plus" || orders.any { it.orderType == "mesa" }
    val tabs = if (hasSalon) OrderTab.entries.toList() else listOf(OrderTab.DELIVERY, OrderTab.RETIRO)
    var selected by rememberSaveable { mutableStateOf(OrderTab.DELIVERY) }
    val tab = if (selected in tabs) selected else OrderTab.DELIVERY
    val list = orders.filter { orderKind(it) == tab.kind }

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val wide = maxWidth >= 720.dp
        Column(Modifier.fillMaxSize()) {
            Header(state, vm)
            if (state.ringing) RingingBanner(vm)
            TypeTabs(
                tabs = tabs,
                selected = tab,
                pendingOf = { t -> orders.count { orderKind(it) == t.kind && orderStage(it) == OrderStage.NUEVO } },
                onSelect = { selected = it },
            )
            when {
                tab == OrderTab.MESA -> MesaSection(list, wide, vm)
                wide -> Board(list, tab.kind, vm)
                else -> OrderList(list, vm)
            }
        }
    }
}

@Composable
private fun Header(state: UiState, vm: AppController) {
    val open = state.restaurant?.isOpen == true
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(state.restaurant?.name ?: "Mi local", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
            Text(if (open) "Abierto" else "Cerrado", color = if (open) Fresco else Graphite)
        }
        Switch(checked = open, onCheckedChange = vm::setOpen)
        IconButton(onClick = vm::refreshOrders) { Icon(Icons.Filled.Refresh, contentDescription = "Actualizar") }
    }
}

@Composable
private fun RingingBanner(vm: AppController) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp).clip(RoundedCornerShape(12.dp)).background(Alert).padding(start = 14.dp, end = 8.dp, top = 6.dp, bottom = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("Pedido nuevo sin atender", modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold, color = Color.White)
        Button(onClick = vm::silence, colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Ink)) { Text("Silenciar") }
    }
}

@Composable
private fun TypeTabs(tabs: List<OrderTab>, selected: OrderTab, pendingOf: (OrderTab) -> Int, onSelect: (OrderTab) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        tabs.forEach { t ->
            val on = t == selected
            val pending = pendingOf(t)
            Row(
                Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(if (on) Ink else Surface2).clickable { onSelect(t) }.padding(vertical = 11.dp),
                horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(t.label, color = if (on) Color.White else Ink, fontWeight = FontWeight.Bold)
                if (pending > 0) {
                    Spacer(Modifier.width(6.dp))
                    Box(Modifier.size(20.dp).clip(CircleShape).background(Alert), contentAlignment = Alignment.Center) {
                        Text("$pending", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

// Orden: sin atender primero (el más viejo arriba), después cocina, listos. Los finalizados van aparte.
private val openOrder = compareBy<OrderDto>({ orderStage(it).ordinal }, { it.createdAt ?: "" })

// ---------- Celular: una lista, con los finalizados plegados al final ----------
@Composable
private fun OrderList(orders: List<OrderDto>, vm: AppController) {
    val expanded = remember { mutableStateMapOf<String, Boolean>() }
    var showFinal by rememberSaveable { mutableStateOf(false) }
    val open = orders.filter { orderStage(it) != OrderStage.FINAL }.sortedWith(openOrder)
    val done = orders.filter { orderStage(it) == OrderStage.FINAL }.sortedByDescending { it.createdAt ?: "" }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = 6.dp, bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (open.isEmpty()) item(key = "empty") {
            Text("No hay pedidos activos. Cuando llegue uno suena y aparece acá.", color = Graphite, modifier = Modifier.padding(12.dp))
        }
        items(open, key = { it.id }) { o ->
            val default = orderStage(o) == OrderStage.NUEVO
            OrderCard(o, expanded[o.id] ?: default, { expanded[o.id] = !(expanded[o.id] ?: default) }, vm)
        }
        if (done.isNotEmpty()) {
            item(key = "final-header") {
                Row(
                    Modifier.fillMaxWidth().clickable { showFinal = !showFinal }.padding(vertical = 10.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Finalizados · ${done.size}", color = Graphite, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    Icon(if (showFinal) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown, contentDescription = null, tint = Graphite)
                }
            }
            if (showFinal) items(done.take(40), key = { it.id }) { o ->
                OrderCard(o, expanded[o.id] ?: false, { expanded[o.id] = !(expanded[o.id] ?: false) }, vm)
            }
        }
    }
}

// ---------- Tablet: una columna por etapa ----------
@Composable
private fun Board(orders: List<OrderDto>, kind: String, vm: AppController) {
    val expanded = remember { mutableStateMapOf<String, Boolean>() }
    var allFinal by rememberSaveable { mutableStateOf(false) }
    Row(Modifier.fillMaxSize().padding(horizontal = 10.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OrderStage.entries.forEach { stage ->
            val st = stageStyle(stage)
            val col = orders.filter { orderStage(it) == stage }.let {
                if (stage == OrderStage.FINAL) it.sortedByDescending { o -> o.createdAt ?: "" } else it.sortedBy { o -> o.createdAt ?: "" }
            }
            val shown = if (stage == OrderStage.FINAL && !allFinal) col.take(8) else col
            Column(Modifier.weight(if (stage == OrderStage.FINAL) 0.85f else 1f).fillMaxHeight().clip(RoundedCornerShape(14.dp)).background(Surface2.copy(alpha = 0.6f)).padding(8.dp)) {
                Row(Modifier.padding(start = 4.dp, bottom = 8.dp, top = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(10.dp).clip(CircleShape).background(st.accent))
                    Spacer(Modifier.width(6.dp))
                    Text(stageLabel(stage, kind), fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    Text("${col.size}", color = Graphite, fontWeight = FontWeight.Bold)
                }
                LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(bottom = 12.dp)) {
                    items(shown, key = { it.id }) { o ->
                        val default = stage == OrderStage.NUEVO
                        OrderCard(o, expanded[o.id] ?: default, { expanded[o.id] = !(expanded[o.id] ?: default) }, vm)
                    }
                    if (stage == OrderStage.FINAL && col.size > 8) item(key = "more") {
                        TextButton(onClick = { allFinal = !allFinal }) { Text(if (allFinal) "Ver menos" else "Ver ${col.size - 8} más") }
                    }
                }
            }
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
private fun StatusChip(order: OrderDto) {
    val st = stageStyle(orderStage(order))
    Text(
        statusText(order),
        color = st.onSoft, fontSize = 12.sp, fontWeight = FontWeight.Bold,
        modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(st.soft).padding(horizontal = 8.dp, vertical = 3.dp),
    )
}

// ---------- Tarjeta: resumen siempre, detalle al tocarla ----------
@Composable
private fun OrderCard(order: OrderDto, expanded: Boolean, onToggle: () -> Unit, vm: AppController) {
    val stage = orderStage(order)
    val st = stageStyle(stage)
    val step = nextStep(order.status, order.orderType)
    val needsTransferCheck = order.paymentMethod == "transferencia" && order.pagoConfirmado != true && stage != OrderStage.FINAL
    val lines = itemLines(order)
    var confirmCancel by remember { mutableStateOf(false) }

    Card(
        onClick = onToggle,
        shape = RoundedCornerShape(topStart = 4.dp, bottomStart = 4.dp, topEnd = 14.dp, bottomEnd = 14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(Modifier.height(IntrinsicSize.Min)) {
            Box(Modifier.width(5.dp).fillMaxHeight().background(st.accent))
            Column(Modifier.padding(12.dp).weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(order.customerName?.takeIf { it.isNotBlank() } ?: "Sin nombre", fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                    StatusChip(order)
                }
                Spacer(Modifier.height(2.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "${formatAgo(order.createdAt)} · ${lines.size} ${if (lines.size == 1) "ítem" else "ítems"}",
                        color = if (stage == OrderStage.NUEVO) Alert else Graphite,
                        fontWeight = if (stage == OrderStage.NUEVO) FontWeight.Bold else FontWeight.Normal,
                        fontSize = 13.sp, modifier = Modifier.weight(1f),
                    )
                    Text(formatMoney(order.total), fontWeight = FontWeight.Bold)
                }
                if (expanded) {
                    Spacer(Modifier.height(8.dp))
                    order.customerPhone?.takeIf { it.isNotBlank() }?.let { Text(it, color = Fresco, fontWeight = FontWeight.Bold) }
                    order.address?.takeIf { it.isNotBlank() }?.let { Text(it, color = Graphite) }
                    Spacer(Modifier.height(6.dp))
                    lines.forEach { Text(it) }
                    order.notes?.takeIf { it.isNotBlank() }?.let { Text("Nota: $it", color = Brasa, modifier = Modifier.padding(top = 4.dp)) }
                    Spacer(Modifier.height(6.dp))
                    Text(order.paymentMethod ?: "", color = Graphite, fontSize = 13.sp)
                    if (needsTransferCheck) {
                        Spacer(Modifier.height(8.dp))
                        OutlinedButton(onClick = { vm.confirmTransfer(order) }, modifier = Modifier.fillMaxWidth()) { Text("Confirmar transferencia recibida") }
                    }
                    if (step != null) {
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            if (stage == OrderStage.NUEVO) {
                                OutlinedButton(onClick = { confirmCancel = true }) { Text("Rechazar") }
                            }
                            Button(onClick = { vm.advance(order, step.status) }, modifier = Modifier.weight(1f).height(48.dp)) {
                                Text(step.label, fontWeight = FontWeight.Bold)
                            }
                        }
                        if (stage != OrderStage.NUEVO) {
                            TextButton(onClick = { confirmCancel = true }) { Text("Cancelar pedido", color = Alert) }
                        }
                    }
                }
            }
        }
    }
    if (confirmCancel) {
        AlertDialog(
            onDismissRequest = { confirmCancel = false },
            title = { Text(if (stage == OrderStage.NUEVO) "¿Rechazar este pedido?" else "¿Cancelar este pedido?") },
            text = { Text("El pedido de ${order.customerName ?: "este cliente"} pasa a cancelado.") },
            confirmButton = { TextButton(onClick = { confirmCancel = false; vm.cancel(order) }) { Text("Sí, cancelar", color = Alert) } },
            dismissButton = { TextButton(onClick = { confirmCancel = false }) { Text("Volver") } },
        )
    }
}

// ---------- Mesas ----------
@Composable
private fun MesaSection(orders: List<OrderDto>, wide: Boolean, vm: AppController) {
    // Una ficha por mesa con pedido abierto (el más reciente de cada una).
    val tables = orders.filter { orderStage(it) != OrderStage.FINAL }
        .groupBy { it.tableNumber ?: "-" }
        .map { (_, v) -> v.maxByOrNull { it.createdAt ?: "" }!! }
        .sortedWith(compareBy({ orderStage(it).ordinal }, { it.tableNumber ?: "" }))
    var selId by rememberSaveable { mutableStateOf<String?>(null) }
    val sel = tables.firstOrNull { it.id == selId }

    if (tables.isEmpty()) {
        Text("No hay mesas con pedido abierto.", color = Graphite, modifier = Modifier.padding(24.dp))
        return
    }
    if (wide) {
        Row(Modifier.fillMaxSize().padding(horizontal = 10.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.weight(1.3f)) { MesaGrid(tables, 3, sel?.id) { selId = it.id } }
            Box(Modifier.weight(1f).fillMaxHeight()) {
                if (sel != null) MesaDetail(sel, vm, wide = true, onClose = { selId = null })
                else Text("Tocá una mesa para ver el consumo.", color = Graphite, modifier = Modifier.padding(16.dp))
            }
        }
    } else {
        MesaGrid(tables, 2, null) { selId = it.id }
        if (sel != null) {
            Dialog(onDismissRequest = { selId = null }, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
                Surface(Modifier.fillMaxSize(), color = Paper) {
                    Box(Modifier.statusBarsPadding().navigationBarsPadding()) { MesaDetail(sel, vm, wide = false, onClose = { selId = null }) }
                }
            }
        }
    }
}

@Composable
private fun MesaGrid(tables: List<OrderDto>, columns: Int, selectedId: String?, onTap: (OrderDto) -> Unit) {
    LazyVerticalGrid(
        GridCells.Fixed(columns),
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = 6.dp, bottom = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        gridItems(tables, key = { it.id }) { o ->
            val stage = orderStage(o)
            val st = stageStyle(stage)
            val urgent = stage == OrderStage.NUEVO
            val bg = if (urgent) st.accent else st.soft
            val fg = if (urgent) Color.White else st.onSoft
            Card(
                onClick = { onTap(o) },
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = bg),
                border = BorderStroke(if (o.id == selectedId) 3.dp else 1.5.dp, if (o.id == selectedId) Ink else st.accent),
            ) {
                Column(Modifier.padding(12.dp)) {
                    Text(tableLabel(o.tableNumber), color = fg, fontWeight = FontWeight.Black, fontSize = 17.sp)
                    Text(statusText(o), color = fg, fontSize = 13.sp)
                    Text("${formatAgo(o.createdAt)} · ${formatMoney(o.total)}", color = fg, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun MesaDetail(order: OrderDto, vm: AppController, wide: Boolean, onClose: () -> Unit) {
    val stage = orderStage(order)
    val step = nextStep(order.status, order.orderType)
    val needsTransferCheck = order.paymentMethod == "transferencia" && order.pagoConfirmado != true
    var confirmClose by remember { mutableStateOf(false) }
    var confirmCancel by remember { mutableStateOf(false) }
    val lines = itemLines(order)

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (!wide) IconButton(onClick = onClose) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver") }
            Text(tableLabel(order.tableNumber), fontWeight = FontWeight.Black, fontSize = 22.sp, modifier = Modifier.weight(1f))
            StatusChip(order)
        }
        Spacer(Modifier.height(4.dp))
        Text(listOfNotNull(order.customerName, order.customerPhone).joinToString(" · "), color = Graphite)
        Text(formatAgo(order.createdAt), color = Graphite, fontSize = 13.sp)
        Spacer(Modifier.height(14.dp))
        Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
            Column(Modifier.padding(14.dp)) {
                Text("CONSUMO", color = Graphite, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                lines.forEach { Text(it, modifier = Modifier.padding(vertical = 2.dp)) }
                order.notes?.takeIf { it.isNotBlank() }?.let { Text("Nota: $it", color = Brasa, modifier = Modifier.padding(top = 6.dp)) }
                HorizontalDivider(Modifier.padding(vertical = 10.dp))
                Row {
                    Text("Total", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f))
                    Text(formatMoney(order.total), fontWeight = FontWeight.Bold, fontSize = 18.sp)
                }
                Text(order.paymentMethod ?: "", color = Graphite, fontSize = 13.sp)
            }
        }
        if (needsTransferCheck) {
            Spacer(Modifier.height(10.dp))
            OutlinedButton(onClick = { vm.confirmTransfer(order) }, modifier = Modifier.fillMaxWidth()) { Text("Confirmar transferencia recibida") }
        }
        Spacer(Modifier.height(16.dp))
        when {
            step != null -> {
                Button(onClick = { vm.advance(order, step.status) }, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                    Text(step.label, fontWeight = FontWeight.Bold)
                }
                TextButton(onClick = { confirmCancel = true }, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                    Text(if (stage == OrderStage.NUEVO) "Rechazar pedido" else "Cancelar pedido", color = Alert)
                }
            }
            stage == OrderStage.LISTO -> Button(onClick = { confirmClose = true }, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                Text("Confirmar pago y cerrar", fontWeight = FontWeight.Bold)
            }
        }
    }
    if (confirmClose) {
        AlertDialog(
            onDismissRequest = { confirmClose = false },
            title = { Text("¿Confirmar cobro?") },
            text = { Text("Vas a marcar la cuenta de ${order.customerName ?: "la mesa"} como pagada y la mesa quedará libre.") },
            confirmButton = { TextButton(onClick = { confirmClose = false; vm.closeTableOrder(order); onClose() }) { Text("Sí, pago recibido") } },
            dismissButton = { TextButton(onClick = { confirmClose = false }) { Text("Volver") } },
        )
    }
    if (confirmCancel) {
        AlertDialog(
            onDismissRequest = { confirmCancel = false },
            title = { Text("¿Cancelar este pedido?") },
            text = { Text("El pedido de la mesa pasa a cancelado.") },
            confirmButton = { TextButton(onClick = { confirmCancel = false; vm.cancel(order); onClose() }) { Text("Sí, cancelar", color = Alert) } },
            dismissButton = { TextButton(onClick = { confirmCancel = false }) { Text("Volver") } },
        )
    }
}
