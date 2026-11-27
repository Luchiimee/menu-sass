package uno.snappy.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties

// En toda la app los "botones de texto" se dibujan como botones de verdad: dentro de un cartel, el principal
// va relleno y el resto con borde, apilados a todo el ancho; fuera de un cartel, con borde.
internal enum class DialogRole { CONFIRM, DISMISS }
internal val LocalDialogRole = compositionLocalOf<DialogRole?> { null }

@Composable
fun TextButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    contentPadding: PaddingValues = ButtonDefaults.ContentPadding,
    content: @Composable RowScope.() -> Unit,
) {
    val shape = RoundedCornerShape(14.dp)
    val role = LocalDialogRole.current
    if (role == DialogRole.CONFIRM) {
        Button(
            onClick = onClick, modifier = modifier.fillMaxWidth().heightIn(min = 48.dp), enabled = enabled, shape = shape,
            colors = ButtonDefaults.buttonColors(containerColor = Ink, contentColor = Color.White, disabledContainerColor = Surface2, disabledContentColor = Graphite),
            contentPadding = contentPadding, content = content,
        )
    } else {
        OutlinedButton(
            onClick = onClick,
            modifier = (if (role == DialogRole.DISMISS) modifier.fillMaxWidth() else modifier).heightIn(min = if (role == null) 44.dp else 48.dp),
            enabled = enabled, shape = shape, border = BorderStroke(1.dp, CardBorder),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = Ink, disabledContentColor = Graphite),
            contentPadding = contentPadding, content = content,
        )
    }
}

@Composable
fun AlertDialog(
    onDismissRequest: () -> Unit,
    confirmButton: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    dismissButton: (@Composable () -> Unit)? = null,
    title: (@Composable () -> Unit)? = null,
    text: (@Composable () -> Unit)? = null,
) {
    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismissRequest,
        modifier = modifier.padding(horizontal = 16.dp).fillMaxWidth(),
        properties = DialogProperties(usePlatformDefaultWidth = false),
        shape = RoundedCornerShape(24.dp),
        containerColor = Color.White,
        title = title,
        text = text,
        confirmButton = {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                CompositionLocalProvider(LocalDialogRole provides DialogRole.CONFIRM) { confirmButton() }
                if (dismissButton != null) CompositionLocalProvider(LocalDialogRole provides DialogRole.DISMISS) { dismissButton() }
            }
        },
    )
}
