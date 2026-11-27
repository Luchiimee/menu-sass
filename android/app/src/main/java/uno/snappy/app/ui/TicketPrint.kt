package uno.snappy.app.ui

import android.content.Context
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import uno.snappy.app.data.OrderDto
import uno.snappy.app.data.tableLabel

// Comanda impresa con el sistema de impresión de Android: sale por la impresora que el teléfono tenga vinculada
// (HP, Mopria, o una térmica a través de una app puente). Mismo contenido que el ticket del panel web, más la nota del cliente.
private var printView: WebView? = null

private fun esc(s: String?): String = (s ?: "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

fun printTicket(context: Context, restaurantName: String, order: OrderDto) {
    val lines = itemLines(order)
    val totals = orderTotals(order, lines)
    val sb = StringBuilder()
    sb.append("<html><head><meta charset='utf-8'><style>body{font-family:monospace;width:80mm;margin:0 auto;padding:10px;color:#000}")
    sb.append(".c{text-align:center}.row{display:flex;justify-content:space-between}.box{border:1px solid #000;padding:8px;border-radius:5px;margin:10px 0;font-size:14px}")
    sb.append(".items{border-top:1px solid #000;border-bottom:1px solid #000;padding:5px 0;margin-bottom:10px;font-size:13px}.ex{font-size:11px;margin-left:10px}")
    sb.append(".tot{border-top:2px dashed #000;padding-top:8px;margin-top:5px;font-size:22px;font-weight:bold}</style></head><body>")
    sb.append("<div class='c' style='border-bottom:2px dashed #000;padding-bottom:10px'><h2 style='margin:0;font-size:18px'>${esc(restaurantName.uppercase())}</h2>")
    if (order.orderType == "mesa") sb.append("<h1 style='margin:5px 0;font-size:24px'>${esc(tableLabel(order.tableNumber).uppercase())}</h1>")
    sb.append("<div style='font-size:12px;margin-top:5px'>COMANDA #${esc(order.id.take(5).uppercase())}</div>")
    sb.append("<div style='font-size:10px'>${esc(formatTime(order.createdAt))}</div></div>")
    sb.append("<div class='box'><div><b>CLIENTE:</b> ${esc((order.customerName ?: "").uppercase())}</div>")
    sb.append("<div><b>WHATSAPP:</b> ${esc(order.customerPhone?.takeIf { it.isNotBlank() } ?: "NO INFORMADO")}</div>")
    sb.append("<div><b>ENTREGA:</b> ${esc((order.orderType ?: "").uppercase())}</div>")
    order.address?.takeIf { it.isNotBlank() && order.orderType == "delivery" }?.let { sb.append("<div><b>DIRECCIÓN:</b> ${esc(it)}</div>") }
    if (order.orderType != "mesa") {
        val sched = order.scheduledDeliveryTime?.trim().orEmpty()
        if (sched.isNotEmpty() && !sched.equals("Inmediato", true)) sb.append("<div style='margin-top:6px;padding:5px;border:2px solid #000;text-align:center;font-size:14px'><b>ENTREGA PROGRAMADA: ${esc(sched)}</b></div>")
        else sb.append("<div><b>HORARIO:</b> LO ANTES POSIBLE</div>")
    }
    sb.append("</div><div class='items'>")
    lines.forEach { l ->
        sb.append("<div class='row' style='margin-bottom:3px'><span>${esc(l.qty)}x ${esc(l.name.uppercase())}</span><span>${esc(l.total?.let { formatMoney(it) } ?: "")}</span></div>")
        l.extras.forEach { sb.append("<div class='ex'>${esc(it.uppercase())}</div>") }
    }
    sb.append("</div>")
    (order.description?.takeIf { it.isNotBlank() } ?: order.notes?.takeIf { it.isNotBlank() })?.let {
        sb.append("<div class='box' style='font-size:14px'><b>NOTA:</b> ${esc(it)}</div>")
    }
    if (totals != null) {
        sb.append("<div class='row'><span>SUBTOTAL PRODUCTOS:</span><span>${esc(formatMoney(totals.subtotal))}</span></div>")
        if (totals.descuento > 0) sb.append("<div class='row'><span>${esc(order.couponCode?.takeIf { it.isNotBlank() }?.let { "DESCUENTO (CUPÓN ${it.uppercase()})" } ?: "DESCUENTO")}:</span><span>-${esc(formatMoney(totals.descuento))}</span></div>")
        if (totals.envio > 0) sb.append("<div class='row'><span>ENVÍO / DELIVERY:</span><span>+${esc(formatMoney(totals.envio))}</span></div>")
    }
    sb.append("<div class='row tot'><span>TOTAL:</span><span>${esc(formatMoney(order.total))}</span></div>")
    sb.append("<div class='row' style='font-size:12px;margin-top:6px'><span>PAGO:</span><span>${esc((order.paymentMethod ?: "").uppercase())}</span></div>")
    sb.append("<p class='c' style='font-size:10px;margin-top:25px'>Snappy · Tu Menú Digital</p></body></html>")

    val jobName = "Comanda ${order.id.take(5)}"
    val view = WebView(context)
    printView = view
    var started = false
    view.webViewClient = object : WebViewClient() {
        override fun onPageFinished(v: WebView, url: String?) {
            if (started) return
            started = true
            val pm = context.getSystemService(Context.PRINT_SERVICE) as PrintManager
            pm.print(jobName, v.createPrintDocumentAdapter(jobName), PrintAttributes.Builder().build())
        }
    }
    view.loadDataWithBaseURL(null, sb.toString(), "text/html", "UTF-8", null)
}
