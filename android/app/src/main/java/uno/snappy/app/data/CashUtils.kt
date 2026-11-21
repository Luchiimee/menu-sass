package uno.snappy.app.data

import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset

// Reglas de fechas de Caja: copia de lib/cashUtils.ts del panel web (hora de Argentina, UTC-3).
private val AR: ZoneOffset = ZoneOffset.ofHours(-3)

fun todayAR(): String = LocalDate.now(AR).toString()

// 'HH:MM' desde cash_close_hour ('HH:MM:SS', 'HH:MM', null o vacío -> '00:00')
fun normalizeCloseHour(closeHour: String?): String {
    val hhmm = closeHour?.trim()?.take(5) ?: ""
    return if (Regex("^\\d{2}:\\d{2}$").matches(hhmm)) hhmm else "00:00"
}

private fun at(date: String, hhmm: String): Instant = OffsetDateTime.parse("${date}T$hhmm:00-03:00").toInstant()

private fun arDate(i: Instant): String = i.minusSeconds(3 * 3600).atOffset(ZoneOffset.UTC).toLocalDate().toString()

fun parseTs(s: String?): Instant? = runCatching { OffsetDateTime.parse(s!!.replace(' ', 'T')).toInstant() }.getOrNull()

// Rango [inicio, fin) de los turnos del día de Caja `date`
fun cashShiftRange(date: String, closeHour: String): Pair<String, String> {
    val start = at(date, normalizeCloseHour(closeHour))
    return start.toString() to start.plusSeconds(24 * 3600).toString()
}

// Primera hora de cierre estrictamente posterior a la apertura del turno
fun expectedCloseTime(openedAt: Instant, closeHour: String): Instant {
    val sameDay = at(arDate(openedAt), closeHour)
    return if (sameDay.isAfter(openedAt)) sameDay else sameDay.plusSeconds(24 * 3600)
}

// ¿Quedó abierto un turno que ya pasó su hora de cierre?
fun isShiftStale(openedAt: String?, closeHour: String?, now: Instant = Instant.now()): Boolean {
    val opened = parseTs(openedAt) ?: return false
    return !now.isBefore(expectedCloseTime(opened, normalizeCloseHour(closeHour)))
}

// Fecha de Caja ('YYYY-MM-DD') a la que pertenece un turno
fun shiftBusinessDate(openedAt: String?, closeHour: String?): String {
    val opened = parseTs(openedAt) ?: return todayAR()
    val date = arDate(opened)
    val start = at(date, normalizeCloseHour(closeHour))
    if (!opened.isBefore(start)) return date
    return arDate(start.minusSeconds(24 * 3600))
}
