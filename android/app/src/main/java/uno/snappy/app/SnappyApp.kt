package uno.snappy.app

import android.app.Application
import uno.snappy.app.push.Notifications

class SnappyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Notifications.ensureChannel(this)
    }
}
