// Lógica pura del carrito por renglones (sin React). La usa context/CartContext.tsx
// y se puede probar aislada (scripts/check-cart-lines.ts).
//
// Modelo: cada renglón es una combinación producto + extras. extrasList[].quantity
// es SIEMPRE "por unidad de producto". Combinaciones idénticas se agrupan sumando
// quantity. Precio del renglón = (price + Σ extra.price × extra.quantity) × quantity.
// El formato del renglón (id, name, price, quantity, uniqueId, extrasList) es el
// mismo que se guarda en orders.items: los pedidos viejos se leen igual.

export type CartExtra = { id: string; name: string; price: number; quantity: number };
export type NewId = (productId: any) => string;

// Clave de combinación: producto + extras ordenados por id con su cantidad por unidad.
export function cartLineKey(productId: any, extras: CartExtra[] = []): string {
  const ex = extras
    .filter((e) => e.quantity > 0)
    .map((e) => `${e.id}:${e.quantity}`)
    .sort()
    .join(',');
  return `${productId}|${ex}`;
}

export function cartLineTotal(item: any): number {
  const extrasTotal = (item.extrasList || []).reduce((a: number, b: any) => a + (b.price * b.quantity), 0);
  return (item.price + extrasTotal) * item.quantity;
}

export function cartTotal(list: any[]): number {
  return list.reduce((acc, item) => acc + cartLineTotal(item), 0);
}

// Suma `quantity` unidades de la combinación (base + extras): se agrupan en el
// renglón idéntico si existe; si no, renglón nuevo al final.
export function mergeUnits(list: any[], base: any, extras: CartExtra[], quantity: number, newId: NewId): any[] {
  if (quantity <= 0) return list;
  const cleanExtras = extras.filter((e) => e.quantity > 0).map((e) => ({ ...e }));
  const key = cartLineKey(base.id, cleanExtras);
  const idx = list.findIndex((it) => cartLineKey(it.id, it.extrasList || []) === key);
  if (idx >= 0) {
    return list.map((it, i) => (i === idx ? { ...it, quantity: it.quantity + quantity } : it));
  }
  const { uniqueId: _u, quantity: _q, extrasList: _e, extraId: _x, ...rest } = base;
  return [...list, { ...rest, uniqueId: newId(base.id), quantity, extrasList: cleanExtras }];
}

// Saca UNA unidad del renglón y la vuelve a meter con sus extras transformados.
// Con quantity = 1 y sin renglón idéntico, la unidad se queda en su lugar.
export function moveOneUnit(
  list: any[],
  uniqueId: string,
  transform: (extras: CartExtra[]) => CartExtra[],
  newId: NewId
): any[] {
  const line = list.find((it) => it.uniqueId === uniqueId);
  if (!line) return list;
  const newExtras = transform((line.extrasList || []).map((e: CartExtra) => ({ ...e }))).filter((e) => e.quantity > 0);
  const without = line.quantity > 1
    ? list.map((it) => (it.uniqueId === uniqueId ? { ...it, quantity: it.quantity - 1 } : it))
    : list.filter((it) => it.uniqueId !== uniqueId);

  if (line.quantity === 1) {
    const key = cartLineKey(line.id, newExtras);
    const hasTwin = without.some((it) => cartLineKey(it.id, it.extrasList || []) === key);
    if (!hasTwin) {
      return list.map((it) => (it.uniqueId === uniqueId ? { ...it, extrasList: newExtras } : it));
    }
  }
  return mergeUnits(without, line, newExtras, 1, newId);
}

export function setExtraQty(extras: CartExtra[], extra: Omit<CartExtra, 'quantity'>, quantity: number): CartExtra[] {
  const exists = extras.some((e) => e.id === extra.id);
  const next = exists
    ? extras.map((e) => (e.id === extra.id ? { ...e, quantity } : e))
    : [...extras, { ...extra, quantity }];
  return next.filter((e) => e.quantity > 0);
}

