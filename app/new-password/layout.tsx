import type { Metadata } from "next";

// Página de acceso: no debe aparecer en Google (ni como resultado ni como enlace debajo de snappy.uno).
export const metadata: Metadata = {
  title: "Nueva contraseña | Snappy",
  description: "Elegí una nueva contraseña para tu cuenta de Snappy.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
