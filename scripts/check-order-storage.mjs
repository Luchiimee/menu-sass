// Verificación de lib/clientOrderStorage.ts: borra solo las claves del pedido y nunca las ajenas. Sin red.
//
//   node scripts/check-order-storage.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { ORDER_STORAGE_KEYS, clearOrderStorage } from '../lib/clientOrderStorage.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

// Storage de prueba con el mismo contrato que localStorage
function makeStorage(initial) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    removed: [],
    clearCalls: 0,
    removeItem(k) { this.removed.push(k); data.delete(k); },
    getItem(k) { return data.has(k) ? data.get(k) : null; },
    setItem(k, v) { data.set(k, String(v)); },
    clear() { this.clearCalls++; data.clear(); },
  };
}

console.log('ORDER_STORAGE_KEYS');
{
  check('son las cuatro del pedido', ORDER_STORAGE_KEYS.join(',') === 'activeOrderId,snappy_active_order,nroMesa,metodoEnvio');
  check('no incluye snappy_mp_pending (Mercado Pago)', !ORDER_STORAGE_KEYS.includes('snappy_mp_pending'));
  for (const ajena of ['sidebar-collapsed', 'ordersView', 'productsView', 'thermal_paper_width']) {
    check(`no incluye la del panel: ${ajena}`, !ORDER_STORAGE_KEYS.includes(ajena));
  }
  check('sin duplicados', new Set(ORDER_STORAGE_KEYS).size === ORDER_STORAGE_KEYS.length);
}

console.log('clearOrderStorage: borra solo lo del pedido');
{
  const s = makeStorage({
    activeOrderId: 'abc', snappy_active_order: 'abc', nroMesa: 'mesa 3', metodoEnvio: 'mesa',
    'sidebar-collapsed': 'true', ordersView: 'grid', productsView: 'list', thermal_paper_width: '58mm',
    snappy_mp_pending: '{"ref":"x"}', 'sb-proyecto-auth-token': '{"access_token":"t"}', 'neon-alloy-cart': '[]', otraCosa: '1',
  });
  const removed = clearOrderStorage(s);
  check('devuelve las cuatro claves borradas', removed.join(',') === ORDER_STORAGE_KEYS.join(','));
  check('las cuatro del pedido desaparecieron', ORDER_STORAGE_KEYS.every((k) => s.getItem(k) === null));
  check('el panel conserva sus claves', s.getItem('sidebar-collapsed') === 'true' && s.getItem('ordersView') === 'grid' && s.getItem('productsView') === 'list' && s.getItem('thermal_paper_width') === '58mm');
  check('Mercado Pago conserva su estado pendiente', s.getItem('snappy_mp_pending') === '{"ref":"x"}');
  check('la sesión de Supabase se conserva', s.getItem('sb-proyecto-auth-token') !== null);
  check('las claves de otros proyectos se conservan', s.getItem('neon-alloy-cart') === '[]' && s.getItem('otraCosa') === '1');
  check('no usa clear()', s.clearCalls === 0);
  check('solo llamó removeItem con las cuatro', s.removed.join(',') === ORDER_STORAGE_KEYS.join(','));
  check('quedan 8 claves ajenas', s.data.size === 8);
}

console.log('clearOrderStorage: casos límite');
{
  check('storage vacío no falla', clearOrderStorage(makeStorage({})).length === 4);
  check('null y undefined: no hace nada', clearOrderStorage(null).length === 0 && clearOrderStorage(undefined).length === 0);
  check('objeto sin removeItem: no hace nada', clearOrderStorage({}).length === 0);
  const roto = { removeItem(k) { if (k === 'nroMesa') throw new Error('bloqueado'); roto.vistas.push(k); }, vistas: [] };
  const removed = clearOrderStorage(roto);
  check('si una clave falla sigue con las demás', roto.vistas.join(',') === 'activeOrderId,snappy_active_order,metodoEnvio');
  check('devuelve solo las que se pudieron borrar', removed.join(',') === 'activeOrderId,snappy_active_order,metodoEnvio');
  const todoRoto = { removeItem() { throw new Error('storage bloqueado'); } };
  check('storage que falla siempre: no lanza y devuelve []', clearOrderStorage(todoRoto).length === 0);
}

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallas`);
process.exit(failures === 0 ? 0 : 1);
