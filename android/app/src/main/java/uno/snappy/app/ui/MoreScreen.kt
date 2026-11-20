package uno.snappy.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private data class MoreItem(val icon: ImageVector, val title: String, val subtitle: String, val soon: Boolean = true, val onClick: (() -> Unit)? = null)

// "Más": todo lo que no va en la barra de abajo. Lo que todavía no está en la app aparece con "Pronto".
@Composable
fun MoreScreen(state: UiState, vm: AppController) {
    var page by rememberSaveable { mutableStateOf<String?>(null) }

    if (page == "avisos") {
        BackHandler { page = null }
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth().padding(start = 4.dp, top = 8.dp, end = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { page = null }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver") }
                Text("Avisos y sonido", style = MaterialTheme.typography.titleLarge)
            }
            SettingsScreen(state, vm)
        }
        return
    }

    val soon = { vm.showMessage("Todavía no está en la app. Por ahora usalo desde el panel web.") }
    val plan = (state.restaurant?.subscriptionPlan ?: "").replaceFirstChar { it.uppercase() }

    val local = listOf(
        MoreItem(Icons.Filled.TrendingUp, "Resumen y rentabilidad", "Ventas, ticket promedio y producto top", onClick = soon),
        MoreItem(Icons.Filled.Palette, "Personalizar menú", "Logo, colores y portada", onClick = soon),
        MoreItem(Icons.Filled.Dashboard, "Plantillas", "Diseños del menú digital", onClick = soon),
        MoreItem(Icons.Filled.LocalShipping, "Delivery", "Zonas y costos de envío", onClick = soon),
        MoreItem(Icons.Filled.Event, "Reservas", "Mesas reservadas", onClick = soon),
        MoreItem(Icons.Filled.Storefront, "Configuración del local", "Horarios, dirección y datos", onClick = soon),
    )
    val operacion = listOf(
        MoreItem(Icons.Filled.VolumeUp, "Avisos y sonido", "Cómo suena un pedido nuevo", soon = false, onClick = { page = "avisos" }),
        MoreItem(Icons.Filled.CreditCard, "Pagos", "Mercado Pago y facturas", onClick = soon),
        MoreItem(Icons.Filled.AutoAwesome, "Plan y suscripción", if (plan.isNotEmpty()) "Plan $plan" else "Tu plan", onClick = soon),
    )
    val aprender = listOf(MoreItem(Icons.Filled.School, "Tutoriales", "Cómo sacarle el jugo a Snappy", onClick = soon))

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Column {
            Text("MÁS", style = MaterialTheme.typography.labelSmall, color = Graphite)
            Text("Tu local", style = MaterialTheme.typography.headlineSmall)
        }
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White).padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(48.dp).clip(RoundedCornerShape(14.dp)).background(Ink), contentAlignment = Alignment.Center) {
                Text((state.restaurant?.name ?: "S").take(2).uppercase(), color = Color.White, fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(state.restaurant?.name ?: "Mi local", fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                if (plan.isNotEmpty()) Text("PLAN ${plan.uppercase()}", style = MaterialTheme.typography.labelSmall, color = Color(0xFF0B7A52))
            }
        }
        Group("TU LOCAL", local)
        Group("OPERACIÓN", operacion)
        Group("APRENDER", aprender)
        OutlinedButton(onClick = vm::signOut, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Filled.Logout, contentDescription = null, modifier = Modifier.size(18.dp)); Text("  Cerrar sesión")
        }
        Spacer(Modifier.size(8.dp))
    }
}

@Composable
private fun Group(title: String, items: List<MoreItem>) {
    Column {
        Text(title, style = MaterialTheme.typography.labelSmall, color = Graphite, modifier = Modifier.padding(start = 4.dp, bottom = 6.dp))
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White)) {
            items.forEachIndexed { i, it ->
                Row(
                    Modifier.fillMaxWidth().clickable { it.onClick?.invoke() }.padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(Surface2), contentAlignment = Alignment.Center) {
                        Icon(it.icon, contentDescription = null, modifier = Modifier.size(22.dp))
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(it.title, fontWeight = FontWeight.SemiBold)
                        Text(it.subtitle, style = MaterialTheme.typography.bodySmall, color = Graphite)
                    }
                    if (it.soon) Text(
                        "PRONTO", style = MaterialTheme.typography.labelSmall, color = Graphite,
                        modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Surface2).padding(horizontal = 8.dp, vertical = 3.dp),
                    ) else Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Graphite)
                }
                if (i < items.lastIndex) HorizontalDivider(Modifier.padding(start = 66.dp), color = Color(0xFFEDEDE5))
            }
        }
    }
}
