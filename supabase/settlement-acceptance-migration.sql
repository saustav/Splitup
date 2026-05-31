-- Payee must accept manual settlements before balances update.
-- Run on existing Supabase projects after invites-settlements-migration.sql.

-- Allow settlement_pending activity events
alter table public.activity_events drop constraint if exists activity_events_event_type_check;
alter table public.activity_events add constraint activity_events_event_type_check check (
  event_type in (
    'expense_created',
    'expense_updated',
    'expense_deleted',
    'invite_created',
    'member_joined',
    'settlement_pending',
    'settlement_completed'
  )
);

-- create_settlement: log pending event for manual payments
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

  if p_provider not in ('khalti', 'esewa', 'manual') then
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

  if p_provider = 'manual' then
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
  end if;

  return v_id;
end;
$$;

grant execute on function public.create_settlement(uuid, uuid, numeric, text) to authenticated;

-- Payee confirms they received the payment (manual settlements)
create or replace function public.accept_settlement(p_settlement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.settlements;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.settlements
  set status = 'completed', completed_at = now()
  where id = p_settlement_id
    and payee_id = auth.uid()
    and status = 'pending'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Settlement not found or already completed';
  end if;

  perform public.log_activity_event(
    v_row.group_id,
    'settlement_completed',
    'settlement',
    v_row.id,
    'Settlement',
    v_row.amount,
    null,
    jsonb_build_object(
      'payee_id', v_row.payee_id,
      'payer_id', v_row.payer_id,
      'provider', v_row.provider
    )
  );
end;
$$;

grant execute on function public.accept_settlement(uuid) to authenticated;

-- Online payments: payer marks sent; payee still accepts via accept_settlement
create or replace function public.complete_settlement(p_settlement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.settlements;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.settlements
  set status = 'completed', completed_at = now()
  where id = p_settlement_id
    and payer_id = auth.uid()
    and status = 'pending'
    and provider in ('khalti', 'esewa')
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Settlement not found or already completed';
  end if;

  perform public.log_activity_event(
    v_row.group_id,
    'settlement_completed',
    'settlement',
    v_row.id,
    'Settlement',
    v_row.amount,
    null,
    jsonb_build_object(
      'payee_id', v_row.payee_id,
      'payer_id', v_row.payer_id,
      'provider', v_row.provider
    )
  );
end;
$$;

grant execute on function public.complete_settlement(uuid) to authenticated;
