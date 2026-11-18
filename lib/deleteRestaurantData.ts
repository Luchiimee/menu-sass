// Borrado de los datos de un local cancelado (retención de datos). SOLO servidor. Las dependencias se inyectan para
// probarlo sin red ni base: scripts/check-delete-restaurant.mjs.
//
// Orden (pensado para que un fallo nunca deje algo a medias que no se pueda reintentar):
//   1. leer el id del cliente de Mercado Pago y los archivos de imagen del local (antes de que dejen de existir);
//   2. borrar en la base (docs/sql/35: la función se niega si el local no está 'cancelled' y no toca nada);
//   3. recién ahí, con la base ya borrada: borrar los archivos del bucket y el cliente en Mercado Pago. Si alguno falla
//      no se vuelve atrás ni se frena: queda un código en el log para revisarlo (los datos principales ya no están).
// Los logs llevan solo códigos cortos y restaurant.id.

export type RpcResult = { data: any; error: { message: string } | null };

export type DeleteDeps = {
  getMpCustomerId: (restaurantId: string) => Promise<{ found: boolean; mpCustomerId: string | null }>;
  rpc: (fn: 'retention_image_paths' | 'delete_restaurant_data', args: { p_restaurant_id: string }) => Promise<RpcResult>;
  removeImages: (names: string[]) => Promise<{ error: { message: string } | null }>;
  deleteMpCustomer: (customerId: string) => Promise<{ ok: boolean; detail?: string }>;
  log?: (line: string) => void;
};

export type DeleteOutcome = {
  ok: boolean;
  code?: string; // si ok=false: por qué no se borró nada
  images: 'none' | 'removed' | 'failed';
  mpCustomer: 'none' | 'deleted' | 'failed';
};

export async function deleteRestaurantData(restaurantId: string, deps: DeleteDeps): Promise<DeleteOutcome> {
  const log = deps.log ?? ((l: string) => console.error(l));
  const out: DeleteOutcome = { ok: false, images: 'none', mpCustomer: 'none' };

  // 1) lo que hay que juntar antes de borrar
  let mpCustomerId: string | null = null;
  try {
    const found = await deps.getMpCustomerId(restaurantId);
    if (!found.found) { out.code = 'RESTAURANT_NOT_FOUND'; return out; }
    mpCustomerId = found.mpCustomerId;
  } catch {
    out.code = 'READ_FAILED';
    log(`[retention-delete] code=READ_FAILED restaurant=${restaurantId}`);
    return out;
  }

  let paths: string[] = [];
  try {
    const res = await deps.rpc('retention_image_paths', { p_restaurant_id: restaurantId });
    if (res.error) throw new Error(res.error.message);
    paths = Array.isArray(res.data) ? res.data.filter((p: unknown): p is string => typeof p === 'string' && p.length > 0) : [];
  } catch {
    // Sin la lista de archivos no se borra nada: borrar la base primero dejaría fotos huérfanas imposibles de ubicar.
    out.code = 'IMAGE_LIST_FAILED';
    log(`[retention-delete] code=IMAGE_LIST_FAILED restaurant=${restaurantId}`);
    return out;
  }

  // 2) la base
  try {
    const res = await deps.rpc('delete_restaurant_data', { p_restaurant_id: restaurantId });
    if (res.error) {
      const m = res.error.message || '';
      out.code = m.includes('NOT_CANCELLED') ? 'NOT_CANCELLED' : m.includes('RESTAURANT_NOT_FOUND') ? 'RESTAURANT_NOT_FOUND' : 'DB_DELETE_FAILED';
      log(`[retention-delete] code=${out.code} restaurant=${restaurantId}`);
      return out;
    }
  } catch {
    out.code = 'DB_DELETE_FAILED';
    log(`[retention-delete] code=DB_DELETE_FAILED restaurant=${restaurantId}`);
    return out;
  }
  out.ok = true;

  // 3) lo que la base no puede borrar
  if (paths.length > 0) {
    try {
      const res = await deps.removeImages(paths);
      out.images = res.error ? 'failed' : 'removed';
    } catch {
      out.images = 'failed';
    }
    if (out.images === 'failed') log(`[retention-delete] code=IMAGES_REMOVE_FAILED restaurant=${restaurantId}`);
  }

  if (mpCustomerId) {
    try {
      const res = await deps.deleteMpCustomer(mpCustomerId);
      out.mpCustomer = res.ok ? 'deleted' : 'failed';
    } catch {
      out.mpCustomer = 'failed';
    }
    if (out.mpCustomer === 'failed') log(`[retention-delete] code=MP_CUSTOMER_DELETE_FAILED restaurant=${restaurantId}`);
  }

  return out;
}
