package uno.snappy.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import uno.snappy.app.data.ProductDto

@Composable
fun ProductsScreen(state: UiState, vm: AppViewModel) {
    var editing by remember { mutableStateOf<ProductDto?>(null) }

    Column(Modifier.fillMaxSize()) {
        Text("Catálogo", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black, modifier = Modifier.padding(16.dp))
        if (state.products.isEmpty()) Text("Todavía no hay productos cargados.", color = Graphite, modifier = Modifier.padding(16.dp))

        LazyColumn(Modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            val categories = state.categories
            val grouped = state.products.groupBy { it.categoryId }
            val order = categories.map { it.id } + (grouped.keys - categories.map { it.id }.toSet())
            order.forEach { catId ->
                val items = grouped[catId].orEmpty()
                if (items.isNotEmpty()) {
                    item(key = "cat-$catId") {
                        Text(
                            categories.firstOrNull { it.id == catId }?.name ?: "Sin categoría",
                            fontWeight = FontWeight.Black, color = Graphite, modifier = Modifier.padding(top = 8.dp, start = 4.dp),
                        )
                    }
                    items(items, key = { it.id }) { p -> ProductRow(p, onToggle = { vm.setAvailable(p, it) }, onEdit = { editing = p }) }
                }
            }
        }
    }

    editing?.let { p ->
        var text by remember(p.id) { mutableStateOf(((p.price ?: 0.0).toLong()).toString()) }
        AlertDialog(
            onDismissRequest = { editing = null },
            title = { Text("Precio de ${p.name}") },
            text = {
                OutlinedTextField(
                    value = text, onValueChange = { text = it.filter { c -> c.isDigit() } },
                    label = { Text("Precio en pesos") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    text.toDoubleOrNull()?.let { vm.setPrice(p, it) }
                    editing = null
                }) { Text("Guardar") }
            },
            dismissButton = { TextButton(onClick = { editing = null }) { Text("Cancelar") } },
        )
    }
}

@Composable
private fun ProductRow(p: ProductDto, onToggle: (Boolean) -> Unit, onEdit: () -> Unit) {
    val available = p.isAvailable != false
    Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Row(Modifier.fillMaxWidth().padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
            AsyncImage(
                model = p.imageUrl, contentDescription = null, contentScale = ContentScale.Crop,
                modifier = Modifier.size(56.dp).clip(RoundedCornerShape(12.dp)),
            )
            Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                Text(p.name, fontWeight = FontWeight.Bold, color = if (available) Ink else Graphite)
                Text(formatMoney(p.price) + if (p.saleType == "peso") " (por peso)" else "", color = Graphite)
            }
            IconButton(onClick = onEdit) { Icon(Icons.Filled.Edit, contentDescription = "Editar precio") }
            Switch(checked = available, onCheckedChange = onToggle)
        }
    }
}
