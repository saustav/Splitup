-- WhatsApp bot: link phone numbers to users and create expenses via webhook.
-- Run after schema.sql. Deploy supabase/functions/whatsapp-webhook with Meta credentials.

create table if not exists public.whatsapp_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  phone_e164 text unique,
  default_group_id uuid references public.groups (id) on delete set null,
  link_code text,
  link_code_expires_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.whatsapp_links enable row level security;

create policy "Users can view own whatsapp link"
  on public.whatsapp_links for select
  using (auth.uid() = user_id);

create policy "Users can update own whatsapp link"
  on public.whatsapp_links for update
  using (auth.uid() = user_id);

create policy "Users can insert own whatsapp link"
  on public.whatsapp_links for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own whatsapp link"
  on public.whatsapp_links for delete
  using (auth.uid() = user_id);

-- Service role / security definer reads for webhook
create or replace function public.whatsapp_get_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.whatsapp_links%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row from public.whatsapp_links where user_id = auth.uid();

  if not found then
    return jsonb_build_object(
      'linked', false,
      'verified', false,
      'phone', null,
      'default_group_id', null,
      'pending_code', false
    );
  end if;

  return jsonb_build_object(
    'linked', v_row.verified_at is not null,
    'verified', v_row.verified_at is not null,
    'phone', v_row.phone_e164,
    'default_group_id', v_row.default_group_id,
    'pending_code', v_row.link_code is not null and v_row.verified_at is null
  );
end;
$$;

grant execute on function public.whatsapp_get_status() to authenticated;

create or replace function public.whatsapp_request_link(p_phone_e164 text)
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

  if p_phone_e164 is null or char_length(trim(p_phone_e164)) < 9 then
    raise exception 'Invalid phone number';
  end if;

  v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');

  insert into public.whatsapp_links (user_id, phone_e164, link_code, link_code_expires_at, verified_at)
  values (
    auth.uid(),
    trim(p_phone_e164),
    v_code,
    now() + interval '15 minutes',
    null
  )
  on conflict (user_id) do update set
    phone_e164 = excluded.phone_e164,
    link_code = excluded.link_code,
    link_code_expires_at = excluded.link_code_expires_at,
    verified_at = null,
    updated_at = now();

  return v_code;
end;
$$;

grant execute on function public.whatsapp_request_link(text) to authenticated;

create or replace function public.whatsapp_set_default_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.whatsapp_links
    where user_id = auth.uid() and verified_at is not null
  ) then
    raise exception 'WhatsApp not linked';
  end if;

  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  ) then
    raise exception 'Not a member of this group';
  end if;

  update public.whatsapp_links
  set default_group_id = p_group_id, updated_at = now()
  where user_id = auth.uid();
end;
$$;

grant execute on function public.whatsapp_set_default_group(uuid) to authenticated;

create or replace function public.whatsapp_unlink()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.whatsapp_links where user_id = auth.uid();
end;
$$;

grant execute on function public.whatsapp_unlink() to authenticated;

