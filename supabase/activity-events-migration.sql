-- Activity feed events (invites, edits, deletes, settlements, joins)

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  event_type text not null check (
    event_type in (
      'expense_created',
      'expense_updated',
      'expense_deleted',
      'invite_created',
      'member_joined',
      'settlement_completed'
    )
  ),
  entity_type text,
  entity_id uuid,
  title text not null default '',
  amount numeric(12, 2),
  currency text default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_events_group_created_idx
  on public.activity_events (group_id, created_at desc);

alter table public.activity_events enable row level security;

create policy "Members can view activity events"
  on public.activity_events for select
  using (public.is_group_member(group_id));

create or replace function public.log_activity_event(
  p_group_id uuid,
  p_event_type text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_title text default '',
  p_amount numeric default null,
  p_currency text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_currency text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(p_currency, g.currency, 'USD') into v_currency
  from public.groups g where g.id = p_group_id;

  insert into public.activity_events (
    group_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    title,
    amount,
    currency,
    metadata
  )
  values (
    p_group_id,
    auth.uid(),
    p_event_type,
    p_entity_type,
    p_entity_id,
    coalesce(nullif(trim(p_title), ''), p_event_type),
    p_amount,
    v_currency,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_activity_event(uuid, text, text, uuid, text, numeric, text, jsonb) to authenticated;

-- create_expense: log expense_created
create or replace function public.create_expense(
  p_group_id uuid,
  p_description text,
  p_amount numeric,
  p_paid_by uuid default null,
  p_splits jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payer uuid;
  v_expense_id uuid;
  v_currency text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  ) then
    raise exception 'Not a member of this group';
  end if;

  if p_paid_by is not null and p_paid_by is distinct from auth.uid() then
    raise exception 'You can only add expenses you paid';
  end if;

  select coalesce(currency, 'USD') into v_currency
  from public.groups where id = p_group_id;

  v_payer := auth.uid();

  insert into public.expenses (group_id, description, amount, paid_by, created_by, currency)
  values (p_group_id, trim(p_description), p_amount, v_payer, auth.uid(), v_currency)
  returning id into v_expense_id;

  perform public.apply_expense_splits(v_expense_id, p_group_id, p_amount, p_splits);

  perform public.log_activity_event(
    p_group_id,
    'expense_created',
    'expense',
    v_expense_id,
    trim(p_description),
    p_amount,
    v_currency,
    '{}'::jsonb
  );

  return v_expense_id;
end;
$$;

-- update_expense: log expense_updated
create or replace function public.update_expense(
  p_expense_id uuid,
  p_description text,
  p_amount numeric,
  p_splits jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_currency text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select e.group_id, coalesce(e.currency, g.currency, 'USD')
  into v_group_id, v_currency
  from public.expenses e
  join public.groups g on g.id = e.group_id
  where e.id = p_expense_id and e.paid_by = auth.uid();

  if v_group_id is null then
    raise exception 'Expense not found or you can only edit your own expenses';
  end if;

  if not exists (
    select 1 from public.group_members
    where group_id = v_group_id and user_id = auth.uid()
  ) then
    raise exception 'Not a member of this group';
  end if;

  update public.expenses
  set description = trim(p_description), amount = p_amount
  where id = p_expense_id;

  delete from public.expense_splits where expense_id = p_expense_id;
  perform public.apply_expense_splits(p_expense_id, v_group_id, p_amount, p_splits);

  perform public.log_activity_event(
    v_group_id,
    'expense_updated',
    'expense',
    p_expense_id,
    trim(p_description),
    p_amount,
    v_currency,
    '{}'::jsonb
  );
end;
$$;

-- delete_expense: log expense_deleted
create or replace function public.delete_expense(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_description text;
  v_amount numeric;
  v_currency text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select e.group_id, e.description, e.amount, coalesce(e.currency, g.currency, 'USD')
  into v_group_id, v_description, v_amount, v_currency
  from public.expenses e
  join public.groups g on g.id = e.group_id
  where e.id = p_expense_id and e.paid_by = auth.uid();

  if v_group_id is null then
    raise exception 'Expense not found or you can only delete your own expenses';
  end if;

  delete from public.expenses where id = p_expense_id;

  perform public.log_activity_event(
    v_group_id,
    'expense_deleted',
    'expense',
    p_expense_id,
    v_description,
    v_amount,
    v_currency,
    '{}'::jsonb
  );
end;
$$;

-- create_group_invite: log invite_created
create or replace function public.create_group_invite(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_invite_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  ) then
    raise exception 'Not a member of this group';
  end if;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.group_invites (group_id, code, created_by)
  values (p_group_id, v_code, auth.uid())
  returning id into v_invite_id;

  perform public.log_activity_event(
    p_group_id,
    'invite_created',
    'invite',
    v_invite_id,
    v_code,
    null,
    null,
    jsonb_build_object('invite_code', v_code)
  );

  return v_code;
end;
$$;

-- accept_group_invite: log member_joined
create or replace function public.accept_group_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.group_invites;
  v_group_id uuid;
  v_joined boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_invite
  from public.group_invites
  where upper(code) = upper(trim(p_code))
    and expires_at > now()
    and use_count < max_uses
  order by created_at desc
  limit 1;

  if v_invite.id is null then
    raise exception 'Invalid or expired invite code';
  end if;

  v_group_id := v_invite.group_id;

  if not exists (
    select 1 from public.group_members
    where group_id = v_group_id and user_id = auth.uid()
  ) then
    insert into public.group_members (group_id, user_id, role)
    values (v_group_id, auth.uid(), 'member');
    v_joined := true;
  end if;

  update public.group_invites
  set use_count = use_count + 1
  where id = v_invite.id;

  if v_joined then
    perform public.log_activity_event(
      v_group_id,
      'member_joined',
      'member',
      auth.uid(),
      (select name from public.groups where id = v_group_id),
      null,
      null,
      jsonb_build_object(
        'invite_id', v_invite.id,
        'invite_code', v_invite.code,
        'invited_by', v_invite.created_by
      )
    );
  end if;

  return v_group_id;
end;
$$;

-- complete_settlement: log settlement_completed
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
