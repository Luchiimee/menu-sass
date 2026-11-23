package uno.snappy.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import uno.snappy.app.data.CategoryDto
import uno.snappy.app.data.ExtraDto
import uno.snappy.app.data.ProductDto

private enum class CatalogTab(val label: String) { PRODUCTOS("Productos"), ADICIONALES("Adicionales"), CATEGORIAS("Categorías") }

@Composable
fun ProductsScreen(state: UiState, vm: AppController) {
    var tab by rememberSaveable { mutableStateOf(CatalogTab.PRODUCTOS) }
    var searching by rememberSaveable { mutableStateOf(false) }
    var query by rememberSaveable { mutableStateOf("") }
    var editing by remember { mutableStateOf<ProductDto?>(null) }
    var creating by remember { mutableStateOf(false) }
    var extraDialog by remember { mutableStateOf<ExtraDto?>(null) }
    var newExtra by remember { mutableStateOf(false) }
    var catDialog by remember { mutableStateOf<CategoryDto?>(null) }
    var newCat by remember { mutableStateOf(false) }
    val q = query.trim().lowercase()

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(start = 20.dp, end = 16.dp, top = 28.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("CATÁLOGO", style = MaterialTheme.typography.labelSmall, color = Graphite)
                Text(tab.label, style = MaterialTheme.typography.headlineMedium)
                Text(
                    when (tab) {
                        CatalogTab.PRODUCTOS -> "${state.products.size} productos · ${state.products.count { it.isAvailable == false }} agotados"
                        CatalogTab.ADICIONALES -> "${state.extras.size} adicionales para sumar a los productos"
                        CatalogTab.CATEGORIAS -> "${state.categories.size} categorías del menú"
                    },
                    style = MaterialTheme.typography.bodySmall, color = Graphite,
                )
            }
            Box(
                Modifier.size(46.dp).clip(CircleShape).background(Color.White).border(1.dp, CardBorder, CircleShape)
                    .clickable { searching = !searching; if (!searching) query = "" },
                contentAlignment = Alignment.Center,
            ) { Icon(if (searching) Icons.Filled.Close else Icons.Outlined.Search, contentDescription = "Buscar", tint = Ink) }
            Spacer(Modifier.width(10.dp))
            Box(
                Modifier.size(46.dp).clip(CircleShape).background(Ink).clickable {
                    when (tab) {
                        CatalogTab.PRODUCTOS -> creating = true
                        CatalogTab.ADICIONALES -> newExtra = true
                        CatalogTab.CATEGORIAS -> newCat = true
                    }
                },
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Filled.Add, contentDescription = "Agregar", tint = Color.White) }
        }

        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp).clip(RoundedCornerShape(22.dp))
                .background(Color.White).border(1.dp, CardBorder, RoundedCornerShape(22.dp)).padding(5.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            CatalogTab.entries.forEach { t ->
                val on = t == tab
                Box(
                    Modifier.weight(1f).clip(RoundedCornerShape(18.dp)).background(if (on) Ink else Color.Transparent)
                        .clickable { tab = t }.padding(vertical = 12.dp),
                    contentAlignment = Alignment.Center,
                ) { Text(t.label, color = if (on) Color.White else Graphite, fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 14.sp) }
            }
        }

        if (searching) {
            OutlinedTextField(
                value = query, onValueChange = { query = it }, singleLine = true,
                placeholder = { Text("Buscar") },
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
            )
        }

        when (tab) {
            CatalogTab.PRODUCTOS -> ProductList(state, vm, q, onEdit = { editing = it })
            CatalogTab.ADICIONALES -> {
                val list = state.extras.filter { q.isEmpty() || it.name.lowercase().contains(q) }
                SimpleList(empty = "Todavía no hay adicionales. Tocá + para crear uno.", isEmpty = list.isEmpty()) {
                    items(list, key = { it.id }) { e ->
                        RowCard(
                            title = e.name, subtitle = formatMoney(e.price),
                            onEdit = { extraDialog = e },
                            onDelete = { vm.deleteExtra(e) },
                            deleteTitle = "¿Eliminar este adicional?", deleteText = "Se quita de todos los productos que lo usan.",
                        )
                    }
                }
            }
            CatalogTab.CATEGORIAS -> {
                val list = state.categories.filter { q.isEmpty() || it.name.lowercase().contains(q) }
                SimpleList(empty = "Todavía no hay categorías. Tocá + para crear una.", isEmpty = list.isEmpty()) {
                    items(list, key = { it.id }) { c ->
                        val n = state.products.count { it.categoryId == c.id }
                        RowCard(
                            title = c.name, subtitle = "$n ${if (n == 1) "producto" else "productos"}",
                            onEdit = { catDialog = c },
                            onDelete = { vm.deleteCategory(c) },
                            deleteTitle = "¿Borrar la categoría?", deleteText = "Los productos quedarán sin categoría asignada.",
                        )
                    }
                }
            }
        }
    }

    if (creating) ProductFormDialog(product = null, state = state, vm = vm, onClose = { creating = false })
    editing?.let { p -> ProductFormDialog(product = p, state = state, vm = vm, onClose = { editing = null }) }
    if (newExtra) ExtraDialog(null, vm) { newExtra = false }
    extraDialog?.let { e -> ExtraDialog(e, vm) { extraDialog = null } }
    if (newCat) CategoryDialog(null, vm) { newCat = false }
    catDialog?.let { c -> CategoryDialog(c, vm) { catDialog = null } }
}

