-- Allow any group member to log an expense with any member as payer.
-- Edit/delete allowed for the payer or the person who created the entry.

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

  v_payer := coalesce(p_paid_by, auth.uid());

  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = v_payer
  ) then
    raise exception 'Payer must be a group member';
  end if;

  select coalesce(currency, 'USD') into v_currency
  from public.groups where id = p_group_id;

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

create or replace function public.update_expense(
  p_expense_id uuid,
  p_description text,
  p_amount numeric,
  p_splits jsonb default null,
  p_paid_by uuid default null
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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select e.group_id, coalesce(e.currency, g.currency, 'USD'), e.paid_by
  into v_group_id, v_currency, v_payer
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

  update public.expenses
  set
    description = trim(p_description),
    amount = p_amount,
    paid_by = v_payer
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
