package uno.snappy.app.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
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
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import uno.snappy.app.data.ProductDto

@Composable
private fun FormCard(content: @Composable () -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) { content() }
}

@Composable
private fun Label(text: String) = Text(text.uppercase(), style = MaterialTheme.typography.labelSmall, color = Graphite)

@Composable
private fun Pill(text: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.clip(RoundedCornerShape(50)).background(if (selected) Color(0xFFD6F3E6) else Surface2)
            .then(Modifier.clickable(onClick = onClick))
            .padding(horizontal = 14.dp, vertical = 8.dp),
    ) {
        Text(text, color = if (selected) Color(0xFF0B5A3C) else Graphite, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium, fontSize = 14.sp)
    }
}

// Crear (product == null) o editar un producto, con el diseño nuevo: foto, datos, categoría, precio, adicionales y opciones del menú.
// Los productos por peso (variaciones) se editan solo desde la web.
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ProductFormDialog(product: ProductDto?, state: UiState, vm: AppController, onClose: () -> Unit) {
    val isWeight = product?.saleType == "peso"
    var name by remember { mutableStateOf(product?.name ?: "") }
    var description by remember { mutableStateOf(product?.description ?: "") }
    var priceText by remember { mutableStateOf(product?.price?.let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() } ?: "") }
    var categoryId by remember { mutableStateOf(product?.categoryId ?: state.categories.firstOrNull()?.id) }
    var picked by remember { mutableStateOf<android.net.Uri?>(null) }
    var destacado by remember { mutableStateOf(product?.esDestacado == true) }
    var extraIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var confirmDelete by remember { mutableStateOf(false) }
    // Solo puede haber un destacado: si ya hay otro, hay que apagarlo primero
    val otroDestacado = state.products.firstOrNull { it.esDestacado == true && it.id != product?.id }
    var blockedBy by remember { mutableStateOf<ProductDto?>(null) }

    val focusManager = LocalFocusManager.current
    androidx.compose.runtime.DisposableEffect(Unit) { vm.clearFormError(); onDispose { vm.clearFormError() } }
    LaunchedEffect(product?.id) { product?.id?.let { vm.loadProductExtras(it) { ids -> extraIds = ids } } }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri -> if (uri != null) picked = uri }
    fun pickPhoto() = picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))

    val price = priceText.replace(',', '.').toDoubleOrNull()
    val canSave = name.isNotBlank() && (isWeight || (price != null && price >= 0)) && !state.savingProduct
    val busy = state.savingProduct

    Dialog(onDismissRequest = { if (!busy) onClose() }, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().imePadding()) {
                Row(Modifier.fillMaxWidth().padding(start = 8.dp, end = 16.dp, top = 8.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onClose, enabled = !busy) {
                        Box(Modifier.size(40.dp).clip(CircleShape).background(Color.White), contentAlignment = Alignment.Center) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                        }
                    }
                    Column(Modifier.padding(start = 4.dp)) {
                        Text(if (product == null) "NUEVO" else "EDITAR", style = MaterialTheme.typography.labelSmall, color = Graphite)
                        Text("Producto", fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                    }
                }

                Column(
                    Modifier.weight(1f).pointerInput(Unit) { detectTapGestures { focusManager.clearFocus() } }
                        .verticalScroll(rememberScrollState()).padding(horizontal = 14.dp, vertical = 6.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    FormCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(80.dp).clip(RoundedCornerShape(14.dp)).background(Surface2).clickable(enabled = !busy) { pickPhoto() }, contentAlignment = Alignment.Center) {
                                val model = picked ?: product?.imageUrl
                                if (model != null) AsyncImage(model = model, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                                else Icon(Icons.Filled.CameraAlt, contentDescription = null, tint = Graphite)
                            }
                            Spacer(Modifier.width(14.dp))
                            Column {
                                Label("Foto")
                                Text("Es la que se ve en el menú.", style = MaterialTheme.typography.bodySmall, color = Graphite)
                                Box(
                                    Modifier.padding(top = 6.dp).clip(RoundedCornerShape(50)).background(Surface2).clickable(enabled = !busy) { pickPhoto() }
                                        .padding(horizontal = 12.dp, vertical = 7.dp),
                                ) { Text(if (picked != null || product?.imageUrl != null) "Cambiar foto" else "Elegir foto", fontWeight = FontWeight.SemiBold, fontSize = 13.sp) }
                            }
                        }
                    }

                    FormCard {
                        Label("Nombre")
                        OutlinedTextField(name, { name = it }, singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp))
                        Label("Descripción (opcional)")
                        OutlinedTextField(
                            description, { description = it }, minLines = 2, maxLines = 4, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                        )
                        if (state.categories.isNotEmpty()) {
                            Label("Categoría")
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                state.categories.forEach { c -> Pill(c.name, categoryId == c.id) { categoryId = c.id } }
                            }
                        }
                        Label("Precio")
                        if (isWeight) Text("Este producto se vende por peso: el precio y las opciones (100 g, 1 kg…) se editan desde la web.", color = Graphite, style = MaterialTheme.typography.bodySmall)
                        else OutlinedTextField(
                            priceText, { priceText = it.filter { c -> c.isDigit() || c == '.' || c == ',' } }, singleLine = true, prefix = { Text("$ ") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp),
                        )
                    }

                    FormCard {
                        Label("Adicionales")
                        Text("Se le ofrecen al cliente al pedir este producto.", style = MaterialTheme.typography.bodySmall, color = Graphite)
                        if (state.extras.isEmpty()) Text("Todavía no creaste adicionales (Catálogo → Adicionales).", style = MaterialTheme.typography.bodySmall, color = Graphite)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            state.extras.forEach { e ->
                                val on = e.id in extraIds
                                Pill((if (on) "✓  " else "+  ") + "${e.name}  ${formatMoney(e.price)}", on) { extraIds = if (on) extraIds - e.id else extraIds + e.id }
                            }
                        }
                    }

                    FormCard {
                        Label("Opciones del menú")
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Star, contentDescription = null, tint = Color(0xFFE0A21B), modifier = Modifier.size(22.dp))
                            Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                                Text("Destacado", fontWeight = FontWeight.SemiBold)
                                Text("Va primero en el menú. Solo uno a la vez.", style = MaterialTheme.typography.bodySmall, color = Graphite)
                            }
                            Switch(
                                checked = destacado,
                                onCheckedChange = { want -> if (want && otroDestacado != null) blockedBy = otroDestacado else destacado = want },
                                colors = snappySwitchColors(),
                            )
                        }
                        Text("No todos los diseños del menú lo muestran.", style = MaterialTheme.typography.bodySmall, color = Graphite)
                    }

                    state.formError?.let { Text(it, color = Alert, fontWeight = FontWeight.Bold) }
                    if (product != null) {
                        TextButton(onClick = { confirmDelete = true }, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text("Borrar producto", color = Alert) }
                    }
                    Spacer(Modifier.height(4.dp))
                }

                Button(
                    onClick = { focusManager.clearFocus(); vm.saveProduct(product?.id, name, description, if (isWeight) null else price, categoryId, picked, extraIds, destacado) { onClose() } },
                    enabled = canSave,
                    colors = ButtonDefaults.buttonColors(containerColor = Fresco, contentColor = Ink, disabledContainerColor = Color(0xFFD9DAD0)),
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.fillMaxWidth().padding(14.dp).height(54.dp),
                ) {
                    if (busy) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp, color = Ink)
                    else Text(if (product == null) "Crear producto" else "Guardar producto", fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                }
            }
        }
    }

    blockedBy?.let { other ->
        AlertDialog(
            onDismissRequest = { blockedBy = null },
            title = { Text("Ya hay un destacado") },
            text = { Text("«${other.name}» es el producto destacado. Solo puede haber uno: desactivalo primero en ese producto para activarlo acá.") },
            confirmButton = { TextButton(onClick = { blockedBy = null }) { Text("Entendido") } },
        )
    }

    if (confirmDelete && product != null) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("¿Borrar ${product.name}?") },
            text = { Text("Se borra del catálogo y no se puede deshacer. Los pedidos ya hechos no cambian.") },
            confirmButton = { TextButton(onClick = { confirmDelete = false; vm.deleteProduct(product) { onClose() } }) { Text("Borrar", color = Alert) } },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancelar") } },
        )
    }
}