@Composable
private fun SimpleList(empty: String, isEmpty: Boolean, content: androidx.compose.foundation.lazy.LazyListScope.() -> Unit) {
    if (isEmpty) Text(empty, color = Graphite, modifier = Modifier.padding(20.dp))
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { content() }
}

@Composable
private fun RowCard(title: String, subtitle: String, onEdit: () -> Unit, onDelete: () -> Unit, deleteTitle: String, deleteText: String) {
    var confirm by remember { mutableStateOf(false) }
    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(20.dp), border = androidx.compose.foundation.BorderStroke(1.dp, CardBorder)) {
        Row(Modifier.fillMaxWidth().padding(start = 16.dp, top = 6.dp, bottom = 6.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(title, fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(subtitle, color = Graphite, style = MaterialTheme.typography.bodySmall)
            }
            IconButton(onClick = onEdit) { Icon(Icons.Outlined.Edit, contentDescription = "Editar") }
            IconButton(onClick = { confirm = true }) { Icon(Icons.Filled.Delete, contentDescription = "Eliminar", tint = Alert) }
        }
    }
    if (confirm) AlertDialog(
        onDismissRequest = { confirm = false },
        title = { Text(deleteTitle) }, text = { Text(deleteText) },
        confirmButton = { TextButton(onClick = { confirm = false; onDelete() }) { Text("Eliminar", color = Alert) } },
        dismissButton = { TextButton(onClick = { confirm = false }) { Text("Cancelar") } },
    )
}

@Composable
private fun ProductList(state: UiState, vm: AppController, q: String, onEdit: (ProductDto) -> Unit) {
    var filterCat by remember { mutableStateOf<String?>(null) }
    val products = state.products.filter { (q.isEmpty() || it.name.lowercase().contains(q)) && (filterCat == null || it.categoryId == filterCat) }
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf<Pair<String?, String>>(null to "Todos").plus(state.categories.map { it.id to it.name }).forEach { (id, label) ->
            val on = filterCat == id
            Box(
                Modifier.clip(RoundedCornerShape(50)).background(if (on) Ink else Color.White).border(1.dp, if (on) Ink else CardBorder, RoundedCornerShape(50)).clickable { filterCat = id }.padding(horizontal = 16.dp, vertical = 9.dp),
            ) { Text(label, color = if (on) Color.White else Ink, fontWeight = FontWeight.SemiBold, fontSize = 14.sp) }
        }
    }
    Text("Tocá el lápiz para editar o el interruptor para marcar agotado.", color = Graphite, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(start = 20.dp, end = 16.dp, top = 6.dp, bottom = 2.dp))
    BestSellersRow(state, vm)
    if (state.products.isEmpty()) Text("Todavía no hay productos cargados.", color = Graphite, modifier = Modifier.padding(20.dp))
    else if (products.isEmpty()) Text("No hay productos con \"$q\".", color = Graphite, modifier = Modifier.padding(20.dp))

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        val categories = state.categories
        val grouped = products.groupBy { it.categoryId }
        val order = categories.map { it.id } + (grouped.keys - categories.map { it.id }.toSet())
        order.forEach { catId ->
            val items = grouped[catId].orEmpty()
            if (items.isNotEmpty()) {
                items(items, key = { it.id }) { p -> ProductRow(p, categories.firstOrNull { it.id == p.categoryId }?.name, onToggle = { vm.setAvailable(p, it) }, onEdit = { onEdit(p) }) }
            }
        }
    }
}

