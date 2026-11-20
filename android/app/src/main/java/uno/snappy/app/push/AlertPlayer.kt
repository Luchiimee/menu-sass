package uno.snappy.app.push

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.PowerManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import uno.snappy.app.data.AlertSettings

// Reproduce el sonido de pedido nuevo: una vez (aviso / prueba) o repetido con una espera entre sonidos hasta que se detenga.
class AlertPlayer(private val context: Context) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var job: Job? = null
    private var wake: PowerManager.WakeLock? = null

    // Mientras la alarma repite, el CPU no se duerme (si no, Android congela la espera entre sonidos)
    private fun keepAwake() {
        runCatching {
            if (wake == null) {
                wake = context.getSystemService(PowerManager::class.java)
                    ?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "snappy:alarma")
                    ?.apply { setReferenceCounted(false) }
            }
            wake?.acquire(60_000L)
        }
    }

    private fun releaseAwake() {
        runCatching { if (wake?.isHeld == true) wake?.release() }
    }
    private var once: MediaPlayer? = null

    private fun build(sound: String): MediaPlayer? = runCatching {
        val (type, usage) = when (sound) {
            AlertSettings.SOUND_ALARM -> RingtoneManager.TYPE_ALARM to AudioAttributes.USAGE_ALARM
            AlertSettings.SOUND_RINGTONE -> RingtoneManager.TYPE_RINGTONE to AudioAttributes.USAGE_NOTIFICATION_RINGTONE
            else -> RingtoneManager.TYPE_NOTIFICATION to AudioAttributes.USAGE_NOTIFICATION
        }
        MediaPlayer().apply {
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(usage)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            setDataSource(context, RingtoneManager.getDefaultUri(type))
            prepare()
        }
    }.getOrNull()

    // Espera un momento (para no pisar el sonido del aviso de Firebase, que llega unos segundos después),
    // suena, espera `intervalSec` segundos y vuelve a sonar, hasta que se llame a stop().
    fun start(sound: String, intervalSec: Int, initialDelaySec: Int = 8) {
        stop()
        job = scope.launch {
            keepAwake()
            delay(intervalSec.coerceAtLeast(3) * 1000L) // el primer sonido ya lo da la notificación
            while (isActive) {
                keepAwake()
                playOnce(sound)
                delay(intervalSec.coerceAtLeast(3) * 1000L)
            }
        }
    }

    fun stop() {
        job?.cancel()
        job = null
        releaseAwake()
    }

    fun playOnce(sound: String) {
        once?.let { runCatching { it.stop() }; it.release() }
        once = build(sound)?.also { mp ->
            mp.setOnCompletionListener { it.release(); if (once === it) once = null }
            runCatching { mp.start() }
        }
    }
}
