import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo | Snappy",
  description: "Probá la demo de Snappy: elegí un plan y mirá cómo se ve el menú digital de tu negocio y cómo recibís los pedidos.",
  alternates: { canonical: "/demo" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
