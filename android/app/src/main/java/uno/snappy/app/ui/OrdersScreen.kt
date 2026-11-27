package uno.snappy.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.material.icons.outlined.LocalShipping
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material.icons.outlined.TableRestaurant
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
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Print
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
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
import uno.snappy.app.data.ProductDto
import uno.snappy.app.data.TableDto
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

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(state: UiState, vm: AppController) {
    var refreshing by remember { mutableStateOf(false) }
    val refreshScope = rememberCoroutineScope()
    val orders = state.orders.filter { it.orderType != "apertura" }
    // El salón es del plan plus; si ya hay un pedido de mesa, la pestaña aparece igual.
    val hasSalon = state.restaurant?.subscriptionPlan == "plus" || orders.any { it.orderType == "mesa" }
    val tabs = if (hasSalon) OrderTab.entries.toList() else listOf(OrderTab.DELIVERY, OrderTab.RETIRO)
    var selected by remember { mutableStateOf(OrderTab.entries.firstOrNull { it.kind == state.ordersKind } ?: OrderTab.DELIVERY) }
    val tab = if (selected in tabs) selected else OrderTab.DELIVERY
    androidx.compose.runtime.LaunchedEffect(state.focusKind) {
        state.focusKind?.let { k -> OrderTab.entries.firstOrNull { it.kind == k }?.let { selected = it } }
        if (state.focusKind != null) vm.focusConsumed()
    }
    val list = orders.filter { orderKind(it) == tab.kind }
    var searching by rememberSaveable { mutableStateOf(false) }
    var query by rememberSaveable { mutableStateOf("") }
    val q = query.trim().lowercase()
    val results = if (q.isEmpty()) emptyList() else orders.filter {
        (it.customerName ?: "").lowercase().contains(q) ||
            (it.customerPhone ?: "").contains(q) ||
            it.id.lowercase().startsWith(q.removePrefix("#"))
    }

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val wide = maxWidth >= 720.dp
        Column(Modifier.fillMaxSize()) {
            Header(state, vm)
            if (state.ringing) RingingBanner(vm)
            TypeTabs(
                tabs = tabs,
                selected = tab,
                pendingOf = { t -> orders.count { orderKind(it) == t.kind && orderStage(it) == OrderStage.NUEVO } },
                dotOf = { t ->
                    val open = orders.filter { orderKind(it) == t.kind }.map { orderStage(it) }
                    when {
                        t == OrderTab.MESA && state.tables.any { it.needsAttention == true } -> Alert
                        t == OrderTab.MESA && orders.any { orderKind(it) == OrderTab.MESA.kind && it.paymentStatus == "esperando_confirmacion" && orderStage(it) != OrderStage.FINAL } -> Brasa
                        OrderStage.LISTO in open -> stageStyle(OrderStage.LISTO).accent
                        OrderStage.COCINA in open -> stageStyle(OrderStage.COCINA).accent
                        else -> null
                    }
                },
                onSelect = { selected = it; vm.rememberOrdersKind(it.kind) },
                searching = searching,
                onSearch = { searching = !searching; if (!searching) query = "" },
            )
            if (!searching) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp).height(48.dp)
                        .clip(RoundedCornerShape(16.dp)).background(Color.White).border(1.dp, CardBorder, RoundedCornerShape(16.dp))
                        .clickable { searching = true }.padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Filled.Search, contentDescription = null, tint = Graphite, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(10.dp))
                    Text("Buscar por nombre o teléfono", color = Graphite)
                }
            }
            if (searching) {
                OutlinedTextField(
                    value = query, onValueChange = { query = it }, singleLine = true,
                    placeholder = { Text("Buscar por nombre o teléfono") },
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                    trailingIcon = { IconButton(onClick = { query = ""; searching = false }) { Icon(Icons.Filled.Close, contentDescription = "Cerrar búsqueda") } },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
                )
            }
            androidx.compose.material3.pulltorefresh.PullToRefreshBox(
                isRefreshing = refreshing,
                onRefresh = { refreshing = true; refreshScope.launch { vm.resyncNow(); refreshing = false } },
                modifier = Modifier.weight(1f).fillMaxWidth(),
            ) {
            when {
                searching && q.isNotEmpty() ->
                    // Resultados de todos los tipos, con los finalizados incluidos.
                    if (results.isEmpty()) Text("No hay pedidos de \"${query.trim()}\".", color = Graphite, modifier = Modifier.padding(24.dp))
                    else OrderList(results, vm, foldFinal = false, showKind = true)
                tab == OrderTab.MESA -> MesaSection(list, wide, vm, state)
                wide -> Board(list, tab.kind, vm)
                else -> OrderList(list, vm)
            }
            }
        }
    }
}

