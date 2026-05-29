-- Group default currency (ISO 4217). New groups default to USD.

alter table public.groups
  add column if not exists currency text not null default 'USD';

alter table public.groups
  drop constraint if exists groups_currency_check;

alter table public.groups
  add constraint groups_currency_check check (char_length(currency) = 3);

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

-- Expenses inherit group currency on create
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

  return v_expense_id;
end;
$$;
