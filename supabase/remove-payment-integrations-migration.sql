-- Remove Khalti/eSewa online payment support; manual cash settlements only.
-- Run on existing Supabase projects after invites-settlements-migration.sql
-- and settlement-acceptance-migration.sql.

-- Normalize any legacy gateway rows before tightening the provider check.
update public.settlements
set provider = 'manual'
where provider in ('khalti', 'esewa');

update public.activity_events
set metadata = jsonb_set(metadata, '{provider}', '"manual"')
where metadata ? 'provider'
  and metadata->>'provider' in ('khalti', 'esewa');

-- Drop online-only settlement completion RPC (no longer used by the app).
-- DROP IF EXISTS is enough; REVOKE fails when the function was never created.
drop function if exists public.complete_settlement(uuid);

-- Restrict provider column to manual only.
alter table public.settlements drop constraint if exists settlements_provider_check;
alter table public.settlements add constraint settlements_provider_check
  check (provider in ('manual'));

-- create_settlement: manual provider only
create or replace function public.create_settlement(
  p_group_id uuid,
  p_payee_id uuid,
  p_amount numeric,
  p_provider text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if p_provider <> 'manual' then
    raise exception 'Invalid payment provider';
  end if;

  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  ) then
    raise exception 'Not a member of this group';
  end if;

  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_payee_id
  ) then
    raise exception 'Payee must be a group member';
  end if;

  if auth.uid() = p_payee_id then
    raise exception 'Cannot pay yourself';
  end if;

  insert into public.settlements (group_id, payer_id, payee_id, amount, provider, external_ref)
  values (
    p_group_id,
    auth.uid(),
    p_payee_id,
    p_amount,
    p_provider,
    'splitup-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
  )
  returning id into v_id;

  perform public.log_activity_event(
    p_group_id,
    'settlement_pending',
    'settlement',
    v_id,
    'Settlement pending',
    p_amount,
    null,
    jsonb_build_object(
      'payee_id', p_payee_id,
      'payer_id', auth.uid(),
      'provider', p_provider
    )
  );

  return v_id;
end;
$$;

grant execute on function public.create_settlement(uuid, uuid, numeric, text) to authenticated;
