// Verificación de lib/deleteRestaurantData.ts con dependencias simuladas. Sin red.
//   node scripts/check-delete-restaurant.mjs   (Node >= 22.18)
import { deleteRestaurantData } from '../lib/deleteRestaurantData.ts';

let failures = 0;
const check = (name, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) failures++; };

function deps(over = {}) {
  const calls = [];
  const d = {
    calls,
    getMpCustomerId: async () => { calls.push('read'); return { found: true, mpCustomerId: 'cus_1' }; },
    rpc: async (fn) => { calls.push(fn); return { data: fn === 'retention_image_paths' ? ['a.jpg', 'b.png'] : { restaurant_deleted: true }, error: null }; },
    removeImages: async (names) => { calls.push('images:' + names.join(',')); return { error: null }; },
    deleteMpCustomer: async (id) => { calls.push('mp:' + id); return { ok: true }; },
    log: (l) => { calls.push('LOG ' + l); },
    ...over,
  };
  return d;
}

let d = deps();
let r = await deleteRestaurantData('r1', d);
check('camino feliz: ok, imágenes y cliente de MP borrados', r.ok && r.images === 'removed' && r.mpCustomer === 'deleted');
check('orden: leer → listar fotos → borrar base → fotos → cliente MP', d.calls.join('|') === 'read|retention_image_paths|delete_restaurant_data|images:a.jpg,b.png|mp:cus_1');

d = deps({ rpc: async (fn) => { d.calls.push(fn); return fn === 'retention_image_paths' ? { data: [], error: null } : { data: null, error: { message: 'NOT_CANCELLED' } }; } });
r = await deleteRestaurantData('r1', d);
check('local no cancelado: se rechaza, código NOT_CANCELLED', !r.ok && r.code === 'NOT_CANCELLED');
check('local no cancelado: no se toca el bucket ni Mercado Pago', !d.calls.some((c) => c.startsWith('images:') || c.startsWith('mp:')));

d = deps({ rpc: async (fn) => { d.calls.push(fn); return fn === 'retention_image_paths' ? { data: null, error: { message: 'boom' } } : { data: {}, error: null }; } });
r = await deleteRestaurantData('r1', d);
check('no se pudo listar las fotos: no se borra NADA (ni la base)', !r.ok && r.code === 'IMAGE_LIST_FAILED' && !d.calls.includes('delete_restaurant_data'));

d = deps({ removeImages: async () => ({ error: { message: 'x' } }) });
r = await deleteRestaurantData('r1', d);
check('falla el bucket: la base ya está borrada, ok=true, images=failed, igual sigue con MP', r.ok && r.images === 'failed' && r.mpCustomer === 'deleted');
check('falla el bucket: queda código en el log sin datos personales', d.calls.some((c) => c.includes('IMAGES_REMOVE_FAILED') && c.includes('restaurant=r1')));

d = deps({ deleteMpCustomer: async () => { throw new Error('red'); } });
r = await deleteRestaurantData('r1', d);
check('falla MP (lanza): ok=true, mpCustomer=failed', r.ok && r.mpCustomer === 'failed');

d = deps({ getMpCustomerId: async () => ({ found: false, mpCustomerId: null }) });
r = await deleteRestaurantData('r1', d);
check('local inexistente: RESTAURANT_NOT_FOUND y no se llama a nada más', !r.ok && r.code === 'RESTAURANT_NOT_FOUND' && d.calls.length === 0);

d = deps({ getMpCustomerId: async () => { throw new Error('db'); } });
r = await deleteRestaurantData('r1', d);
check('falla la lectura inicial: READ_FAILED, no se borra nada', !r.ok && r.code === 'READ_FAILED');

d = deps({ getMpCustomerId: async () => ({ found: true, mpCustomerId: null }), rpc: async (fn) => ({ data: fn === 'retention_image_paths' ? [] : {}, error: null }) });
r = await deleteRestaurantData('r1', d);
check('sin fotos ni cliente de MP: ok, no llama al bucket ni a MP', r.ok && r.images === 'none' && r.mpCustomer === 'none');

d = deps({ rpc: async (fn) => { d.calls.push(fn); return fn === 'retention_image_paths' ? { data: [], error: null } : { data: null, error: { message: 'deadlock' } }; } });
r = await deleteRestaurantData('r1', d);
check('error de base al borrar: DB_DELETE_FAILED, no se toca bucket ni MP', !r.ok && r.code === 'DB_DELETE_FAILED' && !d.calls.some((c) => c.startsWith('mp:')));

if (failures) { console.log(`\n${failures} FALLARON`); process.exit(1); }
console.log('\nTodo OK');
