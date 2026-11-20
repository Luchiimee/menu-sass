package uno.snappy.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Colores de marca de Snappy (los mismos de la web: tailwind.config).
val Fresco = Color(0xFF1BB179)
val Ink = Color(0xFF15160E)
val Paper = Color(0xFFF5F5EF)
val Surface2 = Color(0xFFECEBE3)
val Graphite = Color(0xFF86877B)
val Alert = Color(0xFFFF4D3D)
val Brasa = Color(0xFF9A5532)

// Colores por etapa del pedido: rojo sin atender, amarillo en cocina, azul enviado o listo, verde finalizado.
data class StageStyle(val accent: Color, val soft: Color, val onSoft: Color)

fun stageStyle(stage: uno.snappy.app.data.OrderStage): StageStyle = when (stage) {
    uno.snappy.app.data.OrderStage.NUEVO -> StageStyle(Alert, Color(0xFFFFE9E6), Color(0xFF8A1F14))
    uno.snappy.app.data.OrderStage.COCINA -> StageStyle(Color(0xFFEF9F27), Color(0xFFFAEEDA), Color(0xFF633806))
    uno.snappy.app.data.OrderStage.LISTO -> StageStyle(Color(0xFF378ADD), Color(0xFFE6F1FB), Color(0xFF0C447C))
    uno.snappy.app.data.OrderStage.FINAL -> StageStyle(Color(0xFF7FBF99), Color(0xFFEAF3DE), Color(0xFF27500A))
}

private val Scheme = lightColorScheme(
    primary = Fresco,
    onPrimary = Ink,
    background = Paper,
    onBackground = Ink,
    surface = Color.White,
    onSurface = Ink,
    surfaceVariant = Surface2,
    error = Alert,
)

@Composable
fun SnappyTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Scheme, content = content)
}
