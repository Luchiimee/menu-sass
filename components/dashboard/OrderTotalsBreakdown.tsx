// Desglose chico de un pedido guardado (Subtotal / Descuento / Envío) para mostrar justo antes
// del total en el panel Pedidos. Usa orderDisplayTotals (lib/orderTotals.ts), igual que la
// comanda impresa: no recalcula envío ni total. No muestra nada si el pedido no tiene descuento
// ni envío (mesa y retiro sin cambios) o si no hay un total válido.

import { orderDisplayTotals, type OrderTotalsInput } from '@/lib/orderTotals';

const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`;

interface Props {
  order: OrderTotalsInput | null | undefined;
  // light: tarjeta blanca · inverse: mosaico de mesa llamando al mozo (fondo de color) ·
  // dark: pie oscuro del detalle de mesa
  tone?: 'light' | 'inverse' | 'dark';
  align?: 'left' | 'right';
  className?: string;
}

export default function OrderTotalsBreakdown({ order, tone = 'light', align = 'right', className = '' }: Props) {
  const totals = orderDisplayTotals(order);
  if (!totals || (totals.descuento <= 0 && totals.envio <= 0)) return null;

  const muted = tone === 'light' ? 'text-gray-500' : tone === 'dark' ? 'text-gray-400' : 'text-white/80';
  const green = tone === 'light' ? 'text-green-600' : tone === 'dark' ? 'text-green-400' : 'text-white';
  const row = `flex gap-2 whitespace-nowrap ${align === 'right' ? 'justify-end' : 'justify-between'}`;

  return (
    <div className={`text-[10px] font-bold leading-tight space-y-0.5 tabular-nums ${muted} ${className}`}>
      <div className={row}>
        <span>Subtotal</span>
        <span>{fmt(totals.subtotal)}</span>
      </div>
      {totals.descuento > 0 && (
        <div className={`${row} ${green}`}>
          <span>Descuento</span>
          <span>−{fmt(totals.descuento)}</span>
        </div>
      )}
      {totals.envio > 0 && (
        <div className={row}>
          <span>Envío</span>
          <span>+{fmt(totals.envio)}</span>
        </div>
      )}
    </div>
  );
}
