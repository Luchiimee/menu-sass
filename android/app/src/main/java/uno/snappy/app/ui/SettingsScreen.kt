package uno.snappy.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Switch
import androidx.compose.material3.TextButton
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import uno.snappy.app.data.AlertSettings

// Ajustes de este dispositivo: cómo avisa un pedido nuevo y cerrar sesión.
@Composable
fun SettingsScreen(state: UiState, vm: AppController) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Section("Aviso de pedido nuevo")
        Choice("Sonar una vez", "Como un mensaje común.", !state.alertRepeat) { vm.setAlertRepeat(false) }
        Choice("Repetir hasta atender", "Suena una y otra vez hasta que tomes el pedido (o toques Silenciar).", state.alertRepeat) { vm.setAlertRepeat(true) }
        if (state.alertRepeat) {
            Text("Esperar entre sonidos", fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp, bottom = 4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(10 to "10 s", 20 to "20 s", 30 to "30 s", 60 to "1 min").forEach { (sec, label) ->
                    FilterChip(selected = state.alertInterval == sec, onClick = { vm.setAlertInterval(sec) }, label = { Text(label) })
                }
            }
        }
        Text(
            "Con la app cerrada, el aviso lo muestra Android y suena una vez. La repetición funciona con la app abierta o en segundo plano.",
            style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp),
        )

        Section("Tono")
        Choice("Notificación", "Suave, el de los mensajes.", state.alertSound == AlertSettings.SOUND_NOTIFICATION) { vm.setAlertSound(AlertSettings.SOUND_NOTIFICATION) }
        Choice("Timbre", "El tono de llamada.", state.alertSound == AlertSettings.SOUND_RINGTONE) { vm.setAlertSound(AlertSettings.SOUND_RINGTONE) }
        Choice("Alarma", "El más fuerte, ideal para cocinas con ruido.", state.alertSound == AlertSettings.SOUND_ALARM) { vm.setAlertSound(AlertSettings.SOUND_ALARM) }
        OutlinedButton(onClick = vm::testSound, modifier = Modifier.padding(top = 8.dp)) { Text("Probar sonido") }

    }
}

@Composable
private fun Section(title: String) {
    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 20.dp, bottom = 4.dp))
}

@Composable
private fun Choice(title: String, subtitle: String, selected: Boolean, onSelect: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onSelect).padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        RadioButton(selected = selected, onClick = onSelect)
        Column(Modifier.padding(start = 4.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(subtitle, style = MaterialTheme.typography.bodySmall)
        }
    }
}
