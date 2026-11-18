-- 33 — Motivo del último cobro rechazado (restaurants.last_charge_error / last_charge_error_at)
--
-- Estado: APLICADO en producción (2026-11-18).
--
-- Qué hace:
--   1. Agrega dos columnas: last_charge_error (status_detail de Mercado Pago o el error) y last_charge_error_at.
--   2. Las suma a protect_restaurant_columns(): el navegador (authenticated / anon) no puede escribirlas.
--
-- Rollback (ANTES de publicar el código nuevo no hace falta nada; después, primero revertir el código):
--   alter table public.restaurants drop column if exists last_charge_error, drop column if exists last_charge_error_at;
--   y volver a crear protect_restaurant_columns() sin las dos líneas nuevas de cada rama.

alter table public.restaurants
  add column if not exists last_charge_error    text,
  add column if not exists last_charge_error_at timestamptz;

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
    new.last_charge_error    := old.last_charge_error;
    new.last_charge_error_at := old.last_charge_error_at;
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
    new.last_charge_error    := null;
    new.last_charge_error_at := null;
    return new;
  end if;

  return new;
end;
$function$;
