-- Run after schema.sql if upgrading an existing project.

-- ========== Invites ==========
create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  code text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  max_uses int not null default 20,
  use_count int not null default 0,
  created_at timestamptz default now()
);

alter table public.group_invites enable row level security;

drop policy if exists "Members can view group invites" on public.group_invites;
create policy "Members can view group invites"
  on public.group_invites for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_invites.group_id
        and group_members.user_id = auth.uid()
    )
  );

-- ========== Settlements ==========
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  payer_id uuid not null references auth.users (id),
  payee_id uuid not null references auth.users (id),
  amount numeric(12, 2) not null check (amount > 0),
  provider text not null check (provider in ('khalti', 'esewa', 'manual')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  external_ref text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.settlements enable row level security;

drop policy if exists "Members can view settlements" on public.settlements;
create policy "Members can view settlements"
  on public.settlements for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = settlements.group_id
        and group_members.user_id = auth.uid()
    )
  );

-- ========== create_expense with custom splits ==========
drop function if exists public.create_expense(uuid, text, numeric, uuid);

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
  v_member_count int;
  v_share numeric(12, 2);
  v_member record;
  v_split record;
  v_split_sum numeric(12, 2) := 0;
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

  v_payer := coalesce(p_paid_by, auth.uid());

  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = v_payer
  ) then
    raise exception 'Payer must be a group member';
  end if;

  insert into public.expenses (group_id, description, amount, paid_by, created_by)
  values (p_group_id, trim(p_description), p_amount, v_payer, auth.uid())
  returning id into v_expense_id;

  if p_splits is not null then
    for v_split in
      select * from jsonb_to_recordset(p_splits) as x(user_id uuid, amount_owed numeric)
    loop
      if v_split.amount_owed < 0 then
        raise exception 'Split amounts cannot be negative';
      end if;

      if not exists (
        select 1 from public.group_members
        where group_id = p_group_id and user_id = v_split.user_id
      ) then
        raise exception 'Split user must be a group member';
      end if;

      if v_split.amount_owed > 0 then
        insert into public.expense_splits (expense_id, user_id, amount_owed)
        values (v_expense_id, v_split.user_id, v_split.amount_owed);
        v_split_sum := v_split_sum + v_split.amount_owed;
      end if;
    end loop;

    if abs(v_split_sum - p_amount) > 0.05 then
      raise exception 'Split amounts must sum to the expense total';
    end if;
  else
    select count(*)::int into v_member_count
    from public.group_members where group_id = p_group_id;

    if v_member_count < 1 then
      raise exception 'Group has no members';
    end if;

    v_share := round(p_amount / v_member_count, 2);

    for v_member in
      select user_id from public.group_members where group_id = p_group_id
    loop
      insert into public.expense_splits (expense_id, user_id, amount_owed)
      values (v_expense_id, v_member.user_id, v_share);
    end loop;
  end if;

  return v_expense_id;
end;
$$;

grant execute on function public.create_expense(uuid, text, numeric, uuid, jsonb) to authenticated;

-- ========== Invite RPCs ==========
create or replace function public.create_group_invite(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
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
  values (p_group_id, v_code, auth.uid());

  return v_code;
end;
$$;

grant execute on function public.create_group_invite(uuid) to authenticated;

create or replace function public.accept_group_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.group_invites;
  v_group_id uuid;
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
  end if;

  update public.group_invites
  set use_count = use_count + 1
  where id = v_invite.id;

  return v_group_id;
end;
$$;

grant execute on function public.accept_group_invite(text) to authenticated;

-- ========== Settlement RPCs ==========
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

  return v_id;
end;
$$;

grant execute on function public.create_settlement(uuid, uuid, numeric, text) to authenticated;

create or replace function public.complete_settlement(p_settlement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.settlements
  set status = 'completed', completed_at = now()
  where id = p_settlement_id
    and payer_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'Settlement not found or already completed';
  end if;
end;
$$;

grant execute on function public.complete_settlement(uuid) to authenticated;
