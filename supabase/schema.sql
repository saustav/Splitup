-- Run this in Supabase SQL Editor after creating your project.

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Expense groups
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz default now()
);

alter table public.groups enable row level security;

-- Group membership
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz default now(),
  unique (group_id, user_id),
  constraint group_members_profile_fkey foreign key (user_id) references public.profiles (id)
);

alter table public.group_members enable row level security;

-- Avoid RLS infinite recursion: policies must not SELECT from the same table they guard.
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

create or replace function public.shares_group_with(p_other_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid() and gm2.user_id = p_other_user_id
  );
$$;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_owner(uuid) to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;

-- RLS: groups
create policy "Members can view their groups"
  on public.groups for select
  using (public.is_group_member(id));

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() = created_by);

create policy "Owners can update groups"
  on public.groups for update
  using (public.is_group_owner(id));

create policy "Owners can delete groups"
  on public.groups for delete
  using (public.is_group_owner(id));

-- RLS: group_members
create policy "Members can view group members"
  on public.group_members for select
  using (user_id = auth.uid() or public.is_group_member(group_id));

create policy "Users can add themselves as members"
  on public.group_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave groups"
  on public.group_members for delete
  using (user_id = auth.uid());

create policy "Group members can view profiles"
  on public.profiles for select
  using (public.shares_group_with(id));

-- Create group + add creator as owner (atomic)
create or replace function public.create_group(
  group_name text,
  p_currency text default 'USD'
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group public.groups;
  v_user auth.users;
  v_currency text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_currency := upper(trim(coalesce(p_currency, 'USD')));
  if char_length(v_currency) <> 3 then
    raise exception 'Invalid currency code';
  end if;

  select * into v_user from auth.users where id = auth.uid();

  insert into public.profiles (id, display_name)
  values (
    auth.uid(),
    coalesce(
      v_user.raw_user_meta_data->>'full_name',
      v_user.raw_user_meta_data->>'name',
      v_user.email
    )
  )
  on conflict (id) do nothing;

  insert into public.groups (name, created_by, currency)
  values (trim(group_name), auth.uid(), v_currency)
  returning * into new_group;

  insert into public.group_members (group_id, user_id, role)
  values (new_group.id, auth.uid(), 'owner');

  return new_group;
end;
$$;

grant execute on function public.create_group(text, text) to authenticated;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.email
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Expenses
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  description text not null check (char_length(trim(description)) > 0),
  category text not null default 'other' check (
    category in (
      'food',
      'transport',
      'housing',
      'entertainment',
      'groceries',
      'health',
      'other'
    )
  ),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'USD',
  paid_by uuid not null references auth.users (id),
  created_by uuid references auth.users (id) on delete set null,
  expense_date date not null default current_date,
  created_at timestamptz default now(),
  constraint expenses_paid_by_profile_fkey foreign key (paid_by) references public.profiles (id)
);

alter table public.expenses enable row level security;

create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_owed numeric(12, 2) not null check (amount_owed >= 0),
  unique (expense_id, user_id),
  constraint expense_splits_user_profile_fkey foreign key (user_id) references public.profiles (id)
);

alter table public.expense_splits enable row level security;

-- RLS: expenses
create policy "Members can view group expenses"
  on public.expenses for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = expenses.group_id
        and group_members.user_id = auth.uid()
    )
  );

-- RLS: expense_splits
create policy "Members can view expense splits"
  on public.expense_splits for select
  using (
    exists (
      select 1
      from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id
        and gm.user_id = auth.uid()
    )
  );

