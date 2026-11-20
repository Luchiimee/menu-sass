package uno.snappy.app.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.graphics.vector.ImageVector
import uno.snappy.app.data.OrderStatus
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import kotlinx.coroutines.delay

@Composable
fun AppRoot(state: UiState, vm: AppController) {
    when (state.stage) {
        Stage.LOADING -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        Stage.LOGIN -> LoginScreen(state = state, onSignIn = vm::signIn)
        Stage.READY -> MainScaffold(state = state, vm = vm)
    }
}

private data class NavEntry(val icon: ImageVector, val label: String)

@Composable
private fun MainScaffold(state: UiState, vm: AppController) {
    var tab by remember { mutableIntStateOf(0) }
    val snackbar = remember { SnackbarHostState() }

    // Al volver a la app se vuelve a leer todo, y mientras está abierta se revisa cada minuto
    // por si se cortó el "en vivo" (internet, celu dormido, etc.).
    val owner = LocalLifecycleOwner.current
    var foreground by remember { mutableStateOf(true) }
    DisposableEffect(owner) {
        val obs = LifecycleEventObserver { _, e ->
            if (e == Lifecycle.Event.ON_START) { foreground = true; vm.resync() }
            if (e == Lifecycle.Event.ON_STOP) foreground = false
        }
        owner.lifecycle.addObserver(obs)
        onDispose { owner.lifecycle.removeObserver(obs) }
    }
    LaunchedEffect(foreground) {
        while (foreground) {
            delay(60_000)
            vm.resync()
        }
    }

    LaunchedEffect(state.message) {
        state.message?.let {
            snackbar.showSnackbar(it)
            vm.messageShown()
        }
    }

    val pending = state.orders.count { it.status == OrderStatus.PENDIENTE }
    val entries = listOf(
        NavEntry(Icons.Filled.Receipt, if (pending > 0) "Pedidos ($pending)" else "Pedidos"),
        NavEntry(Icons.Filled.Inventory2, "Catálogo"),
        NavEntry(Icons.Filled.Settings, "Ajustes"),
    )

    BoxWithConstraints(Modifier.fillMaxSize()) {
        // Tablet: barra lateral. Celular: barra de abajo.
        val wide = maxWidth >= 720.dp
        Scaffold(
            snackbarHost = { SnackbarHost(snackbar) },
            bottomBar = {
                if (!wide) NavigationBar(containerColor = androidx.compose.ui.graphics.Color.White) {
                    entries.forEachIndexed { i, e ->
                        NavigationBarItem(
                            selected = tab == i, onClick = { tab = i },
                            icon = { Icon(e.icon, contentDescription = null) },
                            label = { Text(e.label) },
                        )
                    }
                }
            },
        ) { padding: PaddingValues ->
            Row(Modifier.padding(padding).fillMaxSize()) {
                if (wide) NavigationRail(containerColor = androidx.compose.ui.graphics.Color.White) {
                    entries.forEachIndexed { i, e ->
                        NavigationRailItem(
                            selected = tab == i, onClick = { tab = i },
                            icon = { Icon(e.icon, contentDescription = null) },
                            label = { Text(e.label) },
                        )
                    }
                }
                Column(Modifier.weight(1f).fillMaxSize()) {
                    if (state.keepAlive) BatteryBanner()
                    Box(Modifier.weight(1f).fillMaxSize()) {
                        when (tab) {
                            0 -> OrdersScreen(state = state, vm = vm)
                            1 -> ProductsScreen(state = state, vm = vm)
                            else -> SettingsScreen(state = state, vm = vm)
                        }
                    }
                }
            }
        }
    }
}
