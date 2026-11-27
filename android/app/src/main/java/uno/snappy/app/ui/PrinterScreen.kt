package uno.snappy.app.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Una A4 cortada en 4: la esquina marcada es una hoja A6.
@Composable
private fun SheetDiagram() {
    Canvas(Modifier.size(width = 64.dp, height = 90.dp)) {
        val w = size.width; val h = size.height
        drawRect(Color.White)
        drawRect(Fresco.copy(alpha = 0.18f), topLeft = Offset(0f, 0f), size = androidx.compose.ui.geometry.Size(w / 2, h / 2))
        drawRect(CardBorder, style = Stroke(width = 3f))
        val dash = PathEffect.dashPathEffect(floatArrayOf(10f, 8f))
        drawLine(Fresco, Offset(w / 2, 0f), Offset(w / 2, h), strokeWidth = 3f, pathEffect = dash)
        drawLine(Fresco, Offset(0f, h / 2), Offset(w, h / 2), strokeWidth = 3f, pathEffect = dash)
    }
}

@Composable
private fun PaperCard(selected: Boolean, title: String, size: String, description: String, steps: List<String>?, onSelect: () -> Unit) {
    val shape = RoundedCornerShape(20.dp)
    Column(
        Modifier.fillMaxWidth().clip(shape).background(Color.White)
            .border(if (selected) 2.dp else 1.dp, if (selected) Fresco else CardBorder, shape)
            .clickable(onClick = onSelect).padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(title, fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                Text(size, color = Graphite, fontSize = 13.sp)
            }
            if (selected) {
                Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = Fresco, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(4.dp))
                Text("EN USO", color = Fresco, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.Top) {
            Text(description, color = Graphite, modifier = Modifier.weight(1f))
            if (steps != null) { Spacer(Modifier.width(12.dp)); SheetDiagram() }
        }
        if (steps != null) {
            Spacer(Modifier.height(12.dp))
            HorizontalDivider(color = CardBorder)
            Spacer(Modifier.height(12.dp))
            Text("CÓMO PREPARAR LAS HOJAS", color = Graphite, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            steps.forEachIndexed { i, s ->
                Row(Modifier.padding(top = 10.dp), verticalAlignment = Alignment.Top) {
                    Box(Modifier.size(24.dp).clip(CircleShape).background(Surface2), contentAlignment = Alignment.Center) {
                        Text("${i + 1}", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(s, modifier = Modifier.weight(1f))
                }
            }
            Spacer(Modifier.height(10.dp))
            Text("No hace falta que el corte sea exacto, siempre que las 4 hojas queden parejas.", color = Graphite, fontSize = 13.sp)
        }
        Spacer(Modifier.height(14.dp))
        if (selected) {
            Text("Es el papel que usás ahora", color = Graphite, modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp), fontWeight = FontWeight.SemiBold)
        } else {
            Button(
                onClick = onSelect, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Ink, contentColor = Color.White),
            ) { Text("Usar este papel", color = Color.White, fontWeight = FontWeight.SemiBold) }
        }
    }
}

// Pantalla propia de impresión (en Más): tamaño del papel de las comandas, cómo preparar las hojas y ayuda.
@Composable
fun PrinterScreen(onBack: () -> Unit) {
    val ctx = LocalContext.current
    val uri = LocalUriHandler.current
    var paper by remember { mutableStateOf(PrintPrefs.paper(ctx)) }
    val choose = { v: String -> paper = v; PrintPrefs.setPaper(ctx, v) }

    Column(Modifier.fillMaxSize().statusBarsPadding().verticalScroll(rememberScrollState())) {
        Row(Modifier.fillMaxWidth().padding(start = 4.dp, top = 22.dp, end = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver") }
            Text("Impresión", style = MaterialTheme.typography.titleLarge)
        }
        Text(
            "Elegí el papel en el que imprimís las comandas. Se guarda en este teléfono y después solo tocás Imprimir comanda.",
            style = MaterialTheme.typography.bodySmall, color = Graphite,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
        )
        Column(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            PaperCard(paper == "a4", "Hoja A4", "210 × 297 mm", "La comanda sale centrada arriba en la hoja. El resto de la hoja queda en blanco.", null) { choose("a4") }
            PaperCard(
                paper == "4x6", "A6", "4 × 6 in · unos 105 × 148 mm",
                "Con una hoja A4 hacés 4 comandas y ahorrás papel.",
                listOf(
                    "Doblá la A4 por la mitad y marcá el pliegue. Doblala otra vez y cortá por los pliegues. Te quedan 4 hojas A6.",
                    "Cortá derecho y alisá bien cada hoja: un corte torcido o un pliegue traba la impresora.",
                    "Cargá las hojitas y cerrá las guías de la bandeja al ancho del papel.",
                ),
            ) { choose("4x6") }

            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Surface2).padding(16.dp)) {
                Text("Al imprimir", fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(4.dp))
                Text(
                    "La ventana de tu impresora abre en el tamaño que elegiste. Según la marca, puede figurar como \"A6\" o como \"4 in x 6 in\". Si no se selecciona sola, elegilo ahí.",
                    color = Graphite,
                )
            }

            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White).border(1.dp, CardBorder, RoundedCornerShape(20.dp)).padding(16.dp)) {
                Text("¿Necesitás ayuda?", fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Spacer(Modifier.height(4.dp))
                Text("Escribinos y te ayudamos a dejar tu impresora lista.", color = Graphite)
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = { runCatching { uri.openUri("https://wa.me/5492324313123") } },
                    modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Fresco, contentColor = Color.White),
                ) {
                    Icon(Icons.Filled.Chat, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("WhatsApp · 2324 313123", color = Color.White, fontWeight = FontWeight.SemiBold)
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}
