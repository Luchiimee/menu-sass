package uno.snappy.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ViewAgenda
import androidx.compose.material.icons.filled.ViewCarousel
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uno.snappy.app.R

private data class Tpl(val id: String, val name: String, val ideal: String, val group: String, val img: Int)

private val TEMPLATES = listOf(
    Tpl("classic", "Classic Delivery", "Ideal para pizzería y delivery", "delivery", R.drawable.tpl_classic),
    Tpl("urban", "Urbano Dark", "Ideal para hamburguesería y street food", "delivery", R.drawable.tpl_urban),
    Tpl("minimal", "Minimalista", "Ideal para cafetería y panadería", "elegante", R.drawable.tpl_minimal),
    Tpl("visualgrid", "Visual Grid", "Ideal para heladería y negocios visuales", "heladeria", R.drawable.tpl_visualgrid),
    Tpl("spotlight", "Spotlight Hero", "Ideal para restaurante con menú destacado", "restaurante", R.drawable.tpl_spotlight),
    Tpl("icecream-v1", "Soft Premium", "Ideal para heladería y dietética", "heladeria", R.drawable.tpl_icecream_v1),
    Tpl("marketpro", "Market Pro", "Ideal para kiosco y despensa", "kiosco", R.drawable.tpl_marketpro),
    Tpl("alterna-pro", "Alterna Pro", "Ideal para carta compleja y mercado", "elegante", R.drawable.tpl_alterna_pro),
    Tpl("carta", "Carta", "Ideal para restaurante con menú destacado", "restaurante", R.drawable.tpl_carta),
    Tpl("argentina", "Argentina", "Ideal para parrillas, hamburgueserías y locales con identidad argentina", "restaurante", R.drawable.tpl_argentina),
    Tpl("portada", "Portada", "Ideal para hamburguesería, cafetería y locales con fotos grandes", "restaurante", R.drawable.tpl_portada),
)

private val FILTERS = listOf(
    "todas" to "Todas", "restaurante" to "Restaurante", "delivery" to "Delivery y comida rápida",
    "kiosco" to "Kiosco y despensa", "heladeria" to "Heladería y dietética", "elegante" to "Elegante y minimalista",
)