@Composable
private fun Header(state: UiState, vm: AppController) {
    val open = state.restaurant?.isOpen == true
    val name = state.restaurant?.name ?: "Mi local"
    val initials = name.split(" ").filter { it.isNotBlank() }.take(2).joinToString("") { it.first().uppercase() }.ifEmpty { "S" }
    Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        val logo = state.restaurant?.logoUrl
        Box(Modifier.size(48.dp).clip(RoundedCornerShape(14.dp)).background(Ink), contentAlignment = Alignment.Center) {
            if (!logo.isNullOrBlank()) coil.compose.AsyncImage(model = logo, contentDescription = null, contentScale = androidx.compose.ui.layout.ContentScale.Crop, modifier = Modifier.fillMaxSize())
            else Text(initials, color = Color.White, fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 17.sp)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(name, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, maxLines = 1)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(7.dp).clip(CircleShape).background(if (open) Fresco else Graphite))
                Spacer(Modifier.width(6.dp))
                Text(if (open) "Abierto · recibiendo pedidos" else "Cerrado · no recibís pedidos", color = Graphite, style = MaterialTheme.typography.bodySmall)
            }
        }
        Switch(checked = open, onCheckedChange = vm::setOpen, colors = snappySwitchColors())
    }
}

@Composable
private fun RingingBanner(vm: AppController) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp).clip(RoundedCornerShape(16.dp)).background(Alert).padding(start = 16.dp, end = 8.dp, top = 6.dp, bottom = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("Pedido nuevo sin atender", modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold, color = Color.White)
        Button(onClick = vm::silence, colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Ink)) { Text("Silenciar") }
    }
}

