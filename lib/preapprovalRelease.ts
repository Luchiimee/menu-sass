// Liberar el mp_preapproval_id de un local SOLO después de cancelar el preapproval en MP.
//
// Regla: ningún camino pone mp_preapproval_id en null sin que MP confirme que el preapproval
// quedó cancelado; si no se cancela, la referencia se conserva para no dejar una suscripción
// viva en MP sin dueño en la base (MP seguiría cobrando).
//
// Módulo puro (sin imports ni red): la llamada a MP se inyecta, así se prueba con un MP falso.
// En producción se inyecta `cancelPreapproval` de lib/mercadopagoBilling, que ya trata un
// preapproval previamente cancelado como éxito.

export type CancelPreapprovalFn = (
  preapprovalId: string
) => Promise<{ ok: true } | { ok: false; detail?: string }>;

export type ReleaseResult =
  | { clearId: false; code: 'NO_PREAPPROVAL' } // no había id: no se llama a MP, nada que borrar
  | { clearId: true; code: 'CANCELLED' }       // MP confirmó la cancelación: se puede borrar el id
  | { clearId: false; code: 'CANCEL_FAILED' }; // MP no confirmó (o falló la llamada): conservar el id

export async function releasePreapproval(
  preapprovalId: string | null | undefined,
  cancel: CancelPreapprovalFn
): Promise<ReleaseResult> {
  if (typeof preapprovalId !== 'string' || preapprovalId.trim() === '') {
    return { clearId: false, code: 'NO_PREAPPROVAL' };
  }

  try {
    const result = await cancel(preapprovalId);
    if (result && result.ok === true) return { clearId: true, code: 'CANCELLED' };
  } catch {
    // una excepción de red cuenta como cancelación no confirmada
  }
  return { clearId: false, code: 'CANCEL_FAILED' };
}

// Código corto para logs: sin id del preapproval, sin detalle de MP, sin datos del local.
export function releaseLogCode(r: ReleaseResult): string {
  return `PRE_${r.code}`;
}

// Línea de log para un local: código corto + restaurant.id (nunca email ni nombre), para poder
// encontrar después qué locales quedaron con un preapproval vivo.
export function releaseLogLine(prefix: string, r: ReleaseResult, restaurantId: string | null | undefined): string {
  return `${prefix} — ${releaseLogCode(r)} restaurant=${restaurantId ?? 'desconocido'}: se conserva mp_preapproval_id`;
}
