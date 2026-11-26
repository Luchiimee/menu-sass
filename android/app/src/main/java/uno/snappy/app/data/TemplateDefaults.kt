package uno.snappy.app.data

// Colores originales de cada plantilla. Copia de TEMPLATE_DEFAULTS de la web (app/dashboard/templates/page.tsx):
// al elegir una plantilla se reemplazan los colores del menú por estos, igual que en el panel web.
object TemplateDefaults {
    private val raw: Map<String, Map<String, Any>> = mapOf(
        "classic" to mapOf("theme" to "#d32f2f", "bg" to "#ffffff", "card" to "#ffffff", "text" to "#ffffff", "desc" to "#ffffff", "card_name" to "#000000", "card_desc" to "#666666", "card_price" to "#d32f2f", "btn_bg" to "#ffffff", "btn_text" to "#000000", "promo" to "#ffebee", "promo_text" to "#d32f2f", "banner" to false),
        "urban" to mapOf("theme" to "#ea580c", "bg" to "#121212", "card" to "#1E1E1E", "text" to "#ffffff", "desc" to "#888888", "card_name" to "#ffffff", "card_desc" to "#888888", "card_price" to "#ea580c", "btn_bg" to "#ffffff", "btn_text" to "#121212", "promo" to "#1E1E1E", "promo_text" to "#ffffff", "banner" to false),
        "minimal" to mapOf("theme" to "#000000", "bg" to "#ffffff", "card" to "#ffffff", "text" to "#111111", "desc" to "#777777", "card_name" to "#111111", "card_desc" to "#999999", "card_price" to "#111111", "btn_bg" to "#111111", "btn_text" to "#ffffff", "promo" to "#fafafa", "promo_text" to "#111111", "banner" to false),
        "visualgrid" to mapOf("theme" to "#ea580c", "bg" to "#1a1a1a", "card" to "#2a2a2a", "text" to "#ffffff", "desc" to "#bbbbbb", "card_name" to "#ffffff", "card_desc" to "#bbbbbb", "card_price" to "#ea580c", "btn_bg" to "#ea580c", "btn_text" to "#ffffff", "promo" to "#1a1a1a", "promo_text" to "#ea580c", "banner" to false),
        "spotlight" to mapOf("theme" to "#FFD700", "bg" to "#ffffff", "card" to "#ffffff", "text" to "#000000", "desc" to "#666666", "card_name" to "#000000", "card_desc" to "#666666", "card_price" to "#000000", "btn_bg" to "#000000", "btn_text" to "#ffffff", "promo" to "#fff3e0", "promo_text" to "#000000", "banner" to true),
        "icecream-v1" to mapOf("theme" to "#6366f1", "bg" to "#f8fafc", "text" to "#0f172a", "desc" to "#64748b", "card_name" to "#0f172a", "card_desc" to "#64748b", "card_price" to "#6366f1", "btn_bg" to "#6366f1", "btn_text" to "#ffffff", "promo" to "#eef2ff", "promo_text" to "#4f46e5", "banner" to false),
        "marketpro" to mapOf("theme" to "#000000", "bg" to "#ffffff", "text" to "#000000", "desc" to "#999999", "card_name" to "#000000", "card" to "#ffffff", "card_desc" to "#999999", "card_price" to "#059669", "btn_bg" to "#000000", "btn_text" to "#ffffff", "promo" to "#f3f4f6", "promo_text" to "#000000", "banner" to true, "cat_bg_color" to "#f3f4f6", "cat_text_color" to "#999999", "cat_title_color" to "#000000", "search_bg_color" to "#f3f4f6", "search_icon_color" to "#9ca3af"),
        "alterna-pro" to mapOf("theme" to "#ea580c", "bg" to "#fafaf9", "card" to "#ffffff", "text" to "#111827", "desc" to "#94a3b8", "promo" to "#ffffff", "banner" to false),
        "carta" to mapOf("theme" to "#B5863A", "bg" to "#F7F3EE", "text" to "#ffffff", "desc" to "#94a3b8", "card" to "#ffffff", "card_name" to "#1C1A18", "card_desc" to "#8A877F", "card_price" to "#B5863A", "btn_bg" to "#1C1A18", "btn_text" to "#ffffff", "promo" to "#F0E6D3", "promo_text" to "#92620a", "banner" to false, "cat_bg_color" to "#ffffff", "cat_text_color" to "#1C1A18", "search_bg_color" to "#ffffff", "search_icon_color" to "#B5863A"),
        "argentina" to mapOf("theme" to "#3E7CB1", "bg" to "#ffffff", "card" to "#6CACE4", "text" to "#15160E", "desc" to "#86877B", "card_name" to "#0E2A45", "card_desc" to "#1B3A57", "card_price" to "#0E2A45", "btn_bg" to "#F2B705", "btn_text" to "#4a3600", "promo" to "#FFF7E0", "promo_text" to "#4a3600", "banner" to true, "cat_bg_color" to "#f3f4f6", "cat_text_color" to "#9ca3af", "search_bg_color" to "#f3f4f6", "search_icon_color" to "#3E7CB1"),
        "portada" to mapOf("theme" to "#1BB179", "bg" to "#F5F5EF", "card" to "#FFFFFF", "text" to "#15160E", "desc" to "#86877B", "card_name" to "#15160E", "card_desc" to "#86877B", "card_price" to "#15160E", "btn_bg" to "#1BB179", "btn_text" to "#FFFFFF", "promo" to "#E4F6EE", "promo_text" to "#0F7A53", "banner" to true, "cat_bg_color" to "#ECEBE3", "cat_text_color" to "#15160E", "search_bg_color" to "#ECEBE3", "search_icon_color" to "#86877B"),
    )

    // Columnas de `restaurants` que pisa la galería de la web al elegir una plantilla.
    fun columns(id: String): Map<String, Any>? {
        val d = raw[id] ?: return null
        val out = linkedMapOf<String, Any>("template_id" to id)
        fun put(col: String, v: Any?) { if (v != null) out[col] = v }
        put("theme_color", d["theme"]); put("bg_color", d["bg"]); put("text_color", d["text"]); put("description_color", d["desc"])
        put("card_color", d["card"] ?: d["bg"])
        put("card_name_color", d["card_name"]); put("card_desc_color", d["card_desc"]); put("card_price_color", d["card_price"])
        put("card_btn_bg", d["btn_bg"]); put("card_btn_text", d["btn_text"])
        put("promo_bg_color", d["promo"]); put("promo_text_color", d["promo_text"] ?: d["theme"])
        out["show_banner"] = d["banner"] ?: false
        out["cat_bg_color"] = d["cat_bg_color"] ?: "#f3f4f6"
        out["cat_text_color"] = d["cat_text_color"] ?: "#999999"
        out["cat_title_color"] = d["cat_title_color"] ?: "#000000"
        out["search_bg_color"] = d["search_bg_color"] ?: "#f3f4f6"
        out["search_icon_color"] = d["search_icon_color"] ?: "#9ca3af"
        return out
    }
}