@Composable
private fun TypeTabs(tabs: List<OrderTab>, selected: OrderTab, pendingOf: (OrderTab) -> Int, dotOf: (OrderTab) -> Color?, onSelect: (OrderTab) -> Unit, searching: Boolean, onSearch: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp).clip(RoundedCornerShape(22.dp))
            .background(Surface2).padding(5.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        tabs.forEach { t ->
            val on = t == selected
            val pending = pendingOf(t)
            Row(
                Modifier.weight(1f).clip(RoundedCornerShape(18.dp)).background(if (on) Ink else Color.Transparent).clickable { onSelect(t) }.padding(vertical = 12.dp),
                horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    when (t) { OrderTab.DELIVERY -> Icons.Outlined.LocalShipping; OrderTab.RETIRO -> Icons.Outlined.ShoppingBag; OrderTab.MESA -> Icons.Outlined.TableRestaurant },
                    contentDescription = null, modifier = Modifier.size(18.dp),
                    tint = if (on) Color.White else when (t) { OrderTab.DELIVERY -> Fresco; OrderTab.RETIRO -> Color(0xFF378ADD); OrderTab.MESA -> Color(0xFFEF9F27) },
                )
                Spacer(Modifier.width(6.dp))
                Text(t.label, color = if (on) Color.White else Graphite, fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                // Sin numerito: un punto de color avisa que hay algo abierto en esa solapa (en cocina, listo/servida o llamando al mozo)
                val dot = if (pending == 0) dotOf(t) else null
                if (dot != null) {
                    Spacer(Modifier.width(7.dp))
                    // Rojo = llaman al mozo: titila para que no se pase
                    Box(Modifier.size(11.dp).alpha(if (dot == Alert) blinkAlpha() else 1f).clip(CircleShape).background(dot))
                }
                if (pending > 0) {
                    Spacer(Modifier.width(6.dp))
                    Box(Modifier.size(20.dp).clip(CircleShape).background(Alert), contentAlignment = Alignment.Center) {
                        Text(
                            "$pending", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold,
                            style = androidx.compose.ui.text.TextStyle(
                                platformStyle = androidx.compose.ui.text.PlatformTextStyle(includeFontPadding = false),
                                lineHeightStyle = androidx.compose.ui.text.style.LineHeightStyle(
                                    androidx.compose.ui.text.style.LineHeightStyle.Alignment.Center,
                                    androidx.compose.ui.text.style.LineHeightStyle.Trim.Both,
                                ),
                            ),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StageHeader(stage: OrderStage, kind: String, count: Int) {
    val st = stageStyle(stage)
    Row(
        Modifier.fillMaxWidth().padding(top = 6.dp).clip(RoundedCornerShape(16.dp)).background(st.soft).padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(9.dp).clip(CircleShape).background(st.accent))
        Spacer(Modifier.width(8.dp))
        Text(stageLabel(stage, kind), color = st.onSoft, fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 15.sp, modifier = Modifier.weight(1f))
        Text("$count", color = st.onSoft, fontWeight = FontWeight.Bold)
    }
}

// Orden: sin atender primero (el más viejo arriba), después cocina, listos. Los finalizados van aparte.
private val openOrder = compareBy<OrderDto>({ orderStage(it).ordinal }, { it.createdAt ?: "" })

// ---------- Celular: una lista, con los finalizados plegados al final ----------
@Composable
private fun OrderList(orders: List<OrderDto>, vm: AppController, foldFinal: Boolean = true, showKind: Boolean = false) {
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
        val kindForLabel = if (showKind) "delivery" else (orders.firstOrNull()?.let { orderKind(it) } ?: "delivery")
        listOf(OrderStage.NUEVO, OrderStage.COCINA, OrderStage.LISTO).forEach { stg ->
            val inStage = open.filter { orderStage(it) == stg }
            if (inStage.isNotEmpty()) {
                item(key = "hdr-$stg") { StageHeader(stg, kindForLabel, inStage.size) }
                items(inStage, key = { it.id }) { o ->
                    val default = orderStage(o) == OrderStage.NUEVO
                    OrderCard(o, expanded[o.id] ?: default, { expanded[o.id] = !(expanded[o.id] ?: default) }, vm, showKind)
                }
            }
        }
        if (done.isNotEmpty() && !foldFinal) {
            items(done.take(60), key = { it.id }) { o ->
                OrderCard(o, expanded[o.id] ?: false, { expanded[o.id] = !(expanded[o.id] ?: false) }, vm, showKind)
            }
        } else if (done.isNotEmpty()) {
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
internal data class ItemLine(val qty: String, val name: String, val total: Double?, val extras: List<String>)

private fun primitive(o: JsonObject, key: String): String? = o[key]?.let { runCatching { it.jsonPrimitive.content }.getOrNull() }?.takeIf { it != "null" }

internal fun itemLines(order: OrderDto): List<ItemLine> {
    val arr = order.items as? JsonArray ?: return emptyList()
    return arr.mapNotNull { el ->
        val o = el as? JsonObject ?: return@mapNotNull null
        val name = listOf("name", "title", "product_name").firstNotNullOfOrNull { primitive(o, it) } ?: return@mapNotNull null
        val qty = listOf("quantity", "qty", "cantidad").firstNotNullOfOrNull { primitive(o, it) } ?: "1"
        var extraSum = 0.0
        val extras = (o["extrasList"] as? JsonArray)?.mapNotNull { e ->
            val eo = e as? JsonObject ?: return@mapNotNull null
            val en = primitive(eo, "name") ?: return@mapNotNull null
            val eq = primitive(eo, "quantity")?.toDoubleOrNull() ?: 1.0
            extraSum += (primitive(eo, "price")?.toDoubleOrNull() ?: 0.0) * eq
            if (eq > 1) "+ ${eq.toInt()} x $en" else "+ $en"
        } ?: emptyList()
        val total = primitive(o, "price")?.toDoubleOrNull()?.let { (it + extraSum) * (qty.toDoubleOrNull() ?: 1.0) }
        ItemLine(qty, name, total, extras)
    }
}

private fun orderNote(order: OrderDto): String? =
    order.description?.takeIf { it.isNotBlank() } ?: order.notes?.takeIf { it.isNotBlank() }

private fun scheduledLabel(order: OrderDto): String? {
    if (order.orderType == "mesa") return null
    val s = order.scheduledDeliveryTime?.trim().orEmpty()
    return if (s.isEmpty() || s.equals("Inmediato", ignoreCase = true)) null else s
}

// Teléfonos de Argentina guardados como los escribe el cliente (0 + área + número, o con 15) → número de WhatsApp (549 + área + número).
private fun whatsappUrl(phone: String): String? {
    var d = phone.filter { it.isDigit() }
    if (d.isEmpty()) return null
    if (d.startsWith("54")) {
        if (!d.startsWith("549") && d.length == 12) d = "549" + d.drop(2)
        return "https://wa.me/$d"
    }
    d = d.trimStart('0')
    if (d.length == 12) {
        for (a in 2..4) if (d.substring(a, a + 2) == "15") { d = d.removeRange(a, a + 2); break }
    }
    if (d.length == 10) d = "549$d"
    return "https://wa.me/$d"
}

@Composable
private fun PhoneRow(phone: String) {
    val uri = LocalUriHandler.current
    val url = whatsappUrl(phone)
    if (url == null) { Text(phone, color = Fresco, fontWeight = FontWeight.Bold); return }
    OutlinedButton(
        onClick = { runCatching { uri.openUri(url) } },
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Fresco),
        modifier = Modifier.fillMaxWidth().height(44.dp),
    ) {
        Icon(Icons.Filled.Chat, contentDescription = null, tint = Fresco, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text("Chatear por WhatsApp · $phone", color = Fresco, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun ItemsBlock(lines: List<ItemLine>) {
    lines.forEach { l ->
        Row(Modifier.padding(vertical = 2.dp)) {
            Text("${l.qty} x ${l.name}", fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
            l.total?.let { Text(formatMoney(it), color = Graphite) }
        }
        l.extras.forEach { Text(it, color = Graphite, fontSize = 13.sp, modifier = Modifier.padding(start = 12.dp)) }
    }
}

@Composable
private fun BreakRow(label: String, value: String, color: Color) {
    Row { Text(label, color = color, fontSize = 13.sp, modifier = Modifier.weight(1f)); Text(value, color = color, fontSize = 13.sp) }
}

internal data class Totals(val subtotal: Double, val descuento: Double, val envio: Double)

// Mismos números que el panel web: el total guardado manda y el descuento se completa por diferencia.
internal fun orderTotals(order: OrderDto, lines: List<ItemLine>): Totals? {
    val total = order.total ?: return null
    val subtotal = lines.sumOf { it.total ?: 0.0 }
    val envio = (order.deliveryCost ?: 0.0).coerceAtLeast(0.0)
    val saved = order.discountAmount ?: 0.0
    val diff = (subtotal + envio - total).coerceAtLeast(0.0)
    val desc = if (saved > 0) maxOf(saved, diff) else diff
    if (subtotal <= 0 || (desc <= 0 && envio <= 0)) return null
    return Totals(subtotal, desc, envio)
}

@Composable
private fun TotalsBreakdown(order: OrderDto, lines: List<ItemLine>) {
    val t = orderTotals(order, lines) ?: return
    Column(Modifier.padding(top = 6.dp)) {
        BreakRow("Subtotal", formatMoney(t.subtotal), Graphite)
        if (t.descuento > 0) BreakRow(order.couponCode?.takeIf { it.isNotBlank() }?.let { "Descuento (cupón ${it.uppercase()})" } ?: "Descuento", "−" + formatMoney(t.descuento), Fresco)
        if (t.envio > 0) BreakRow("Envío", "+" + formatMoney(t.envio), Graphite)
    }
}

@Composable
private fun PrintButton(order: OrderDto, vm: AppController) {
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val r = vm.state.value.restaurant
    val locked = r?.subscriptionPlan == "light"
    val paper = PrintPrefs.paper(ctx)
    OutlinedButton(
        onClick = {
            if (locked) android.widget.Toast.makeText(ctx, "Imprimir comandas está disponible en los planes GO y Plus.", android.widget.Toast.LENGTH_LONG).show()
            else printTicket(ctx, r?.name ?: "Mi local", order)
        },
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth().height(44.dp),
    ) {
        Icon(Icons.Filled.Print, contentDescription = null, tint = if (locked) Graphite else Ink, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(if (locked) "Imprimir comanda (planes GO y Plus)" else "Imprimir comanda", color = if (locked) Graphite else Ink, fontWeight = FontWeight.SemiBold)
    }
    if (!locked) {
        Spacer(Modifier.height(6.dp))
        TextButton(onClick = { vm.openMore("impresion") }, modifier = Modifier.fillMaxWidth()) {
            Text("Papel: " + (if (paper == "4x6") "A6" else "hoja A4") + " · Configurar impresión", color = Graphite, fontSize = 13.sp)
        }
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
private fun OrderCard(order: OrderDto, expanded: Boolean, onToggle: () -> Unit, vm: AppController, showKind: Boolean = false) {
    val stage = orderStage(order)
    val st = stageStyle(stage)
    val step = nextStep(order.status, order.orderType)
    val needsTransferCheck = order.paymentMethod == "transferencia" && order.pagoConfirmado != true && stage != OrderStage.FINAL
    val lines = itemLines(order)
    var confirmCancel by remember { mutableStateOf(false) }

    Card(
        onClick = onToggle,
        shape = RoundedCornerShape(topStart = 6.dp, bottomStart = 6.dp, topEnd = 18.dp, bottomEnd = 18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(Modifier.height(IntrinsicSize.Min)) {
            Box(Modifier.width(5.dp).fillMaxHeight().background(st.accent))
            Column(Modifier.padding(12.dp).weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(order.customerName?.takeIf { it.isNotBlank() } ?: "Sin nombre", fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 17.sp, modifier = Modifier.weight(1f))
                    StatusChip(order)
                }
                Spacer(Modifier.height(2.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        (if (showKind) (if (order.orderType == "mesa") tableLabel(order.tableNumber) else if (order.orderType == "retiro") "Retiro" else "Delivery") + " · " else "") +
                            "${formatAgo(order.createdAt)} · ${lines.size} ${if (lines.size == 1) "ítem" else "ítems"}" + (scheduledLabel(order)?.let { " · Para las $it" } ?: ""),
                        color = if (stage == OrderStage.NUEVO) Alert else Graphite,
                        fontWeight = if (stage == OrderStage.NUEVO) FontWeight.Bold else FontWeight.Normal,
                        fontSize = 13.sp, modifier = Modifier.weight(1f),
                    )
                    Text(formatMoney(order.total), fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
                if (expanded) {
                    Spacer(Modifier.height(8.dp))
                    order.customerPhone?.takeIf { it.isNotBlank() }?.let { PhoneRow(it); Spacer(Modifier.height(6.dp)) }
                    if (order.orderType != "mesa") {
                        val sched = scheduledLabel(order)
                        Text(
                            if (sched != null) "Programado para las $sched" else if (order.orderType == "delivery") "Enviar lo antes posible" else "Retiro lo antes posible",
                            color = if (sched != null) Fresco else Graphite, fontWeight = if (sched != null) FontWeight.Bold else FontWeight.Normal, fontSize = 13.sp,
                        )
                    }
                    order.address?.takeIf { it.isNotBlank() }?.let { Text(it, color = Graphite) }
                    Spacer(Modifier.height(6.dp))
                    ItemsBlock(lines)
                    orderNote(order)?.let { Text("Nota: $it", color = Brasa, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp)) }
                    TotalsBreakdown(order, lines)
                    Spacer(Modifier.height(6.dp))
                    Text("Pago: ${order.paymentMethod ?: "-"}", color = Graphite, fontSize = 13.sp)
                    Spacer(Modifier.height(8.dp))
                    PrintButton(order, vm)
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
// Una mesa del salón: con su pedido abierto (si lo hay) y si está llamando al mozo.
private data class MesaEntry(val name: String, val table: TableDto?, val order: OrderDto?) {
    val calling get() = table?.needsAttention == true
    // Pidió la cuenta desde el celu del cliente (espera que el negocio confirme el cobro)
    val billing get() = order?.paymentStatus == "esperando_confirmacion"
    val stage get() = order?.let { orderStage(it) }
}

@Composable
private fun MesaSection(orders: List<OrderDto>, wide: Boolean, vm: AppController, state: UiState) {
    val open = orders.filter { orderStage(it) != OrderStage.FINAL }
        .groupBy { it.tableNumber ?: "-" }
        .mapValues { (_, v) -> v.maxByOrNull { it.createdAt ?: "" }!! }
    // Todas las mesas del local, más cualquier pedido abierto de una mesa que ya no exista en la lista.
    val entries = (state.tables.map { MesaEntry(it.name, it, open[it.name]) } +
        open.filterKeys { k -> state.tables.none { it.name == k } }.map { (k, o) -> MesaEntry(k, null, o) })
        .sortedWith(compareBy({ if (it.calling) 0 else if (it.billing) 1 else 2 }, { it.stage?.ordinal ?: 9 }, { it.name }))
    var selName by rememberSaveable { mutableStateOf<String?>(null) }
    val sel = entries.firstOrNull { it.name == selName }

    if (entries.isEmpty()) {
        Text("Todavía no hay mesas. Se crean desde el panel web.", color = Graphite, modifier = Modifier.padding(24.dp))
        return
    }
    if (wide) {
        Row(Modifier.fillMaxSize().padding(horizontal = 10.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.weight(1.3f)) { MesaGrid(entries, 3, sel?.name) { selName = it.name } }
            Box(Modifier.weight(1f).fillMaxHeight()) {
                if (sel != null) MesaDetail(sel, vm, state.products, wide = true, onClose = { selName = null })
                else Text("Tocá una mesa para ver el consumo.", color = Graphite, modifier = Modifier.padding(16.dp))
            }
        }
    } else {
        MesaGrid(entries, 2, null) { selName = it.name }
        if (sel != null) {
            Dialog(onDismissRequest = { selName = null }, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
                Surface(Modifier.fillMaxSize(), color = Paper) {
                    Box(Modifier.statusBarsPadding().navigationBarsPadding()) { MesaDetail(sel, vm, state.products, wide = false, onClose = { selName = null }) }
                }
            }
        }
    }
}

@Composable
private fun MesaGrid(entries: List<MesaEntry>, columns: Int, selectedName: String?, onTap: (MesaEntry) -> Unit) {
    LazyVerticalGrid(
        GridCells.Fixed(columns),
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = 6.dp, bottom = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        gridItems(entries, key = { it.name }) { e ->
            val stage = e.stage
            val st = stageStyle(stage ?: OrderStage.FINAL)
            val urgent = e.calling || stage == OrderStage.NUEVO
            val bill = e.billing && !urgent
            // Mesa abierta a mano que todavía no pidió nada: no está "en cocina".
            val empty = e.order != null && !urgent && itemLines(e.order).isEmpty()
            val bg = when {
                urgent -> Alert
                bill -> Brasa
                empty -> Color(0xFFE3F6EE)
                stage == null -> Color.White
                else -> st.soft
            }
            val fg = when {
                urgent || bill -> Color.White
                empty -> Color(0xFF0B5A3C)
                stage == null -> Ink
                else -> st.onSoft
            }
            val border = when {
                urgent -> Alert
                bill -> Brasa
                empty -> Fresco
                stage == null -> Color(0xFFE2E2D8)
                else -> st.accent
            }
            val subtitle = when {
                e.calling -> "Llama al mozo"
                bill -> "Pide la cuenta" + (e.order?.paymentMethod?.let { " · $it" } ?: "")
                e.order == null -> "Libre"
                empty -> "Abierta · sin consumo"
                else -> statusText(e.order)
            }
            Card(
                onClick = { onTap(e) },
                modifier = if (e.calling) Modifier.alpha(blinkAlpha()) else Modifier,
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = bg),
                border = BorderStroke(if (e.name == selectedName) 3.dp else 1.5.dp, if (e.name == selectedName) Ink else border),
            ) {
                Column(Modifier.padding(14.dp)) {
                    Text(tableLabel(e.name), color = fg, fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                    Spacer(Modifier.height(2.dp))
                    Text(subtitle, color = fg, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                    if (e.order != null) Text("${formatAgo(e.order.createdAt)} · ${formatMoney(e.order.total)}", color = fg.copy(alpha = 0.85f), fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun MesaDetail(entry: MesaEntry, vm: AppController, products: List<ProductDto>, wide: Boolean, onClose: () -> Unit) {
    val order = entry.order
    val stage = order?.let { orderStage(it) }
    val step = order?.let { nextStep(it.status, it.orderType) }
    val needsTransferCheck = order != null && order.paymentMethod == "transferencia" && order.pagoConfirmado != true
    var confirmClose by remember { mutableStateOf(false) }
    var confirmCancel by remember { mutableStateOf(false) }
    var adding by remember { mutableStateOf(false) }
    val lines = order?.let { itemLines(it) } ?: emptyList()

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (!wide) IconButton(onClick = onClose) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver") }
            Text(tableLabel(entry.name), fontWeight = FontWeight.Black, fontSize = 22.sp, modifier = Modifier.weight(1f))
            if (order != null) StatusChip(order)
        }
        if (entry.calling && entry.table != null) {
            Spacer(Modifier.height(8.dp))
            Button(
                onClick = { vm.resetAttention(entry.table) },
                colors = ButtonDefaults.buttonColors(containerColor = Alert, contentColor = Color.White),
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) { Text("Atendido: apagar llamado", fontWeight = FontWeight.Bold) }
        }
        if (order != null && order.paymentStatus == "esperando_confirmacion") {
            Spacer(Modifier.height(8.dp))
            Card(colors = CardDefaults.cardColors(containerColor = Brasa), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp)) {
                    Text("Pide la cuenta", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                    Text(
                        listOfNotNull(
                            order.paymentMethod?.let { "Paga con $it" },
                            order.payerName?.takeIf { it.isNotBlank() }?.let { "a nombre de $it" },
                            formatMoney(order.total),
                        ).joinToString(" · "),
                        color = Color.White, fontSize = 14.sp,
                    )
                }
            }
        }
        if (order == null) {
            Spacer(Modifier.height(16.dp))
            Text("Mesa libre.", color = Graphite)
            Spacer(Modifier.height(12.dp))
            if (entry.table != null) {
                Button(onClick = { vm.openTable(entry.table) }, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                    Text("Abrir mesa", fontWeight = FontWeight.Bold)
                }
            }
            return@Column
        }
        Spacer(Modifier.height(4.dp))
        Text(listOfNotNull(order.customerName, order.customerPhone?.takeIf { it.isNotBlank() }).joinToString(" · "), color = Graphite)
        Text(formatAgo(order.createdAt), color = Graphite, fontSize = 13.sp)
        Spacer(Modifier.height(14.dp))
        Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
            Column(Modifier.padding(14.dp)) {
                Text("CONSUMO", color = Graphite, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                if (lines.isEmpty()) Text("Todavía no hay productos.", color = Graphite)
                ItemsBlock(lines)
                orderNote(order)?.let { Text("Nota: $it", color = Brasa, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp)) }
                HorizontalDivider(Modifier.padding(vertical = 10.dp))
                Row {
                    Text("Total", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f))
                    Text(formatMoney(order.total), fontWeight = FontWeight.Bold, fontSize = 18.sp)
                }
                Text(order.paymentMethod ?: "", color = Graphite, fontSize = 13.sp)
            }
        }
        Spacer(Modifier.height(10.dp))
        PrintButton(order, vm)
        if (stage != OrderStage.FINAL) {
            Spacer(Modifier.height(10.dp))
            OutlinedButton(onClick = { adding = true }, modifier = Modifier.fillMaxWidth().height(48.dp)) { Text("Agregar producto") }
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
    if (order == null) return
    if (adding) AddProductDialog(products, onAdd = { vm.addProductToOrder(order, it) }, onClose = { adding = false })
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

// Elegir productos del catálogo para sumar al consumo (de a uno; queda abierto para sumar varios).
@Composable
private fun AddProductDialog(products: List<ProductDto>, onAdd: (ProductDto) -> Unit, onClose: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var added by remember { mutableStateOf<String?>(null) }
    val list = products.filter { it.isAvailable != false && it.price != null && it.name.contains(query.trim(), ignoreCase = true) }
    AlertDialog(
        onDismissRequest = onClose,
        title = { Text("Agregar producto") },
        text = {
            Column {
                OutlinedTextField(
                    value = query, onValueChange = { query = it }, singleLine = true, placeholder = { Text("Buscar") },
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) }, modifier = Modifier.fillMaxWidth(),
                )
                added?.let { Text("Agregado: $it", color = Fresco, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 6.dp)) }
                LazyColumn(Modifier.height(280.dp).padding(top = 6.dp)) {
                    items(list, key = { it.id }) { p ->
                        Row(
                            Modifier.fillMaxWidth().clickable { onAdd(p); added = p.name }.padding(vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(p.name, modifier = Modifier.weight(1f))
                            Text(formatMoney(p.price), fontWeight = FontWeight.Bold)
                        }
                        HorizontalDivider()
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onClose) { Text("Listo") } },
    )
}


@Composable
private fun blinkAlpha(): Float {
    val t = rememberInfiniteTransition(label = "blink")
    val a by t.animateFloat(1f, 0.35f, infiniteRepeatable(tween(650), RepeatMode.Reverse), label = "a")
    return a
}
