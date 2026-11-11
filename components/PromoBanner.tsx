'use client';

import Link from 'next/link';
import { X } from 'lucide-react';

// Franja promocional fija arriba de la landing. Altura fija (h-11 = 44px): la navbar baja top-11 mientras se ve (app/page.tsx).
// Estática (sin animación). Si el texto no entra en el ancho, baja a dos líneas dentro de la misma altura.
export default function PromoBanner({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="region"
      aria-label="Promoción de noviembre"
      className="fixed top-0 inset-x-0 z-[110] h-11 bg-[#15160E] border-b border-white/10 text-white"
    >
      <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 flex items-center justify-center gap-2 sm:gap-4">
        <p className="min-w-0 text-[11px] sm:text-xs leading-tight text-center text-gray-200">
          <span className="hidden lg:inline">
            <b className="text-[#ffcc03] font-black tracking-wide">PROMO NOVIEMBRE</b> · Los primeros 10 negocios que se suscriban se llevan 5 remeras personalizadas para su equipo
          </span>
          <span className="lg:hidden">Promo noviembre: 5 remeras para tu equipo</span>
        </p>

        <Link
          href="/register?promo=noviembre"
          className="shrink-0 rounded-full bg-[#ffcc03] px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wide text-[#15160E] hover:brightness-95 transition"
        >
          Quiero la promo
        </Link>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar promoción"
          className="shrink-0 p-1 text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
