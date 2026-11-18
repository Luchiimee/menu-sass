-- 34 — email_log acepta los mails de la retención de datos: 'cancel_notice' (al cancelar) y 'delete_warning'
--      (aviso 15 días antes de borrar los datos).
--
-- Estado: APLICADO en producción (2026-11-18). Hacía falta ANTES de publicar el código que manda esos mails; sin esto el insert en
-- email_log falla, el mail no sale y queda un código CANCEL_NOTICE_RESERVE_ERROR en el log (la cancelación no se rompe).
--
-- Qué hace: reemplaza el check de email_log.kind por uno que además permite los dos tipos nuevos.
--
-- Rollback (ANTES de que haya filas con los tipos nuevos; si las hay, borrarlas primero):
--   alter table public.email_log drop constraint email_log_kind_check;
--   alter table public.email_log add constraint email_log_kind_check
--     check (kind in ('trial_ending', 'trial_followup', 'thanks'));

alter table public.email_log drop constraint email_log_kind_check;
alter table public.email_log add constraint email_log_kind_check
  check (kind in ('trial_ending', 'trial_followup', 'thanks', 'cancel_notice', 'delete_warning'));
