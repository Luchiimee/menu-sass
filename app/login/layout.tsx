import type { Metadata } from "next";

// Página de acceso: no debe aparecer en Google (ni como resultado ni como enlace debajo de snappy.uno).
export const metadata: Metadata = {
  title: "Iniciar sesión | Snappy",
  description: "Ingresá a tu panel de Snappy.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