@Composable
private fun BestSellersRow(state: UiState, vm: AppController) {
    var info by remember { mutableStateOf(false) }
    val on = state.restaurant?.showBestSellers == true
    val supported = state.restaurant?.templateId in setOf("marketpro", "alterna-pro", "spotlight", "urban", "classic", "minimal")
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp).clip(RoundedCornerShape(22.dp)).background(Color.White).border(1.dp, CardBorder, RoundedCornerShape(22.dp)).padding(horizontal = 16.dp, vertical = 8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("⚡", fontSize = 18.sp)
            Text("  Más pedidos", fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
            IconButton(onClick = { info = !info }, modifier = Modifier.size(36.dp)) {
                Icon(androidx.compose.material.icons.Icons.Filled.Info, contentDescription = "Qué es esto", tint = Graphite)
            }
            Switch(checked = on, onCheckedChange = vm::setBestSellers, colors = snappySwitchColors())
        }
        if (info) Text(
            "Muestra arriba de tu menú una sección con los productos que más se piden. La calcula el sistema con tus pedidos reales y aparece a los 30 días de activarla." +
                if (supported) "" else " Ojo: tu plantilla actual no muestra esta sección.",
            style = MaterialTheme.typography.bodySmall, color = Graphite, modifier = Modifier.padding(bottom = 6.dp),
        )
    }
}

@Composable
private fun ProductRow(p: ProductDto, categoryName: String?, onToggle: (Boolean) -> Unit, onEdit: () -> Unit) {
    val available = p.isAvailable != false
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Color.White).border(1.dp, CardBorder, RoundedCornerShape(22.dp)).padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AsyncImage(
            model = p.imageUrl, contentDescription = null, contentScale = ContentScale.Crop,
            modifier = Modifier.size(64.dp).clip(RoundedCornerShape(16.dp)).background(Surface2),
        )
        Column(Modifier.weight(1f).padding(horizontal = 14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (p.esDestacado == true) {
                    Icon(Icons.Filled.Star, contentDescription = "Destacado", tint = Color(0xFFC9A24B), modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(5.dp))
                }
                Text(
                    p.name, fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 17.sp, maxLines = 2,
                    color = if (available) Ink else Graphite,
                    textDecoration = if (available) null else androidx.compose.ui.text.style.TextDecoration.LineThrough,
                )
            }
            Text(
                formatMoney(p.price) + (if (p.saleType == "peso") "/kg" else "") + (if (categoryName != null) "  ·  $categoryName" else ""),
                color = Graphite, style = MaterialTheme.typography.bodySmall, maxLines = 1,
            )
        }
        Box(
            Modifier.size(42.dp).clip(CircleShape).background(Surface2).clickable(onClick = onEdit),
            contentAlignment = Alignment.Center,
        ) { Icon(Icons.Outlined.Edit, contentDescription = "Editar producto", tint = Ink, modifier = Modifier.size(19.dp)) }
        Spacer(Modifier.width(8.dp))
        Switch(checked = available, onCheckedChange = onToggle, colors = snappySwitchColors())
    }
}

@Composable
private fun ExtraDialog(extra: ExtraDto?, vm: AppController, onClose: () -> Unit) {
    var name by remember { mutableStateOf(extra?.name ?: "") }
    var price by remember { mutableStateOf(extra?.price?.let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() } ?: "") }
    val amount = price.replace(',', '.').toDoubleOrNull()
    AlertDialog(
        onDismissRequest = onClose,
        title = { Text(if (extra == null) "Nuevo adicional" else "Editar adicional") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("Nombre") }, placeholder = { Text("Ej: Cheddar extra") }, singleLine = true)
                OutlinedTextField(
                    price, { price = it }, label = { Text("Precio") }, prefix = { Text("$ ") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                )
            }
        },
        confirmButton = {
            TextButton(enabled = name.isNotBlank() && amount != null, onClick = { vm.saveExtra(extra?.id, name, amount ?: 0.0, onClose) }) { Text("Guardar") }
        },
        dismissButton = { TextButton(onClick = onClose) { Text("Cancelar") } },
    )
}

@Composable
private fun CategoryDialog(category: CategoryDto?, vm: AppController, onClose: () -> Unit) {
    var name by remember { mutableStateOf(category?.name ?: "") }
    AlertDialog(
        onDismissRequest = onClose,
        title = { Text(if (category == null) "Nueva categoría" else "Editar categoría") },
        text = { OutlinedTextField(name, { name = it }, label = { Text("Nombre") }, placeholder = { Text("Ej: Hamburguesas") }, singleLine = true) },
        confirmButton = { TextButton(enabled = name.isNotBlank(), onClick = { vm.saveCategory(category?.id, name, onClose) }) { Text("Guardar") } },
        dismissButton = { TextButton(onClick = onClose) { Text("Cancelar") } },
    )
}
