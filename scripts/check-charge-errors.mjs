// Mensajes de rechazo de cobro (lib/chargeErrors.ts). Corre con: node scripts/check-charge-errors.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const src = readFileSync(new URL('../lib/chargeErrors.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const dir = mkdtempSync(join(tmpdir(), 'ce-'));
const file = join(dir, 'chargeErrors.mjs');
writeFileSync(file, js);
const { friendlyChargeError } = await import(file);

let fail = 0;
const check = (name, ok) => { if (!ok) { fail++; console.error('✗', name); } else console.log('✓', name); };

check('CC_VAL_433 pide revisar DNI y datos', /DNI/.test(friendlyChargeError('CC_VAL_433 Credit card validation has failed')));
check('CC_VAL sin texto extra', /validar la tarjeta/.test(friendlyChargeError('CC_VAL_433')));
check('minúsculas', /validar la tarjeta/.test(friendlyChargeError('cc_val_433 algo')));
check('cc_rejected_insufficient_amount sigue igual', /fondos/.test(friendlyChargeError('cc_rejected_insufficient_amount')));
check('rechazo desconocido del banco', /rechazado por el banco/.test(friendlyChargeError('cc_rejected_xyz')));
check('vacío', /No se pudo procesar/.test(friendlyChargeError(null)));
check('error nuestro no culpa a la tarjeta', /No pudimos procesar el cobro/.test(friendlyChargeError('timeout')));

if (fail) { console.error(`${fail} fallaron`); process.exit(1); }
console.log('OK');
