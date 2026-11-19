-- 40 — email_log acepta el mail 'payment_failed' (aviso cuando se rechaza un cobro: motivo probable + los 3 días de gracia).
--
-- Estado: PENDIENTE de aplicar. Hace falta ANTES de publicar el código que manda ese mail: sin esto el insert en email_log
-- falla, el mail no sale y queda un log "reserve_error" en la corrida (nada más se rompe).
--
-- Qué hace: reemplaza el check de email_log.kind por uno que además permite 'payment_failed'. No toca filas existentes.
--
-- Rollback (ANTES de que haya filas 'payment_failed'; si las hay, borrarlas primero):
--   alter table public.email_log drop constraint email_log_kind_check;
--   alter table public.email_log add constraint email_log_kind_check
--     check (kind in ('trial_ending', 'trial_followup', 'thanks', 'cancel_notice', 'delete_warning', 'card_check'));

alter table public.email_log drop constraint email_log_kind_check;
alter table public.email_log add constraint email_log_kind_check
  check (kind in ('trial_ending', 'trial_followup', 'thanks', 'cancel_notice', 'delete_warning', 'card_check', 'payment_failed'));
