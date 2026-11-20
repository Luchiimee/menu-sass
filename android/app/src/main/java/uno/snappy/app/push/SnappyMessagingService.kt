package uno.snappy.app.push

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import uno.snappy.app.data.Repository

// Recibe los avisos de Firebase. El servidor manda mensajes solo de datos (title/body/orderId)
// y la app arma la notificación, así suena igual con la app abierta, en segundo plano o cerrada.
class SnappyMessagingService : FirebaseMessagingService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        val title = data["title"] ?: message.notification?.title ?: "Nuevo pedido"
        val body = data["body"] ?: message.notification?.body ?: "Tocá para ver el detalle"
        Notifications.showOrder(applicationContext, title, body, data["orderId"])
    }

    // Firebase renueva el token de vez en cuando: si hay sesión iniciada lo guardamos de nuevo.
    override fun onNewToken(token: String) {
        scope.launch {
            val repo = Repository()
            runCatching {
                repo.awaitSession()
                if (repo.hasSession()) repo.saveFcmToken(token)
            }
        }
    }
}
