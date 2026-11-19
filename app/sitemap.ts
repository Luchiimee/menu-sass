import type { MetadataRoute } from "next";
import { RUBROS, RUBRO_PATH } from "@/lib/rubros";

// Lista de páginas que queremos que Google conozca. Solo las públicas y estables de Snappy.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://snappy.uno";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/demo`, changeFrequency: "monthly", priority: 0.7 },
    ...RUBROS.map((r) => ({ url: `${base}${RUBRO_PATH(r.slug)}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${base}/terminos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
