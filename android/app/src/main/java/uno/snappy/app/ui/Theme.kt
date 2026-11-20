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