-- Called from Edge Function (service role) when user sends LINK <code>
create or replace function public.whatsapp_verify_link(
  p_phone_e164 text,
  p_code text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
  from public.whatsapp_links
  where link_code = trim(p_code)
    and link_code_expires_at > now()
    and verified_at is null
  limit 1;

  if v_user_id is null then
    return 'Invalid or expired code. Generate a new code in the Split It app.';
  end if;

  update public.whatsapp_links
  set
    phone_e164 = trim(p_phone_e164),
    verified_at = now(),
    link_code = null,
    link_code_expires_at = null,
    updated_at = now()
  where user_id = v_user_id;

  return 'WhatsApp linked! Send HELP to see commands, or GROUP <name> to pick a default group.';
end;
$$;

revoke all on function public.whatsapp_verify_link(text, text) from public;
grant execute on function public.whatsapp_verify_link(text, text) to service_role;

create or replace function public.create_expense_for_whatsapp_user(
  p_user_id uuid,
  p_group_id uuid,
  p_description text,
  p_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense_id uuid;
  v_currency text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  ) then
    raise exception 'Not a member of this group';
  end if;

  select coalesce(currency, 'USD') into v_currency
  from public.groups where id = p_group_id;

  insert into public.expenses (
    group_id, description, amount, paid_by, created_by, currency, category
  )
  values (
    p_group_id,
    trim(p_description),
    p_amount,
    p_user_id,
    p_user_id,
    v_currency,
    'other'
  )
  returning id into v_expense_id;

  perform public.apply_expense_splits(v_expense_id, p_group_id, p_amount, null);

  perform public.log_activity_event(
    p_group_id,
    'expense_created',
    'expense',
    v_expense_id,
    trim(p_description),
    p_amount,
    v_currency,
    jsonb_build_object('source', 'whatsapp')
  );

  return v_expense_id;
end;
$$;

revoke all on function public.create_expense_for_whatsapp_user(uuid, uuid, text, numeric) from public;
grant execute on function public.create_expense_for_whatsapp_user(uuid, uuid, text, numeric) to service_role;

-- Inbound message handler for webhook (service role only)
create or replace function public.whatsapp_handle_message(
  p_phone_e164 text,
  p_body text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.whatsapp_links%rowtype;
  v_group_id uuid;
  v_group_name text;
  v_expense_id uuid;
  v_upper text;
  v_code text;
  v_amount numeric;
  v_desc text;
  v_in_group text;
  v_list text;
begin
  select * into v_link
  from public.whatsapp_links
  where phone_e164 = trim(p_phone_e164) and verified_at is not null;

  v_upper := upper(trim(coalesce(p_body, '')));

  if v_upper = 'HELP' or v_upper = '?' then
    return 'Commands: LINK <code> | <amount> <description> | <amount> <desc> in <group> | GROUP <name> | GROUPS | HELP';
  end if;

  if not found then
    if v_upper like 'LINK %' then
      v_code := trim(substring(trim(p_body) from 6));
      return public.whatsapp_verify_link(trim(p_phone_e164), v_code);
    end if;
    return 'Link your number in the Split It app first, then send: LINK <6-digit code>';
  end if;

  if v_upper like 'LINK %' then
    return 'Already linked. Send HELP for commands.';
  end if;

  if v_upper = 'GROUPS' then
    select string_agg(g.name, E'\n• ' order by g.name)
    into v_list
    from public.groups g
    join public.group_members gm on gm.group_id = g.id
    where gm.user_id = v_link.user_id;

    if v_list is null then
      return 'You have no groups yet. Create one in the app.';
    end if;
    return 'Your groups:' || E'\n• ' || v_list;
  end if;

  if v_upper like 'GROUP %' then
    v_group_name := trim(substring(trim(p_body) from 7));
    select g.id into v_group_id
    from public.groups g
    join public.group_members gm on gm.group_id = g.id
    where gm.user_id = v_link.user_id
      and lower(g.name) = lower(v_group_name)
    limit 1;

    if v_group_id is null then
      return 'Group not found: ' || v_group_name || '. Send GROUPS to list names.';
    end if;

    update public.whatsapp_links
    set default_group_id = v_group_id, updated_at = now()
    where user_id = v_link.user_id;

    return 'Default group set to ' || v_group_name || '.';
  end if;

  -- Expense: "50 desc in Group" or "add 50 desc" or "50 desc"
  if trim(p_body) ~* '^\d' then
    if trim(p_body) ~* ' in ' then
      v_amount := (regexp_match(trim(p_body), '^(\d+(?:\.\d{1,2})?)\s+(.+?)\s+in\s+(.+)$', 'i'))[1]::numeric;
      v_desc := (regexp_match(trim(p_body), '^(\d+(?:\.\d{1,2})?)\s+(.+?)\s+in\s+(.+)$', 'i'))[2];
      v_in_group := (regexp_match(trim(p_body), '^(\d+(?:\.\d{1,2})?)\s+(.+?)\s+in\s+(.+)$', 'i'))[3];
    elsif trim(p_body) ~* '^add\s+' then
      v_amount := (regexp_match(trim(p_body), '^add\s+(\d+(?:\.\d{1,2})?)\s+(.+)$', 'i'))[1]::numeric;
      v_desc := (regexp_match(trim(p_body), '^add\s+(\d+(?:\.\d{1,2})?)\s+(.+)$', 'i'))[2];
      v_in_group := null;
    else
      v_amount := (regexp_match(trim(p_body), '^(\d+(?:\.\d{1,2})?)\s+(.+)$', 'i'))[1]::numeric;
      v_desc := (regexp_match(trim(p_body), '^(\d+(?:\.\d{1,2})?)\s+(.+)$', 'i'))[2];
      v_in_group := null;
    end if;

    if v_amount is null or v_amount <= 0 or v_desc is null or trim(v_desc) = '' then
      return 'Could not parse expense. Try: 50 dinner  or  50 dinner in Roommates';
    end if;

    if v_in_group is not null and trim(v_in_group) <> '' then
      select g.id, g.name into v_group_id, v_group_name
      from public.groups g
      join public.group_members gm on gm.group_id = g.id
      where gm.user_id = v_link.user_id
        and lower(g.name) = lower(trim(v_in_group))
      limit 1;
    else
      v_group_id := v_link.default_group_id;
      select name into v_group_name from public.groups where id = v_group_id;
    end if;

    if v_group_id is null then
      return 'No default group. Send GROUP <name> or: 50 lunch in <group name>';
    end if;

    v_expense_id := public.create_expense_for_whatsapp_user(
      v_link.user_id,
      v_group_id,
      trim(v_desc),
      v_amount
    );

    return 'Added ' || trim(v_desc) || ' (' || v_amount::text || ') to ' || coalesce(v_group_name, 'group') || '.';
  end if;

  return 'Send HELP for commands.';
end;
$$;

revoke all on function public.whatsapp_handle_message(text, text) from public;
grant execute on function public.whatsapp_handle_message(text, text) to service_role;
