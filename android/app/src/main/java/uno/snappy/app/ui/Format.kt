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

// Supabase manda "2026-11-20T21:43:12.34+00:00": Instant.parse solo acepta la "Z" final.
private fun parseInstant(iso: String?): Instant =
    runCatching { java.time.OffsetDateTime.parse(iso).toInstant() }.getOrElse { Instant.parse(iso) }

fun formatMoney(value: Double?): String = money.format(value ?: 0.0)

fun formatTime(iso: String?): String = runCatching { dayHour.format(parseInstant(iso)) }.getOrDefault("")
fun formatHour(iso: String?): String = runCatching { hour.format(parseInstant(iso)) }.getOrDefault("")

// "recién", "hace 7 min", "hace 2 h 10 min"; pasadas 24 h muestra la fecha.
fun formatAgo(iso: String?): String = runCatching {
    val mins = java.time.Duration.between(parseInstant(iso), Instant.now()).toMinutes()
    when {
        mins < 1 -> "recién"
        mins < 60 -> "hace $mins min"
        mins < 24 * 60 -> "hace ${mins / 60} h ${mins % 60} min"
        else -> dayHour.format(parseInstant(iso))
    }
}.getOrDefault("")

private val dateLong = DateTimeFormatter.ofPattern("d 'de' MMMM yyyy", ar).withZone(ZoneId.of("America/Argentina/Buenos_Aires"))

// "7 de diciembre 2026"
fun formatDate(iso: String?): String = runCatching { dateLong.format(parseInstant(iso)) }.getOrDefault("—")

// Días que faltan hasta la fecha (0 si ya pasó o no se puede leer).
fun daysUntil(iso: String?): Int = runCatching {
    java.time.Duration.between(Instant.now(), parseInstant(iso)).toDays().toInt().coerceAtLeast(0)
}.getOrDefault(0)
