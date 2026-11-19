-- 39 — email_log acepta el mail 'card_check' (aviso 1 a 2 días antes del primer cobro: "revisá los datos de tu tarjeta").
--
-- Estado: SIN APLICAR. Hace falta aplicarlo ANTES de publicar el código que manda ese mail: sin esto el insert en
-- email_log falla, el mail no sale y queda un log "reserve_error" en la corrida (nada más se rompe).
--
-- Qué hace: reemplaza el check de email_log.kind por uno que además permite 'card_check'.
--
-- Rollback (ANTES de que haya filas 'card_check'; si las hay, borrarlas primero):
--   alter table public.email_log drop constraint email_log_kind_check;
--   alter table public.email_log add constraint email_log_kind_check
--     check (kind in ('trial_ending', 'trial_followup', 'thanks', 'cancel_notice', 'delete_warning'));

alter table public.email_log drop constraint email_log_kind_check;
alter table public.email_log add constraint email_log_kind_check
  check (kind in ('trial_ending', 'trial_followup', 'thanks', 'cancel_notice', 'delete_warning', 'card_check'));