// Pantalla propia de plantillas: vistas previas grandes (las mismas de la web) y un botón para elegir.
@Composable
fun TemplatesScreen(state: UiState, onBack: () -> Unit, onChoose: (String) -> Unit) {
    val current = state.restaurant?.templateId ?: "classic"
    var filter by remember { mutableStateOf("todas") }
    var carousel by rememberSaveable { mutableStateOf(false) }
    var confirm by remember { mutableStateOf<Tpl?>(null) }
    val list = TEMPLATES.filter { filter == "todas" || it.group == filter }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(start = 4.dp, top = if (carousel) 14.dp else 22.dp, end = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver") }
            Text("Plantillas", style = MaterialTheme.typography.titleLarge)
        }
        if (!carousel) Text(
            "Elegí cómo se va a ver tu menú digital. Cada plantilla trae sus propios colores y un estilo pensado para un tipo de negocio. Podés cambiarla cuando quieras.",
            style = MaterialTheme.typography.bodySmall, color = Graphite,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = if (carousel) 6.dp else 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(FILTERS) { (key, label) ->
                val on = filter == key
                Text(
                    label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                    color = if (on) Color.White else Ink,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) Fresco else Color.White)
                        .border(1.dp, if (on) Fresco else CardBorder, RoundedCornerShape(50))
                        .clickable { filter = key }.padding(horizontal = 14.dp, vertical = 8.dp),
                )
            }
        }
        // Selector de vista con texto, para que se entienda que son botones
        Row(Modifier.padding(horizontal = 16.dp).padding(bottom = if (carousel) 6.dp else 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Row(Modifier.clip(RoundedCornerShape(12.dp)).background(Surface2).padding(3.dp)) {
                ViewTab("Lista", Icons.Filled.ViewAgenda, selected = !carousel) { carousel = false }
                ViewTab("De costado", Icons.Filled.ViewCarousel, selected = carousel) { carousel = true }
            }
        }
        if (carousel) {
            val pager = rememberPagerState(pageCount = { list.size })
            val t = list[pager.currentPage.coerceIn(0, list.lastIndex)]
            HorizontalPager(
                state = pager, contentPadding = PaddingValues(horizontal = 40.dp), pageSpacing = 12.dp,
                modifier = Modifier.fillMaxWidth().weight(1f),
            ) { i ->
                Image(
                    painter = painterResource(list[i].img), contentDescription = list[i].name,
                    contentScale = ContentScale.Crop, alignment = Alignment.TopCenter,
                    modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(20.dp))
                        .border(if (list[i].id == current) 2.dp else 1.dp, if (list[i].id == current) Fresco else CardBorder, RoundedCornerShape(20.dp)),
                )
            }
            // Panel fijo y compacto: siempre se ve el nombre y el botón de la plantilla que tenés al frente
            Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(t.name, fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 17.sp, modifier = Modifier.weight(1f))
                    if (t.id == current) Text("EN USO  ", style = MaterialTheme.typography.labelSmall, color = Fresco, fontWeight = FontWeight.Bold)
                    Text("${pager.currentPage + 1} de ${list.size}", style = MaterialTheme.typography.labelSmall, color = Graphite)
                }
                ChooseButton(t.id == current) { confirm = t }
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                items(list, key = { it.id }) { t -> TemplateCard(t, t.id == current) { confirm = t } }
            }
        }
    }

    confirm?.let { t ->
        AlertDialog(
            onDismissRequest = { confirm = null },
            title = { Text("¿Usar ${t.name}?") },
            text = { Text("Tu menú va a tomar los colores originales de esta plantilla. Los colores que personalizaste se reemplazan.") },
            confirmButton = { TextButton(onClick = { onChoose(t.id); confirm = null }) { Text("Usar plantilla", color = Fresco, fontWeight = FontWeight.Bold) } },
            dismissButton = { TextButton(onClick = { confirm = null }) { Text("Cancelar", color = Ink) } },
        )
    }
}

@Composable
private fun ViewTab(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.clip(RoundedCornerShape(10.dp)).background(if (selected) Ink else Color.Transparent).clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = if (selected) Color.White else Ink, modifier = Modifier.size(18.dp))
        Text("  $label", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = if (selected) Color.White else Ink)
    }
}

@Composable
private fun ChooseButton(active: Boolean, onClick: () -> Unit) {
    if (active) {
        Text("Es la plantilla de tu menú ahora", style = MaterialTheme.typography.bodySmall, color = Graphite, modifier = Modifier.padding(vertical = 12.dp))
    } else {
        Button(
            onClick = onClick, modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Ink, contentColor = Color.White),
        ) { Text("Usar esta plantilla", color = Color.White, fontWeight = FontWeight.SemiBold) }
    }
}

@Composable
private fun TemplateCard(t: Tpl, active: Boolean, onChoose: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White)
            .border(if (active) 2.dp else 1.dp, if (active) Fresco else CardBorder, RoundedCornerShape(20.dp)),
    ) {
        Image(
            painter = painterResource(t.img), contentDescription = t.name,
            contentScale = ContentScale.Crop, modifier = Modifier.fillMaxWidth().aspectRatio(550f / 720f),
        )
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(t.name, fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f))
                if (active) Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = Fresco, modifier = Modifier.size(18.dp))
                    Text(" EN USO", style = MaterialTheme.typography.labelSmall, color = Fresco, fontWeight = FontWeight.Bold)
                }
            }
            Text(t.ideal, style = MaterialTheme.typography.bodyMedium, color = Graphite)
            Spacer(Modifier.height(8.dp))
            ChooseButton(active, onChoose)
        }
    }
}
