// Claves de localStorage que la parte PÚBLICA usa para el pedido en curso del cliente. Lógica pura, sin
// imports con alias (@/) para probarla con scripts/check-order-storage.mjs.
//
// "Empezar de cero" (handleFinalizarTodo) borraba TODO el localStorage del dominio, incluidas claves
// que no son del pedido (las del panel del dueño en el mismo navegador, las de otros servicios). Ahora
// borra solo estas claves, una por una.
//
//   activeOrderId        id del pedido en seguimiento (CartFooter)
//   snappy_active_order  el mismo id, guardado por el contexto del carrito (CartContext)
//   nroMesa              nombre de la mesa del pedido (CartFooter)
//   metodoEnvio          delivery, retiro o mesa (CartFooter, MpReturn)
//
// NO está acá snappy_mp_pending (estado de un pago de Mercado Pago en curso): lo maneja MpReturn y las
// mesas no lo usan. El carrito vive en memoria (CartContext), no en localStorage.

export const ORDER_STORAGE_KEYS = ['activeOrderId', 'snappy_active_order', 'nroMesa', 'metodoEnvio'] as const;

export type RemovableStorage = { removeItem(key: string): void };

// Borra solo ORDER_STORAGE_KEYS. Sin storage (SSR, bloqueado) no hace nada. Si una clave falla, sigue
// con las demás. Devuelve las claves que se pudieron borrar.
export function clearOrderStorage(storage: RemovableStorage | null | undefined): string[] {
  if (!storage || typeof storage.removeItem !== 'function') return [];
  const removed: string[] = [];
  for (const key of ORDER_STORAGE_KEYS) {
    try {
      storage.removeItem(key);
      removed.push(key);
    } catch {
      /* una clave que falla no frena a las otras */
    }
  }
  return removed;
}
