// Verificación de lib/preapprovalRelease.ts. Sin red: MP es un falso inyectado.
//
//   node scripts/check-preapproval-release.mjs   (Node >= 22.18 / 24: importa .ts directo)
//
// Regla: mp_preapproval_id solo se borra después de que MP confirma la cancelación.

import { releasePreapproval, releaseLogCode } from '../lib/preapprovalRelease.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

// MP falso: registra las llamadas y responde lo que se le configure
function fakeMp(handler) {
  const calls = [];
  const cancel = async (id) => {
    calls.push(id);
    return handler(id);
  };
  return { cancel, calls };
}

// Simula al caller: arma el update como lo hacen retry, cron/charge y save-card
async function callerUpdate(preapprovalId, mp) {
  const events = [];
  const release = await releasePreapproval(preapprovalId, async (id) => {
    events.push('cancel');
    return mp.cancel(id);
  });
  const update = { subscription_status: 'active' };
  if (release.clearId) update.mp_preapproval_id = null;
  events.push('update');
  return { release, update, events };
}

console.log('cancela y recién después borra');
{
  const mp = fakeMp(async () => ({ ok: true }));
  const { release, update, events } = await callerUpdate('pre_123', mp);
  check('llama a MP con el id', mp.calls.length === 1 && mp.calls[0] === 'pre_123');
  check('MP se llama antes del update', events.join(',') === 'cancel,update');
  check('clearId true', release.clearId === true && release.code === 'CANCELLED');
  check('el update lleva mp_preapproval_id = null', 'mp_preapproval_id' in update && update.mp_preapproval_id === null);
}

console.log('si falla la cancelación no borra');
{
  const mp = fakeMp(async () => ({ ok: false, detail: 'http=500' }));
  const { release, update } = await callerUpdate('pre_123', mp);
  check('clearId false', release.clearId === false && release.code === 'CANCEL_FAILED');
  check('el update NO incluye mp_preapproval_id', !('mp_preapproval_id' in update));
  check('el cobro sigue (status active en el update)', update.subscription_status === 'active');
  check('código de log corto y sin datos', releaseLogCode(release) === 'PRE_CANCEL_FAILED');
}

console.log('si MP tira una excepción de red no borra');
{
  const mp = fakeMp(async () => { throw new Error('ECONNRESET secreto'); });
  const { release, update } = await callerUpdate('pre_123', mp);
  check('clearId false', release.clearId === false && release.code === 'CANCEL_FAILED');
  check('el update NO incluye mp_preapproval_id', !('mp_preapproval_id' in update));
  check('el resultado no filtra el mensaje del error', !JSON.stringify(release).includes('secreto'));
}

console.log('un preapproval ya cancelado cuenta como éxito');
{
  // cancelPreapproval real devuelve { ok: true } si MP dice que ya estaba cancelado
  const mp = fakeMp(async () => ({ ok: true }));
  const { release, update } = await callerUpdate('pre_ya_cancelado', mp);
  check('clearId true', release.clearId === true);
  check('se borra el id', update.mp_preapproval_id === null);
}

console.log('un local sin preapproval no llama a MP');
for (const empty of [null, undefined, '', '   ']) {
  const mp = fakeMp(async () => ({ ok: true }));
  const { release, update } = await callerUpdate(empty, mp);
  check(`${JSON.stringify(empty)}: no llama a MP`, mp.calls.length === 0);
  check(`${JSON.stringify(empty)}: NO_PREAPPROVAL y no toca el id`, release.code === 'NO_PREAPPROVAL' && release.clearId === false && !('mp_preapproval_id' in update));
}

console.log('respuesta rara de MP no cuenta como éxito');
{
  for (const weird of [undefined, null, {}, { ok: 'yes' }, { ok: false }]) {
    const mp = fakeMp(async () => weird);
    const release = await releasePreapproval('pre_1', mp.cancel);
    check(`${JSON.stringify(weird)} → conserva el id`, release.clearId === false);
  }
}

if (failures > 0) {
  console.error(`\n${failures} verificación(es) fallaron`);
  process.exit(1);
}
console.log('\nTodo ok');
