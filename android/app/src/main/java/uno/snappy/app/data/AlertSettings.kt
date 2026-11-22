package uno.snappy.app.data

import android.content.Context

// Ajustes del aviso de pedido nuevo. Se guardan en el celu/tablet: cada dispositivo elige el suyo.
class AlertSettings(context: Context) {
    private val prefs = context.getSharedPreferences("alertas", Context.MODE_PRIVATE)

    // false = suena una vez (como un mensaje); true = suena hasta que alguien atienda el pedido
    var repeat: Boolean
        get() = prefs.getBoolean("repeat", false)
        set(value) { prefs.edit().putBoolean("repeat", value).apply() }

    var sound: String
        get() = prefs.getString("sound", SOUND_NOTIFICATION) ?: SOUND_NOTIFICATION
        set(value) { prefs.edit().putString("sound", value).apply() }

    // Mantener la app activa con un servicio en primer plano (recomendado en locales)
    var keepAlive: Boolean
        // Por defecto encendido: en Samsung (y otras marcas) cerrar la app desde recientes frena los avisos de
        // Firebase; con el servicio en primer plano llegan siempre. Clave nueva para pisar lo guardado antes.
        get() = prefs.getBoolean("keepAlive3", true)
        set(value) { prefs.edit().putBoolean("keepAlive3", value).apply() }

    // Segundos de espera entre un sonido y el siguiente cuando está en "repetir"
    var intervalSec: Int
        get() = prefs.getInt("interval", 20)
        set(value) { prefs.edit().putInt("interval", value).apply() }

    companion object {
        const val SOUND_NOTIFICATION = "notification"
        const val SOUND_RINGTONE = "ringtone"
        const val SOUND_ALARM = "alarm"
    }
}