-- Shared split logic: custom JSON splits, or equal split across all group members.
create or replace function public.apply_expense_splits(
  p_expense_id uuid,
  p_group_id uuid,
  p_amount numeric,
  p_splits jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_count int;
  v_share numeric(12, 2);
  v_member record;
  v_split record;
  v_split_sum numeric(12, 2) := 0;
begin
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
        values (p_expense_id, v_split.user_id, v_split.amount_owed);
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
      values (p_expense_id, v_member.user_id, v_share);
    end loop;
  end if;
end;
$$;

-- Activity feed events (see supabase/activity-events-migration.sql)
create table public.activity_events (
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
      'settlement_pending',
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

create index activity_events_group_created_idx
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

create or replace function public.normalize_expense_category(p_category text)
returns text
language plpgsql
immutable
as $$
begin
  if lower(trim(coalesce(p_category, ''))) in (
    'food', 'transport', 'housing', 'entertainment', 'groceries', 'health', 'other'
  ) then
    return lower(trim(p_category));
  end if;
  return 'other';
end;
$$;

-- Create expense (equal split if p_splits is null, else custom amounts)
create or replace function public.create_expense(
  p_group_id uuid,
  p_description text,
  p_amount numeric,
  p_paid_by uuid default null,
  p_splits jsonb default null,
  p_category text default 'other',
  p_expense_date date default null
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
  v_category text;
  v_expense_date date;
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

  v_category := public.normalize_expense_category(p_category);
  v_expense_date := coalesce(p_expense_date, current_date);

  select coalesce(currency, 'USD') into v_currency
  from public.groups where id = p_group_id;

  insert into public.expenses (
    group_id, description, amount, paid_by, created_by, currency, category, expense_date
  )
  values (
    p_group_id, trim(p_description), p_amount, v_payer, auth.uid(), v_currency, v_category, v_expense_date
  )
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
    jsonb_build_object('category', v_category)
  );

  return v_expense_id;
end;
$$;

grant execute on function public.create_expense(uuid, text, numeric, uuid, jsonb, text, date) to authenticated;

-- Update expense (payer or creator)
create or replace function public.update_expense(
  p_expense_id uuid,
  p_description text,
  p_amount numeric,
  p_splits jsonb default null,
  p_paid_by uuid default null,
  p_category text default null,
  p_expense_date date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_currency text;
  v_payer uuid;
  v_category text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select e.group_id, coalesce(e.currency, g.currency, 'USD'), e.paid_by, e.category
  into v_group_id, v_currency, v_payer, v_category
  from public.expenses e
  join public.groups g on g.id = e.group_id
  where e.id = p_expense_id
    and (e.paid_by = auth.uid() or e.created_by = auth.uid());

  if v_group_id is null then
    raise exception 'Expense not found or you cannot edit this expense';
  end if;

  if not exists (
    select 1 from public.group_members
    where group_id = v_group_id and user_id = auth.uid()
  ) then
    raise exception 'Not a member of this group';
  end if;

  if p_paid_by is not null then
    if not exists (
      select 1 from public.group_members
      where group_id = v_group_id and user_id = p_paid_by
    ) then
      raise exception 'Payer must be a group member';
    end if;
    v_payer := p_paid_by;
  end if;

  if p_category is not null then
    v_category := public.normalize_expense_category(p_category);
  end if;

  update public.expenses
  set
    description = trim(p_description),
    amount = p_amount,
    paid_by = v_payer,
    category = v_category,
    expense_date = coalesce(p_expense_date, expense_date)
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
    jsonb_build_object('category', v_category)
  );
end;
$$;

grant execute on function public.update_expense(uuid, text, numeric, jsonb, uuid, text, date) to authenticated;

-- Delete expense (payer only)
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
  where e.id = p_expense_id
    and (e.paid_by = auth.uid() or e.created_by = auth.uid());

  if v_group_id is null then
    raise exception 'Expense not found or you cannot delete this expense';
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

grant execute on function public.delete_expense(uuid) to authenticated;

-- Group invites
create table public.group_invites (
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

create policy "Members can view group invites"
  on public.group_invites for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_invites.group_id
        and group_members.user_id = auth.uid()
    )
  );

create or replace function public.cleanup_expired_group_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.group_invites
  where expires_at < now()
     or use_count >= max_uses;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function public.cleanup_expired_group_invites() to authenticated;

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

  delete from public.group_invites
  where group_id = p_group_id
    and (expires_at < now() or use_count >= max_uses);

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

grant execute on function public.accept_group_invite(text) to authenticated;

-- Settlements (manual cash payments)
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  payer_id uuid not null references auth.users (id),
  payee_id uuid not null references auth.users (id),
  amount numeric(12, 2) not null check (amount > 0),
  provider text not null check (provider in ('manual')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  external_ref text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.settlements enable row level security;

create policy "Members can view settlements"
  on public.settlements for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = settlements.group_id
        and group_members.user_id = auth.uid()
    )
  );

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

-- Realtime (enable in Dashboard → Database → Replication if needed)
-- alter publication supabase_realtime add table public.groups;
-- alter publication supabase_realtime add table public.group_members;
-- alter publication supabase_realtime add table public.expenses;
-- alter publication supabase_realtime add table public.expense_splits;
-- alter publication supabase_realtime add table public.settlements;
-- alter publication supabase_realtime add table public.activity_events;
