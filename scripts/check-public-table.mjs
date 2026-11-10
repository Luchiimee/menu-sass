// Verificación de lib/publicTable.ts: lista cerrada de columnas, validación del id y del nombre,
// toPublicTable y pickTableByName. Sin red.
//
//   node scripts/check-public-table.mjs   (Node >= 22.18 / 24: importa .ts directo)

import {
  PUBLIC_TABLE_COLUMNS, PUBLIC_TABLE_SELECT, MAX_TABLE_NAME_LENGTH,
  isValidTableId, normalizeTableName, toPublicTable, pickTableByName,
} from '../lib/publicTable.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

console.log('PUBLIC_TABLE_COLUMNS: lista cerrada');
{
  for (const col of ['description', 'needs_attention', 'reservation_info', 'restaurant_id', 'created_at']) {
    check(`no incluye ${col}`, !PUBLIC_TABLE_COLUMNS.includes(col));
  }
  check('son id, name y status', PUBLIC_TABLE_COLUMNS.join(',') === 'id,name,status');
  check('PUBLIC_TABLE_SELECT no es *', !PUBLIC_TABLE_SELECT.includes('*'));
  check('PUBLIC_TABLE_SELECT es la lista', PUBLIC_TABLE_SELECT === 'id, name, status');
}

console.log('isValidTableId');
{
  check('uuid v4', isValidTableId('3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f'));
  check('uuid de otra versión', isValidTableId('3f2b8c1e-5d4a-1b7e-cc10-0a1b2c3d4e5f'));
  check('mayúsculas', isValidTableId('3F2B8C1E-5D4A-4B7E-9C10-0A1B2C3D4E5F'));
  check('vacío', !isValidTableId(''));
  check('no es texto', !isValidTableId(null) && !isValidTableId(undefined) && !isValidTableId(5) && !isValidTableId({}));
  check('sin guiones', !isValidTableId('3f2b8c1e5d4a4b7e9c100a1b2c3d4e5f'));
  check('con espacio al final', !isValidTableId('3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f '));
  check('no hex', !isValidTableId('3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5g'));
  check('inyección', !isValidTableId("x' or '1'='1") && !isValidTableId('1;drop table tables'));
}

console.log('normalizeTableName');
{
  check('recorta espacios', normalizeTableName('  Mesa 1 ') === 'Mesa 1');
  check('largo máximo es 60', MAX_TABLE_NAME_LENGTH === 60);
  check('60 caracteres sirve', normalizeTableName('a'.repeat(60)) === 'a'.repeat(60));
  check('61 caracteres no', normalizeTableName('a'.repeat(61)) === null);
  check('vacío y solo espacios no', normalizeTableName('') === null && normalizeTableName('   ') === null);
  check('no es texto no', normalizeTableName(null) === null && normalizeTableName(5) === null && normalizeTableName({}) === null);
  check('salto de línea adentro no', normalizeTableName('Mesa\n1') === null);
  check('tabulación adentro no', normalizeTableName('Mesa\t1') === null);
  check('NUL no', normalizeTableName('Mesa\u00001') === null);
  check('DEL y C1 no', normalizeTableName('Mesa\u007f1') === null && normalizeTableName('Mesa\u00851') === null);
  check('separadores de línea y párrafo Unicode no', normalizeTableName('Mesa' + String.fromCharCode(0x2028) + '1') === null && normalizeTableName('Mesa' + String.fromCharCode(0x2029) + '1') === null);
  check('tildes, ñ y emoji sirven', normalizeTableName('Terraza ñandú 🍽️') === 'Terraza ñandú 🍽️');
  check('comodines son caracteres comunes', normalizeTableName('a_b%') === 'a_b%');
}

