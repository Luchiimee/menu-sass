package uno.snappy.app

import android.app.Application
import uno.snappy.app.push.Notifications
import uno.snappy.app.ui.AppController

class SnappyApp : Application() {
    // Un solo controlador para toda la vida del proceso (lo usan la pantalla y el servicio en primer plano)
    val controller: AppController by lazy { AppController(this) }

    override fun onCreate() {
        super.onCreate()
        Notifications.ensureChannel(this)
        controller // arranca la escucha de pedidos si hay sesión, aunque el proceso lo haya despertado un aviso
    }
}
