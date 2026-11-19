import type { MetadataRoute } from "next";

// Le dice a Google qué NO recorrer (panel, admin, API). Las páginas de acceso (login, registro) NO se bloquean acá:
// se marcan "noindex" en su propio layout, y para que Google lo lea tiene que poder entrar a verlas.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api/", "/baja"] }],
    sitemap: "https://snappy.uno/sitemap.xml",
    host: "https://snappy.uno",
  };
}