console.log('toPublicTable');
{
  const row = {
    id: 'u1', name: 'Mesa 1', status: 'libre', restaurant_id: 'r1', description: 'junto a la ventana',
    needs_attention: true, reservation_info: { name: 'Juan Perez', guests: 4, description: 'cumpleaños', datetime: '2026-11-10T21:00' },
    created_at: '2026-01-01', extra_cualquiera: 'x',
  };
  const out = toPublicTable(row);
  check('solo tiene id, name y reserved', Object.keys(out).sort().join(',') === 'id,name,reserved');
  check('conserva id y name', out.id === 'u1' && out.name === 'Mesa 1');
  check('libre → reserved false', out.reserved === false);
  check('reservada → reserved true', toPublicTable({ ...row, status: 'reservada' }).reserved === true);
  check('otro status → reserved false', toPublicTable({ ...row, status: 'ocupada' }).reserved === false && toPublicTable({ ...row, status: null }).reserved === false);
  check('no tiene description ni needs_attention ni reservation_info', !('description' in out) && !('needs_attention' in out) && !('reservation_info' in out));
  const json = JSON.stringify(toPublicTable({ ...row, status: 'reservada' }));
  check('el JSON no menciona la reserva ni sus datos', !/Juan|Perez|cumplea|ventana|guests|reservation/i.test(json));
  check('no tiene restaurant_id ni columnas extra', !('restaurant_id' in out) && !('extra_cualquiera' in out) && !('created_at' in out));
}

console.log('pickTableByName');
{
  const rows = [
    { id: '1', name: 'Mesa 1' }, { id: '2', name: 'Mesa 2' }, { id: '3', name: 'terraza' },
    { id: '4', name: 'Barra' }, { id: '5', name: 'barra ' }, { id: '6', name: 'axb' }, { id: '7', name: 'a_b' },
    { id: '8', name: '10' },
  ];
  const one = (name) => { const r = pickTableByName(rows, name); return r.kind === 'one' ? r.row.id : r.kind; };
  check('igualdad exacta: one', one('Mesa 2') === '2');
  check('sin distinguir mayúsculas', one('MESA 2') === '2' && one('mesa 2') === '2' && one('TERRAZA') === '3');
  check('recorta espacios del pedido', one('  Mesa 2  ') === '2');
  check('recorta espacios del nombre guardado', one('Terraza') === '3');
  check('nombres repetidos (Barra / barra ): many', one('barra') === 'many' && one('BARRA') === 'many');
  check('nombre inexistente: none', one('Mesa 9') === 'none');
  check('prefijo no coincide (Mesa 1 vs Mesa)', one('Mesa') === 'none');
  check('"Mesa 1" no coincide con "1" (sin normalizar el prefijo)', one('1') === 'none');
  check('10 no coincide con 1', one('10') === '8');
  check('% no es comodín', one('%') === 'none' && one('Mesa %') === 'none' && one('%1') === 'none');
  check('_ no es comodín: a_b no coincide con axb', one('a_b') === '7');
  check('a_b no devuelve axb', pickTableByName(rows, 'a_b').row?.id !== '6');
  check('axb coincide solo con axb', one('axb') === '6');
  check('. y * no son comodines', one('Mesa.') === 'none' && one('.*') === 'none');
  check('nombre inválido (largo, control, no texto): none', one('a'.repeat(61)) === 'none' && one('Mesa\n2') === 'none' && one(null) === 'none' && one(undefined) === 'none' && one(5) === 'none' && one('') === 'none');
  check('sin filas, null o no array: none', pickTableByName([], 'Mesa 1').kind === 'none' && pickTableByName(null, 'Mesa 1').kind === 'none' && pickTableByName(undefined, 'Mesa 1').kind === 'none');
  check('filas con name null o no texto se ignoran', pickTableByName([{ id: 'x', name: null }, { id: 'y' }, { id: 'z', name: 5 }], 'Mesa 1').kind === 'none');
  check('devuelve la fila original', pickTableByName(rows, 'mesa 1').row === rows[0]);
  const dup = pickTableByName([{ id: 'a', name: 'Mesa 1' }, { id: 'b', name: 'mesa 1' }], 'Mesa 1');
  check('many no trae fila', dup.kind === 'many' && !('row' in dup));
}

if (failures > 0) {
  console.log(`\n${failures} verificación(es) fallaron`);
  process.exit(1);
}
console.log('\ntodo ok');
