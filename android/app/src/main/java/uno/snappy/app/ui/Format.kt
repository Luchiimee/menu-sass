package uno.snappy.app.ui

import java.text.NumberFormat
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val ar = Locale("es", "AR")
private val money = NumberFormat.getCurrencyInstance(ar).apply { maximumFractionDigits = 0 }
private val hour = DateTimeFormatter.ofPattern("HH:mm", ar).withZone(ZoneId.of("America/Argentina/Buenos_Aires"))
private val dayHour = DateTimeFormatter.ofPattern("dd/MM HH:mm", ar).withZone(ZoneId.of("America/Argentina/Buenos_Aires"))

fun formatMoney(value: Double?): String = money.format(value ?: 0.0)

fun formatTime(iso: String?): String = runCatching { dayHour.format(Instant.parse(iso)) }.getOrDefault("")
fun formatHour(iso: String?): String = runCatching { hour.format(Instant.parse(iso)) }.getOrDefault("")

// "recién", "hace 7 min", "hace 2 h 10 min"; pasadas 24 h muestra la fecha.
fun formatAgo(iso: String?): String = runCatching {
    val mins = java.time.Duration.between(Instant.parse(iso), Instant.now()).toMinutes()
    when {
        mins < 1 -> "recién"
        mins < 60 -> "hace $mins min"
        mins < 24 * 60 -> "hace ${mins / 60} h ${mins % 60} min"
        else -> dayHour.format(Instant.parse(iso))
    }
}.getOrDefault("")
