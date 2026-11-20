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
    private val viewModel: AppController get() = (application as SnappyApp).controller

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* sin acción: es un permiso opcional */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 33) notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        setContent {
            SnappyTheme {
                val state by viewModel.state.collectAsStateWithLifecycle()
                AppRoot(state = state, vm = viewModel)
            }
        }
    }
}
