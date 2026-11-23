package uno.snappy.app

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import uno.snappy.app.ui.AppRoot
import uno.snappy.app.ui.AppController
import uno.snappy.app.ui.SnappyTheme

class MainActivity : ComponentActivity() {
    // Al tocar un aviso de pedido, la app abre directo en Pedidos y en la solapa que corresponde (Delivery, Retiro o Mesa).
    private fun handleIntent(i: android.content.Intent?) {
        val type = i?.getStringExtra("orderType") ?: return
        i.removeExtra("orderType")
        viewModel.focusOrderType(type)
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private val viewModel: AppController get() = (application as SnappyApp).controller

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* sin acción: es un permiso opcional */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (savedInstanceState == null) handleIntent(intent)
        if (Build.VERSION.SDK_INT >= 33) notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        // Botones del sistema (atrás, inicio, recientes) oscuros: la barra de abajo de la app es blanca.
        androidx.core.view.WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightNavigationBars = true
        setContent {
            SnappyTheme {
                val state by viewModel.state.collectAsStateWithLifecycle()
                AppRoot(state = state, vm = viewModel)
            }
        }
    }
}
