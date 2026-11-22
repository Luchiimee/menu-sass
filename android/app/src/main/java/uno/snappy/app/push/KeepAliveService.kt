package uno.snappy.app.push

import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import uno.snappy.app.MainActivity
import uno.snappy.app.R
import uno.snappy.app.SnappyApp

// Servicio en primer plano: mantiene viva la app (y su conexión en vivo con los pedidos) aunque se apague la pantalla.
class KeepAliveService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Notifications.ensureServiceChannel(this)
        val open = PendingIntent.getActivity(
            this, 1,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(this, Notifications.SERVICE_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_snappy)
            .setContentTitle("Snappy está escuchando pedidos")
            .setContentText("Tocá para abrir")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setSilent(true)
            .setContentIntent(open)
            .build()
        if (Build.VERSION.SDK_INT >= 34) startForeground(1001, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        else startForeground(1001, notification)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Si Android reinicia el servicio, esto levanta también la escucha de pedidos
        (application as SnappyApp).controller
        return START_STICKY
    }
}
