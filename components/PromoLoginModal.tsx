"use client";

// Modal de la promo de remeras que se abre desde los botones de la landing que llevan a /login.
// - role="dialog" + aria-modal, foco al abrir (en "Quiero la promo") y al cerrar (vuelve a quien lo abrió).
// - Se cierra con la X, con Escape y tocando el fondo. Tab se queda dentro del modal.
// - Bloquea el scroll del body mientras está abierto.
// - Los enlaces del modal son <Link> normales: navegan directo, no vuelven a abrir el modal.
// - "Ya tengo cuenta" avisa con onHaveAccount (la página guarda ahí que ya lo eligió) y navega a /login.

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onHaveAccount?: () => void;
};

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function PromoLoginModal({ open, onClose, onHaveAccount }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primaryRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && previouslyFocused.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-login-title"
        aria-describedby="promo-login-text"
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[2rem] bg-white p-6 pt-12 text-center shadow-2xl sm:p-8 sm:pt-12"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-fresco"
        >
          <X size={20} />
        </button>

        <h2 id="promo-login-title" className="mb-3 text-xl font-black leading-tight text-gray-900 sm:text-2xl">
          ¿Querés entrar a la promo de las remeras?
        </h2>
        <p id="promo-login-text" className="mb-6 text-sm leading-relaxed text-gray-600 sm:text-base">
          Los primeros 10 negocios en abonar su primera suscripción se llevan 5 remeras personalizadas para su equipo.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            ref={primaryRef}
            href="/register?promo=noviembre"
            className="block w-full rounded-2xl bg-fresco px-6 py-4 text-center text-sm font-black uppercase tracking-wide text-white shadow-lg transition hover:bg-fresco/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-fresco/40"
          >
            Quiero la promo
          </Link>
          <Link
            href="/login"
            onClick={onHaveAccount}
            className="block w-full rounded-2xl border-2 border-gray-200 px-6 py-3.5 text-center text-sm font-bold text-gray-600 transition hover:border-black hover:text-black focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-300"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}
