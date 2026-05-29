-- Run this if you already applied an older schema.sql without expenses.

-- Expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  description text not null check (char_length(trim(description)) > 0),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'NPR',
  paid_by uuid not null references auth.users (id),
  created_by uuid references auth.users (id) on delete set null,
  expense_date date not null default current_date,
  created_at timestamptz default now()
);

alter table public.expenses enable row level security;

create table if not exists public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_owed numeric(12, 2) not null check (amount_owed >= 0),
  unique (expense_id, user_id)
);

alter table public.expense_splits enable row level security;

-- Add profile FKs if missing
do $$ begin
  alter table public.expenses
    add constraint expenses_paid_by_profile_fkey
    foreign key (paid_by) references public.profiles (id);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.expense_splits
    add constraint expense_splits_user_profile_fkey
    foreign key (user_id) references public.profiles (id);
exception when duplicate_object then null;
end $$;

-- Policies (drop first if re-running)
drop policy if exists "Members can view group expenses" on public.expenses;
create policy "Members can view group expenses"
  on public.expenses for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = expenses.group_id
        and group_members.user_id = auth.uid()
    )
  );

drop policy if exists "Members can view expense splits" on public.expense_splits;
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

create or replace function public.create_expense(
  p_group_id uuid,
  p_description text,
  p_amount numeric,
  p_paid_by uuid default null
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

  select count(*)::int into v_member_count
  from public.group_members
  where group_id = p_group_id;

  if v_member_count < 1 then
    raise exception 'Group has no members';
  end if;

  v_share := round(p_amount / v_member_count, 2);

  insert into public.expenses (
    group_id, description, amount, paid_by, created_by
  )
  values (
    p_group_id, trim(p_description), p_amount, v_payer, auth.uid()
  )
  returning id into v_expense_id;

  for v_member in
    select user_id from public.group_members where group_id = p_group_id
  loop
    insert into public.expense_splits (expense_id, user_id, amount_owed)
    values (v_expense_id, v_member.user_id, v_share);
  end loop;

  return v_expense_id;
end;
$$;

grant execute on function public.create_expense(uuid, text, numeric, uuid) to authenticated;
