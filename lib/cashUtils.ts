export type SaleOrderType = 'mesa' | 'retiro' | 'delivery' | 'mostrador';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

export interface ShiftOrder {
  id: string;
  order_type: string;
  payment_method: string;
  total: number | string;
  status: string;
  // Envío cobrado en el pedido (orders.delivery_cost). null / ausente = 0
  delivery_cost?: number | string | null;
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
  // Cómo se calculó deliveryCostTotal. 'cobrado' = suma de orders.delivery_cost (lo que se le
  // entrega al repartidor). Los cierres guardados antes de este cambio NO lo tienen: su
  // deliveryCostTotal es cantidad de envíos × restaurants.delivery_cost (tarifa fija) y se
  // muestran tal cual, sin recalcular.
  deliveryBasis?: 'cobrado';
}

const SALE_TYPES: SaleOrderType[] = ['mesa', 'retiro', 'delivery', 'mostrador'];
const EXCLUDED_STATUSES = ['pendiente', 'cancelado'];

// Número desde number o string numérico; null, '' u otra cosa → 0
function amountOf(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const isCountedSale = (o: { order_type: string; status: string }) =>
  SALE_TYPES.includes(o.order_type as SaleOrderType) && !EXCLUDED_STATUSES.includes(o.status);

/**
 * Envío cobrado en los pedidos de venta (sin pendientes ni cancelados): plata del repartidor,
 * no del local. Solo cuentan los pedidos de envío (order_type 'delivery'); mesa, retiro,
 * mostrador y apertura no restan nada aunque tuvieran un delivery_cost cargado.
 * count = envíos con costo cobrado mayor a 0. Limitación conocida: un envío gratis (0) no resta
 * nada aunque el local le pague al repartidor.
 */
export function deliveryCollected(
  orders: { order_type: string; status: string; delivery_cost?: unknown }[]
): { count: number; total: number } {
  let count = 0;
  let total = 0;
  for (const o of orders) {
    if (!isCountedSale(o) || o.order_type !== 'delivery') continue;
    const cost = amountOf(o.delivery_cost);
    if (cost > 0) {
      count += 1;
      total += cost;
    }
  }
  return { count, total };
}

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

// 'HH:MM' desde restaurants.cash_close_hour ('HH:MM:SS', 'HH:MM', null o vacío → '00:00'),
// el mismo valor por defecto que usan Caja, Rentabilidad y el cron
export function normalizeCloseHour(closeHour: string | null | undefined): string {
  const hhmm = typeof closeHour === 'string' ? closeHour.trim().slice(0, 5) : '';
  return /^\d{2}:\d{2}$/.test(hhmm) ? hhmm : '00:00';
}

/**
 * ¿El turno abierto ya pasó su hora de cierre? Es la primera cash_close_hour (hora Argentina)
 * posterior a la apertura, la misma que usa el cron (getExpectedCloseTime). Sirve para avisarle
 * al dueño que quedó una caja vieja abierta: no cierra nada.
 */
export function isShiftStale(openedAt: string, closeHour: string | null | undefined, now: Date = new Date()): boolean {
  const opened = new Date(openedAt);
  if (Number.isNaN(opened.getTime())) return false;
  return now.getTime() >= getExpectedCloseTime(openedAt, normalizeCloseHour(closeHour)).getTime();
}

/**
 * Fecha de Caja ('YYYY-MM-DD', hora Argentina) a la que pertenece un turno: el día D tal que la
 * apertura cae en [D a closeHour, D+1 a closeHour), como arma los rangos getCashShiftRange.
 * Ej.: cierre 03:00 y apertura el 02/11 a la 01:00 → caja del 01/11.
 */
export function shiftBusinessDate(openedAt: string, closeHour: string | null | undefined): string {
  const opened = new Date(openedAt);
  const artDate = new Date(opened.getTime() - 3 * 60 * 60 * 1000).toISOString().split('T')[0];
  const start = new Date(`${artDate}T${normalizeCloseHour(closeHour)}:00-03:00`);
  if (opened >= start) return artDate;
  return new Date(start.getTime() - 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/**
 * Construye el snapshot de resumen de cierre.
 * Este objeto se guarda en cash_shifts.summary (JSONB) al momento del cierre.
 * El costo de delivery es lo cobrado en cada pedido (deliveryCollected), no la tarifa fija:
 * el envío lo paga el cliente y se le entrega al repartidor.
 */
export function buildShiftSummary(
  orders: ShiftOrder[],
  expenses: ShiftExpense[],
  openingBalance = 0
): ShiftSummary {
  const sales = orders.filter(isCountedSale);

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

  const { count: deliveryCount, total: deliveryCostTotal } = deliveryCollected(sales);
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
    deliveryBasis: 'cobrado',
  };
}
