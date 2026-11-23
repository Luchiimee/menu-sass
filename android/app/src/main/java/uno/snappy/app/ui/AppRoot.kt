package uno.snappy.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.outlined.Assignment
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
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
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.graphics.vector.ImageVector
import uno.snappy.app.data.OrderStage
import uno.snappy.app.data.isShiftStale
import uno.snappy.app.data.shiftBusinessDate
import uno.snappy.app.data.todayAR
import uno.snappy.app.data.orderStage
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
        Stage.LOGIN -> LoginScreen(state = state, onSignIn = vm::signIn, onGoogle = vm::signInWithGoogle)
        Stage.READY -> MainScaffold(state = state, vm = vm)
    }
}

private data class NavEntry(val icon: ImageVector, val label: String, val badge: Int = 0)

@Composable
private fun NavIcon(e: NavEntry) {
    if (e.badge > 0) BadgedBox(badge = { Badge(containerColor = Alert, contentColor = androidx.compose.ui.graphics.Color.White) { Text("${e.badge}") } }) {
        Icon(e.icon, contentDescription = null)
    } else Icon(e.icon, contentDescription = null)
}

@Composable
private fun MainScaffold(state: UiState, vm: AppController) {
    var tab by remember { mutableIntStateOf(state.mainTab) }
    val setTab: (Int) -> Unit = { tab = it; vm.rememberMainTab(it) }
    val snackbar = remember { SnackbarHostState() }
    // Aviso de turno de caja viejo que quedó abierto (igual que el de la web): no se muestra dentro de Caja
    val staleShift = state.shift
    val closeHourCfg = state.restaurant?.cashCloseHour
    if (staleShift != null && tab != 2 && !state.staleDismissed && !state.cashLocked &&
        isShiftStale(staleShift.openedAt, closeHourCfg) && !vm.isStaleSnoozed(staleShift.id)
    ) {
        val bDate = shiftBusinessDate(staleShift.openedAt, closeHourCfg)
        val yesterday = java.time.LocalDate.parse(todayAR()).minusDays(1).toString()
        val cuando = if (bDate == yesterday) "de ayer" else "del ${bDate.substring(8, 10)}/${bDate.substring(5, 7)}"
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { vm.dismissStale() },
            title = { Text("Quedó el turno del ${bDate.substring(8, 10)}/${bDate.substring(5, 7)} abierto. ¿Querés cerrarlo y empezar uno nuevo?") },
            text = { Text("Mientras siga abierto, los pedidos nuevos entran en ese turno. Este aviso no cambia nada: los pedidos que ya entraron quedan en el turno que ya tienen.") },
            confirmButton = {
                androidx.compose.material3.TextButton(onClick = { vm.dismissStale(); vm.setCashDate(bDate); setTab(2) }) { Text("Cerrar el turno $cuando") }
            },
            dismissButton = {
                Column(horizontalAlignment = Alignment.End) {
                    androidx.compose.material3.TextButton(onClick = { vm.snoozeStale(staleShift.id) }) { Text("Continuar con el $cuando") }
                    androidx.compose.material3.TextButton(onClick = { vm.dismissStale() }) { Text("Decidir después") }
                }
            },
        )
    }

    // Tocar un aviso de pedido lleva a la pestaña Pedidos
    LaunchedEffect(state.focusKind) { if (state.focusKind != null) setTab(0) }

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

    // Un solo globito: todo lo que está sin atender (delivery + retiro + mesa)
    val pending = state.orders.count { orderStage(it) == OrderStage.NUEVO }
    val entries = listOf(
        NavEntry(Icons.Outlined.Assignment, "Pedidos", pending),
        NavEntry(Icons.Outlined.Restaurant, "Catálogo"),
        NavEntry(Icons.Outlined.Payments, "Caja"),
        NavEntry(Icons.Outlined.Menu, "Más"),
    )

    BoxWithConstraints(Modifier.fillMaxSize().background(androidx.compose.ui.graphics.Brush.verticalGradient(listOf(androidx.compose.ui.graphics.Color(0xFFCFF0DE), Paper), endY = 900f))) {
        // Tablet: barra lateral. Celular: barra de abajo.
        val wide = maxWidth >= 720.dp
        Scaffold(
            containerColor = androidx.compose.ui.graphics.Color.Transparent,
            snackbarHost = { SnackbarHost(snackbar) },
            bottomBar = {
                if (!wide) NavigationBar(containerColor = androidx.compose.ui.graphics.Color.White) {
                    entries.forEachIndexed { i, e ->
                        NavigationBarItem(
                            selected = tab == i, onClick = { setTab(i) },
                            icon = { NavIcon(e) },
                            label = { Text(e.label, fontWeight = if (tab == i) FontWeight.Bold else FontWeight.Medium, fontSize = 12.sp) },
                            colors = NavigationBarItemDefaults.colors(
                                indicatorColor = Fresco, selectedIconColor = androidx.compose.ui.graphics.Color.White, selectedTextColor = Ink,
                                unselectedIconColor = Graphite, unselectedTextColor = Graphite,
                            ),
                        )
                    }
                }
            },
        ) { padding: PaddingValues ->
            Row(Modifier.padding(padding).fillMaxSize()) {
                if (wide) NavigationRail(containerColor = androidx.compose.ui.graphics.Color.White) {
                    entries.forEachIndexed { i, e ->
                        NavigationRailItem(
                            selected = tab == i, onClick = { setTab(i) },
                            icon = { NavIcon(e) },
                            label = { Text(e.label) },
                        )
                    }
                }
                Column(Modifier.weight(1f).fillMaxSize()) {
                    Box(Modifier.weight(1f).fillMaxSize()) {
                        when (tab) {
                            0 -> OrdersScreen(state = state, vm = vm)
                            1 -> ProductsScreen(state = state, vm = vm)
                            2 -> CajaScreen(state = state, vm = vm)
                            else -> MoreScreen(state = state, vm = vm)
                        }
                    }
                }
            }
        }
    }
}
