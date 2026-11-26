package uno.snappy.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uno.snappy.app.data.BillingPaymentDto

// Plan y suscripción: SOLO INFORMATIVO. A propósito no hay botones ni links para pagar, cambiar de plan o cargar
// tarjeta (política de pagos de Google Play: la app es de consumo; cobros y cambios se hacen en la plataforma web).
// Precios de lista: espejo de lib/plans.ts (PLAN_PRICES) del repo web. Si hay un cobro aprobado se muestra ese monto
// (clientes con precio anterior siguen pagando el suyo hasta que se actualice).
private val listPrice = mapOf("light" to 20000.0, "go" to 29500.0, "plus" to 47000.0)
private val productLimit = mapOf("light" to 20, "go" to 60)

@Composable
fun PlanScreen(state: UiState, onBack: () -> Unit) {
    val r = state.restaurant
    val planId = (r?.subscriptionPlan ?: "").lowercase()
    val planName = planId.replaceFirstChar { it.uppercase() }
    val status = (r?.subscriptionStatus ?: "").lowercase()
    val lastApproved = state.payments.firstOrNull { it.status == "approved" }
    val price = lastApproved?.amount ?: listPrice[planId]
    val trialing = status == "trialing"
    val active = status == "active" || status == "authorized"

    val (statusLabel, statusFg, statusBg) = when {
        trialing -> Triple("Prueba gratis", Color(0xFF8A6A00), Color(0xFFFFF1C2))
        active -> Triple("Activa", Color(0xFF0B7A52), Color(0xFFD6F3E6))
        status == "paused" -> Triple("Pausada", Color(0xFF8A1F14), Color(0xFFFFE9E6))
        status == "cancelled" -> Triple("Cancelada", Color(0xFF8A1F14), Color(0xFFFFE9E6))
        else -> Triple("Sin datos", Graphite, Surface2)
    }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver") }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("PLAN Y SUSCRIPCIÓN", style = MaterialTheme.typography.labelSmall, color = Graphite)
                Text("Tu plan", style = MaterialTheme.typography.headlineMedium)
            }
            Box(Modifier.size(44.dp).clip(CircleShape).background(Color(0xFFFFF4CF)), contentAlignment = Alignment.Center) {
                Icon(Icons.Filled.AutoAwesome, contentDescription = null, tint = Color(0xFF8A6A00))
            }
        }

        // Estado del plan
        Card {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (planName.isNotEmpty()) Chip("PLAN ${planName.uppercase()}", Color(0xFF5C4600), Color(0xFFF2C94C))
                Spacer(Modifier.weight(1f))
                Chip(statusLabel.uppercase(), statusFg, statusBg)
            }
            Spacer(Modifier.height(12.dp))
            if (price != null) Row(verticalAlignment = Alignment.Bottom) {
                Text(formatMoney(price), fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 34.sp)
                Text(" /mes", color = Graphite, modifier = Modifier.padding(bottom = 6.dp))
            }
            Spacer(Modifier.height(8.dp))
            when {
                trialing && !r?.trialEndsAt.isNullOrBlank() -> {
                    val d = daysUntil(r?.trialEndsAt)
                    Text(if (d <= 0) "Tu prueba gratis termina hoy." else "Te quedan $d ${if (d == 1) "día" else "días"} de prueba gratis.", fontWeight = FontWeight.SemiBold)
                    Text("Primer cobro: ${formatDate(r?.trialEndsAt)}", color = Graphite, fontSize = 13.sp)
                }
                active && lastApproved != null -> Text("Último cobro: ${formatDate(lastApproved.paidAt)}", color = Graphite, fontSize = 13.sp)
                status == "cancelled" -> Text("Tu suscripción está cancelada.", color = Graphite, fontSize = 13.sp)
                status == "paused" -> Text("Tu suscripción está pausada por un pago pendiente.", color = Graphite, fontSize = 13.sp)
            }
        }

        // Uso del plan
        val used = state.products.size
        val limit = productLimit[planId]
        Card {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconTile(Icons.Filled.Inventory2, Color(0xFFE6F1FB), Color(0xFF0C447C))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("Productos en tu catálogo", fontWeight = FontWeight.SemiBold)
                    Text(if (limit != null) "$used de $limit" else "$used · sin límite", color = Graphite, fontSize = 13.sp)
                }
            }
        }

        // Método de cobro registrado (solo se muestra)
        Card {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconTile(Icons.Filled.CreditCard, Color(0xFFD6F3E6), Color(0xFF0B7A52))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("Método de cobro", fontWeight = FontWeight.SemiBold)
                    val last4 = r?.cardLastFour
                    Text(
                        if (!last4.isNullOrBlank()) "${(r?.cardBrand ?: "Tarjeta").replaceFirstChar { it.uppercase() }} •••• $last4" else "Sin tarjeta registrada",
                        color = Graphite, fontSize = 13.sp,
                    )
                }
            }
        }

        // Historial
        Card {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconTile(Icons.Filled.Receipt, Color(0xFFFAEEDA), Color(0xFF633806))
                Spacer(Modifier.width(12.dp))
                Text("Historial de cobros", fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(8.dp))
            if (state.payments.isEmpty()) {
                Text(if (state.paymentsLoaded) "Todavía no hay cobros registrados." else "Cargando…", color = Graphite, fontSize = 13.sp, modifier = Modifier.padding(vertical = 8.dp))
            } else state.payments.forEachIndexed { i, p ->
                PaymentRow(p)
                if (i < state.payments.lastIndex) HorizontalDivider(color = Color(0xFFEDEDE5))
            }
        }

        // Sin link a propósito.
        Text(
            "Para cambiar tu plan o administrar tu método de pago, ingresá a tu cuenta desde Snappy Web.",
            color = Graphite, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 4.dp),
        )
        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun PaymentRow(p: BillingPaymentDto) {
    val ok = p.status == "approved"
    val label = when (p.status) {
        "approved" -> "Aprobado"; "rejected" -> "Rechazado"; "refunded" -> "Reembolsado"; "charged_back" -> "Contracargo"; else -> "Cancelado"
    }
    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(formatDate(p.paidAt), fontWeight = FontWeight.SemiBold)
            Text(if (!p.plan.isNullOrBlank()) "Plan ${p.plan.uppercase()}" else "Suscripción", color = Graphite, fontSize = 12.sp)
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(if (p.amount != null) formatMoney(p.amount) else "—", fontWeight = FontWeight.Bold)
            Text(label.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = if (ok) Color(0xFF0B7A52) else Alert)
        }
    }
}

@Composable
private fun Card(content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit) {
    Surface(shape = RoundedCornerShape(20.dp), color = Color.White, border = BorderStroke(1.dp, CardBorder), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), content = content)
    }
}

@Composable
private fun Chip(text: String, fg: Color, bg: Color) {
    Text(text, color = fg, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold,
        modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(bg).padding(horizontal = 8.dp, vertical = 3.dp))
}

@Composable
private fun IconTile(icon: androidx.compose.ui.graphics.vector.ImageVector, bg: Color, fg: Color) {
    Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(bg), contentAlignment = Alignment.Center) {
        Icon(icon, contentDescription = null, tint = fg, modifier = Modifier.size(22.dp))
    }
}