// Extra de UN renglón (controles del carrito): con quantity > 1 separa una unidad
// con el extra en la nueva cantidad; con quantity = 1 cambia el extra de esa unidad.
export function setLineExtra(
  list: any[],
  uniqueId: string,
  extraId: string,
  quantity: number,
  newId: NewId,
  extraData?: Omit<CartExtra, 'quantity'>
): any[] {
  const line = list.find((it) => it.uniqueId === uniqueId);
  if (!line) return list;
  const current = (line.extrasList || []).find((e: CartExtra) => e.id === extraId);
  const data = current ? { id: current.id, name: current.name, price: current.price } : extraData;
  if (!data) return list;
  return moveOneUnit(list, uniqueId, (extras) => setExtraQty(extras, data, Math.max(0, quantity)), newId);
}

// "+ Agregar extra" del carrito: suma el extra (1 por unidad, o uno más si ya
// estaba) a UNA unidad del renglón. Con quantity > 1 esa unidad pasa a su propio
// renglón (o se agrupa con uno idéntico); con quantity = 1 queda en el mismo.
export function addExtraToOneUnit(list: any[], uniqueId: string, extra: Omit<CartExtra, 'quantity'>, newId: NewId): any[] {
  const line = list.find((it) => it.uniqueId === uniqueId);
  if (!line) return list;
  const current = (line.extrasList || []).find((e: CartExtra) => e.id === extra.id)?.quantity || 0;
  return setLineExtra(list, uniqueId, extra.id, current + 1, newId, extra);
}

const sameProduct = (it: any, productId: any) => String(it.id) === String(productId);

export function productUnits(list: any[], productId: any): number {
  return list.filter((it) => sameProduct(it, productId)).reduce((acc, it) => acc + it.quantity, 0);
}

// Tarjeta de producto: + suma una unidad sin extras; − saca una unidad del
// renglón sin extras si existe, si no del último renglón de ese producto.
export function stepProduct(list: any[], product: any, delta: number, newId: NewId): any[] {
  if (delta > 0) return mergeUnits(list, product, [], delta, newId);
  const lines = list.filter((it) => sameProduct(it, product.id));
  if (lines.length === 0) return list;
  const target = lines.find((it) => !(it.extrasList || []).length) || lines[lines.length - 1];
  return target.quantity > 1
    ? list.map((it) => (it.uniqueId === target.uniqueId ? { ...it, quantity: it.quantity - 1 } : it))
    : list.filter((it) => it.uniqueId !== target.uniqueId);
}

// Cuántas veces está el extra en total entre todas las unidades del producto.
export function productExtraCount(list: any[], productId: any, extraId: string): number {
  return list
    .filter((it) => sameProduct(it, productId))
    .reduce((acc, it) => {
      const ex = (it.extrasList || []).find((e: CartExtra) => e.id === extraId);
      return acc + (ex ? ex.quantity * it.quantity : 0);
    }, 0);
}

// Tarjeta de producto: + suma el extra a UNA unidad (la que menos tiene de ese
// extra, primero las que no lo tienen); − se lo saca a una unidad que lo tenga.
export function stepProductExtra(
  list: any[],
  productId: any,
  extra: Omit<CartExtra, 'quantity'>,
  delta: number,
  newId: NewId
): any[] {
  const lines = list.filter((it) => sameProduct(it, productId));
  if (lines.length === 0) return list;
  const qtyOf = (it: any) => (it.extrasList || []).find((e: CartExtra) => e.id === extra.id)?.quantity || 0;

  let target: any;
  if (delta > 0) {
    target = [...lines].sort((a, b) => qtyOf(a) - qtyOf(b))[0];
  } else {
    const withExtra = lines.filter((it) => qtyOf(it) > 0);
    if (withExtra.length === 0) return list;
    target = withExtra[withExtra.length - 1];
  }
  const next = qtyOf(target) + (delta > 0 ? 1 : -1);
  return moveOneUnit(list, target.uniqueId, (extras) => setExtraQty(extras, extra, next), newId);
}
