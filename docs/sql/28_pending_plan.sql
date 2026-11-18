-- 28 — Bajada de plan programada (restaurants.pending_plan / pending_plan_from)
--
-- Estado: APLICADO en producción (kbmsohzalgoulysnkher). Ya está en la base; la rama feat/cambio-plan-prorrateo todavía no se publicó a main.
--
-- Qué hace:
--   1. Agrega dos columnas: pending_plan (el plan al que pasa en el próximo cobro) y pending_plan_from (cuándo).
--   2. Las suma a protect_restaurant_columns(): el navegador (authenticated / anon) no puede escribirlas, igual que
--      subscription_plan. Sin esto, un cliente podría poner pending_plan = 'plus' y el cron se lo aplicaría gratis.
--
-- Rollback (si hiciera falta, ANTES de que haya filas con pending_plan):
--   alter table public.restaurants drop column if exists pending_plan, drop column if exists pending_plan_from;
--   y volver a crear protect_restaurant_columns() sin las dos líneas nuevas de cada rama.

begin;

alter table public.restaurants
  add column if not exists pending_plan text,
  add column if not exists pending_plan_from timestamptz;

alter table public.restaurants
  drop constraint if exists restaurants_pending_plan_check;
alter table public.restaurants
  add constraint restaurants_pending_plan_check
  check (pending_plan is null or pending_plan in ('light', 'go', 'plus'));

create or replace function public.protect_restaurant_columns()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.user_id             := old.user_id;
    new.created_at          := old.created_at;
    new.subscription_plan   := old.subscription_plan;
    new.subscription_status := old.subscription_status;
    new.trial_ends_at       := old.trial_ends_at;
    new.next_payment_date   := old.next_payment_date;
    new.grace_period_until  := old.grace_period_until;
    new.mp_customer_id      := old.mp_customer_id;
    new.mp_card_id          := old.mp_card_id;
    new.mp_preapproval_id   := old.mp_preapproval_id;
    new.card_last_four      := old.card_last_four;
    new.card_brand          := old.card_brand;
    new.first_paid_at       := old.first_paid_at;
    new.pending_plan        := old.pending_plan;
    new.pending_plan_from   := old.pending_plan_from;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.user_id             := auth.uid();
    new.created_at          := now();
    new.subscription_status := 'trialing';
    new.subscription_plan   := null;
    new.trial_ends_at       := null;
    new.next_payment_date   := null;
    new.grace_period_until  := null;
    new.mp_customer_id      := null;
    new.mp_card_id          := null;
    new.mp_preapproval_id   := null;
    new.card_last_four      := null;
    new.card_brand          := null;
    new.first_paid_at       := null;
    new.pending_plan        := null;
    new.pending_plan_from   := null;
    return new;
  end if;

  return new;
end;
$function$;

commit;
