package uno.snappy.app.ui

import androidx.compose.foundation.layout.Box
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
import uno.snappy.app.data.OrderStatus

@Composable
fun AppRoot(state: UiState, vm: AppController) {
    when (state.stage) {
        Stage.LOADING -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        Stage.LOGIN -> LoginScreen(state = state, onSignIn = vm::signIn)
        Stage.READY -> MainScaffold(state = state, vm = vm)
    }
}

@Composable
private fun MainScaffold(state: UiState, vm: AppController) {
    var tab by remember { mutableIntStateOf(0) }
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(state.message) {
        state.message?.let {
            snackbar.showSnackbar(it)
            vm.messageShown()
        }
    }

    val pending = state.orders.count { it.status == OrderStatus.PENDIENTE }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = tab == 0, onClick = { tab = 0 },
                    icon = { Icon(Icons.Filled.Receipt, contentDescription = null) },
                    label = { Text(if (pending > 0) "Pedidos ($pending)" else "Pedidos") },
                )
                NavigationBarItem(
                    selected = tab == 1, onClick = { tab = 1 },
                    icon = { Icon(Icons.Filled.Inventory2, contentDescription = null) },
                    label = { Text("Catálogo") },
                )
                NavigationBarItem(
                    selected = tab == 2, onClick = { tab = 2 },
                    icon = { Icon(Icons.Filled.Settings, contentDescription = null) },
                    label = { Text("Ajustes") },
                )
            }
        },
    ) { padding: PaddingValues ->
        Column(Modifier.padding(padding).fillMaxSize()) {
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
