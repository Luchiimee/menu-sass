package uno.snappy.app.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
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
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import uno.snappy.app.data.ProductDto

// Formulario para crear (product == null) o editar un producto. Mismos campos que la web para productos por unidad:
// foto, nombre, descripción, precio y categoría. Los productos por peso (variaciones) se editan solo desde la web.
@Composable
fun ProductFormDialog(product: ProductDto?, state: UiState, vm: AppController, onClose: () -> Unit) {
    val isWeight = product?.saleType == "peso"
    var name by remember { mutableStateOf(product?.name ?: "") }
    var description by remember { mutableStateOf(product?.description ?: "") }
    var priceText by remember { mutableStateOf(product?.price?.let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() } ?: "") }
    var categoryId by remember { mutableStateOf(product?.categoryId ?: state.categories.firstOrNull()?.id) }
    var picked by remember { mutableStateOf<android.net.Uri?>(null) }
    var confirmDelete by remember { mutableStateOf(false) }

    val focusManager = LocalFocusManager.current
    androidx.compose.runtime.DisposableEffect(Unit) { vm.clearFormError(); onDispose { vm.clearFormError() } }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri -> if (uri != null) picked = uri }

    val price = priceText.replace(',', '.').toDoubleOrNull()
    val canSave = name.isNotBlank() && (isWeight || (price != null && price >= 0)) && !state.savingProduct

    Dialog(onDismissRequest = { if (!state.savingProduct) onClose() }, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Column(
                Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().imePadding()
                    .pointerInput(Unit) { detectTapGestures { focusManager.clearFocus() } }
                    .verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(if (product == null) "Nuevo producto" else "Editar producto", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    TextButton(onClick = onClose, enabled = !state.savingProduct) { Text("Cerrar") }
                }

                Box(
                    Modifier.fillMaxWidth().height(200.dp).clip(RoundedCornerShape(16.dp)).background(Color(0xFFEDEDED))
                        .clickable(enabled = !state.savingProduct) { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                    contentAlignment = Alignment.Center,
                ) {
                    val model = picked ?: product?.imageUrl
                    if (model != null) AsyncImage(model = model, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    else Text("Tocá para agregar una foto", color = Graphite)
                }
                OutlinedButton(onClick = { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, enabled = !state.savingProduct, modifier = Modifier.fillMaxWidth()) {
                    Text(if (picked != null || product?.imageUrl != null) "Cambiar foto" else "Elegir foto de la galería")
                }

                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Nombre") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Descripción (opcional)") }, minLines = 2, maxLines = 4,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                    modifier = Modifier.fillMaxWidth())

                if (isWeight) {
                    Text("Este producto se vende por peso: el precio y las opciones (100 g, 1 kg…) se editan desde la web.", color = Graphite)
                } else {
                    OutlinedTextField(
                        value = priceText, onValueChange = { priceText = it.filter { c -> c.isDigit() || c == '.' || c == ',' } },
                        label = { Text("Precio en pesos") }, singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(),
                    )
                }

                if (state.categories.isNotEmpty()) {
                    Text("Categoría", fontWeight = FontWeight.Bold)
                    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        state.categories.forEach { c ->
                            FilterChip(selected = categoryId == c.id, onClick = { categoryId = c.id }, label = { Text(c.name) })
                        }
                    }
                }

                state.formError?.let { Text(it, color = Color(0xFFD32F2F), fontWeight = FontWeight.Bold) }
                Button(
                    onClick = { focusManager.clearFocus(); vm.saveProduct(product?.id, name, description, if (isWeight) null else price, categoryId, picked) { onClose() } },
                    enabled = canSave, modifier = Modifier.fillMaxWidth().height(52.dp),
                ) {
                    if (state.savingProduct) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp, color = Color.White)
                    else Text(if (product == null) "Crear producto" else "Guardar cambios", fontWeight = FontWeight.Black)
                }
                if (product != null) {
                    TextButton(onClick = { confirmDelete = true }, enabled = !state.savingProduct, modifier = Modifier.fillMaxWidth()) {
                        Text("Borrar producto", color = Color(0xFFD32F2F))
                    }
                }
            }
        }
    }

    if (confirmDelete && product != null) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("¿Borrar ${product.name}?") },
            text = { Text("Se borra del catálogo y no se puede deshacer. Los pedidos ya hechos no cambian.") },
            confirmButton = { TextButton(onClick = { confirmDelete = false; vm.deleteProduct(product) { onClose() } }) { Text("Borrar", color = Color(0xFFD32F2F)) } },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancelar") } },
        )
    }
}
