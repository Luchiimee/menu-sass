export type SaleOrderType = 'mesa' | 'retiro' | 'delivery' | 'mostrador';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

export interface ShiftOrder {
  id: string;
  order_type: string;
  payment_method: string;
  total: number | string;
  status: string;
}

export interface ShiftExpense {
  id: string;
  amount: number | string;
  description: string;
  category: string | null;
}

export interface SalesByType {
  count: number;
  total: number;
}

export interface ShiftSummary {
  salesByType: {
    mesa: SalesByType;
    retiro: SalesByType;
    delivery: SalesByType;
    mostrador: SalesByType;
  };
  byPaymentMethod: {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
  };
  openingBalance: number;
  deliveryCount: number;
  deliveryCostTotal: number;
  totalExpenses: number;
  totalSales: number;
  netProfit: number;
  orderCount: number;
}

const SALE_TYPES: SaleOrderType[] = ['mesa', 'retiro', 'delivery', 'mostrador'];

/**
 * Calcula el rango ISO (UTC) del "día de caja" para una fecha y hora de cierre dadas.
 * Argentina no observa horario de verano: UTC-3 constante.
 *
 * El "día de negocio D" es siempre una ventana de exactamente 24h:
 *   start = D a closeHour ART
 *   end   = D+1 a closeHour ART (= start + 24h)
 *
 * Para cierres después de medianoche (ej. '03:00'):
 *   date='2026-06-20' → [June 20 03:00 ART, June 21 03:00 ART]
 *   El pedido de las 00:02 ART del 21 cae en el rango del 20 ✓
 *
 * Para cierres antes de medianoche (ej. '22:00'):
 *   date='2026-06-20' → [June 20 22:00 ART, June 21 22:00 ART]
 *
 * Para '00:00' (medianoche):
 *   date='2026-06-20' → [June 20 00:00 ART, June 21 00:00 ART] = día calendario ✓
 *
 * Rangos consecutivos no se solapan.
 */
export function getCashShiftRange(
  date: string,      // 'YYYY-MM-DD' en timezone Argentina
  closeHour: string  // 'HH:MM'
): { start: string; end: string } {
  const startDate = new Date(`${date}T${closeHour}:00-03:00`);
  const endDate   = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  return { start: startDate.toISOString(), end: endDate.toISOString() };
}

/**
 * Devuelve el timestamp esperado de cierre automático para un turno,
 * dado su opened_at y el cash_close_hour del restaurant.
 *
 * Lógica: primer ocurrencia de closeHour que sea ESTRICTAMENTE posterior a opened_at.
 * - Si closeHour del mismo día en ART > opened_at → usar ese.
 * - Si no → usar closeHour del día siguiente.
 *
 * Usado por el cron para comparar con now() y decidir si auto-cerrar.
 */
export function getExpectedCloseTime(openedAt: string, closeHour: string): Date {
  const opened = new Date(openedAt);

  // Obtener la fecha ART del opened_at: restando 3h a UTC da el "pseudo-UTC" con fecha ART
  const artProxy = new Date(opened.getTime() - 3 * 60 * 60 * 1000);
  const artDateStr = artProxy.toISOString().split('T')[0]; // 'YYYY-MM-DD' en ART

  // Candidato: closeHour del mismo día ART
  const sameDayClose = new Date(`${artDateStr}T${closeHour}:00-03:00`);

  if (sameDayClose > opened) {
    return sameDayClose;
  }

  // Candidato: closeHour del día siguiente ART
  const nextDayClose = new Date(sameDayClose.getTime() + 24 * 60 * 60 * 1000);
  return nextDayClose;
}

/**
 * Construye el snapshot de resumen de cierre.
 * Este objeto se guarda en cash_shifts.summary (JSONB) al momento del cierre.
 */
export function buildShiftSummary(
  orders: ShiftOrder[],
  expenses: ShiftExpense[],
  deliveryCost: number,
  openingBalance = 0
): ShiftSummary {
  const EXCLUDED_STATUSES = ['pendiente', 'cancelado'];
  const sales = orders.filter(o =>
    SALE_TYPES.includes(o.order_type as SaleOrderType) &&
    !EXCLUDED_STATUSES.includes(o.status)
  );

  const salesByType: ShiftSummary['salesByType'] = {
    mesa:      { count: 0, total: 0 },
    retiro:    { count: 0, total: 0 },
    delivery:  { count: 0, total: 0 },
    mostrador: { count: 0, total: 0 },
  };

  const byPaymentMethod: ShiftSummary['byPaymentMethod'] = {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
  };

  for (const o of sales) {
    const amount = Number(o.total) || 0;
    const type = o.order_type as SaleOrderType;
    if (type in salesByType) {
      salesByType[type].count += 1;
      salesByType[type].total += amount;
    }
    const pm = o.payment_method as PaymentMethod;
    if (pm in byPaymentMethod) byPaymentMethod[pm] += amount;
  }

  const deliveryCount = salesByType.delivery.count;
  const deliveryCostTotal = deliveryCount * (deliveryCost || 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalSales = Object.values(salesByType).reduce((acc, v) => acc + v.total, 0);
  const netProfit = totalSales - deliveryCostTotal - totalExpenses;

  return {
    salesByType,
    byPaymentMethod,
    openingBalance,
    deliveryCount,
    deliveryCostTotal,
    totalExpenses,
    totalSales,
    netProfit,
    orderCount: sales.length,
  };
}
