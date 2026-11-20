package uno.snappy.app.ui

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uno.snappy.app.R

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

// Tipografías de marca: Space Grotesk para títulos y números, Hanken Grotesk para texto.
val SpaceGrotesk = FontFamily(
    Font(R.font.space_grotesk_medium, FontWeight.Medium),
    Font(R.font.space_grotesk_bold, FontWeight.Bold),
    Font(R.font.space_grotesk_bold, FontWeight.SemiBold),
)
val HankenGrotesk = FontFamily(
    Font(R.font.hanken_grotesk_regular, FontWeight.Normal),
    Font(R.font.hanken_grotesk_medium, FontWeight.Medium),
    Font(R.font.hanken_grotesk_semibold, FontWeight.SemiBold),
    Font(R.font.hanken_grotesk_semibold, FontWeight.Bold),
)

private fun head(size: Int, line: Int, w: FontWeight = FontWeight.Bold) =
    TextStyle(fontFamily = SpaceGrotesk, fontWeight = w, fontSize = size.sp, lineHeight = line.sp, letterSpacing = (-0.2).sp)

private fun body(size: Int, line: Int, w: FontWeight = FontWeight.Normal, ls: Double = 0.0) =
    TextStyle(fontFamily = HankenGrotesk, fontWeight = w, fontSize = size.sp, lineHeight = line.sp, letterSpacing = ls.sp)

private val SnappyTypography = Typography(
    displayLarge = head(44, 50), displayMedium = head(38, 44), displaySmall = head(32, 38),
    headlineLarge = head(30, 36), headlineMedium = head(26, 32), headlineSmall = head(22, 28),
    titleLarge = head(21, 27), titleMedium = head(17, 23), titleSmall = head(15, 20),
    bodyLarge = body(16, 23), bodyMedium = body(14, 20), bodySmall = body(12, 17),
    labelLarge = body(14, 18, FontWeight.SemiBold, 0.1),
    labelMedium = body(12, 16, FontWeight.SemiBold, 0.3),
    labelSmall = body(11, 14, FontWeight.SemiBold, 0.5),
)

private val SnappyShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

private val Scheme = lightColorScheme(
    primary = Fresco,
    onPrimary = Ink,
    primaryContainer = Color(0xFFD6F3E6),
    onPrimaryContainer = Color(0xFF0B5A3C),
    secondary = Ink,
    onSecondary = Paper,
    secondaryContainer = Color(0xFFD6F3E6),
    onSecondaryContainer = Ink,
    background = Paper,
    onBackground = Ink,
    surface = Color.White,
    onSurface = Ink,
    onSurfaceVariant = Graphite,
    surfaceVariant = Surface2,
    surfaceContainer = Color.White,
    surfaceContainerLow = Paper,
    surfaceContainerHigh = Surface2,
    outline = Color(0xFFC9C9BE),
    outlineVariant = Color(0xFFE2E2D8),
    error = Alert,
)

@Composable
fun SnappyTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Scheme, typography = SnappyTypography, shapes = SnappyShapes, content = content)
}
