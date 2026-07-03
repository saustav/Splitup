-- Notifications: push tokens, server prefs, notification log, member_left, leave_group RPC

-- ---------------------------------------------------------------------------
-- Push tokens
-- ---------------------------------------------------------------------------
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "Users manage own push tokens" on public.push_tokens;
create policy "Users manage own push tokens"
  on public.push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Server-synced notification preferences on profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists notification_prefs jsonb not null default '{
    "expenseUpdates": true,
    "settlements": true,
    "groupActivity": true,
    "monthlyReports": false
  }'::jsonb;

-- ---------------------------------------------------------------------------
-- Server-generated notifications (monthly reports, etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notification_log_user_created_idx
  on public.notification_log (user_id, created_at desc);

alter table public.notification_log enable row level security;

drop policy if exists "Users view own notification log" on public.notification_log;
create policy "Users view own notification log"
  on public.notification_log for select
  using (auth.uid() = user_id);

drop policy if exists "Users update own notification log" on public.notification_log;
create policy "Users update own notification log"
  on public.notification_log for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Edge functions insert via service role; no client insert policy needed.

-- ---------------------------------------------------------------------------
-- member_left activity event type
-- ---------------------------------------------------------------------------
alter table public.activity_events
  drop constraint if exists activity_events_event_type_check;

alter table public.activity_events
  add constraint activity_events_event_type_check check (
    event_type in (
      'expense_created',
      'expense_updated',
      'expense_deleted',
      'invite_created',
      'member_joined',
      'member_left',
      'settlement_pending',
      'settlement_completed'
    )
  );

-- ---------------------------------------------------------------------------
-- leave_group RPC (logs member_left before removing membership)
-- ---------------------------------------------------------------------------
create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_display_name text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_group_member(p_group_id) then
    raise exception 'Not a group member';
  end if;

  select coalesce(nullif(trim(display_name), ''), 'Someone')
  into v_display_name
  from public.profiles
  where id = v_user_id;

  perform public.log_activity_event(
    p_group_id,
    'member_left',
    'member',
    v_user_id,
    v_display_name || ' left the group'
  );

  delete from public.group_members
  where group_id = p_group_id and user_id = v_user_id;
end;
$$;

grant execute on function public.leave_group(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Cross-group net balance for monthly reports (service role / edge functions)
-- ---------------------------------------------------------------------------
create or replace function public.get_user_net_balance(p_user_id uuid)
returns table (
  total_you_owe numeric,
  total_owed_to_you numeric,
  net_balance numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_net numeric;
  v_you_owe numeric := 0;
  v_owed_to_you numeric := 0;
  v_threshold numeric := 0.02;
begin
  for v_group_id in
    select gm.group_id
    from public.group_members gm
    where gm.user_id = p_user_id
  loop
    with member_ids as (
      select user_id from public.group_members where group_id = v_group_id
    ),
    expense_nets as (
      select
        e.paid_by as user_id,
        sum(e.amount) as delta
      from public.expenses e
      where e.group_id = v_group_id
      group by e.paid_by
      union all
      select
        es.user_id,
        -sum(es.amount_owed) as delta
      from public.expense_splits es
      join public.expenses e on e.id = es.expense_id
      where e.group_id = v_group_id
      group by es.user_id
    ),
    settlement_nets as (
      select
        s.payer_id as user_id,
        sum(s.amount) as delta
      from public.settlements s
      where s.group_id = v_group_id and s.status = 'completed'
      group by s.payer_id
      union all
      select
        s.payee_id as user_id,
        -sum(s.amount) as delta
      from public.settlements s
      where s.group_id = v_group_id and s.status = 'completed'
      group by s.payee_id
    ),
    combined as (
      select user_id, sum(delta) as net
      from (
        select user_id, delta from expense_nets
        union all
        select user_id, delta from settlement_nets
      ) x
      group by user_id
    )
    select coalesce(c.net, 0)
    into v_net
    from member_ids m
    left join combined c on c.user_id = m.user_id
    where m.user_id = p_user_id;

    v_net := coalesce(v_net, 0);

    if v_net < -v_threshold then
      v_you_owe := v_you_owe + abs(v_net);
    elsif v_net > v_threshold then
      v_owed_to_you := v_owed_to_you + v_net;
    end if;
  end loop;

  total_you_owe := round(v_you_owe, 2);
  total_owed_to_you := round(v_owed_to_you, 2);
  net_balance := round(v_owed_to_you - v_you_owe, 2);
  return next;
end;
$$;

grant execute on function public.get_user_net_balance(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Realtime (run in Dashboard → Database → Replication if not already enabled)
-- ---------------------------------------------------------------------------
-- alter publication supabase_realtime add table public.activity_events;
-- alter publication supabase_realtime add table public.settlements;
-- alter publication supabase_realtime add table public.notification_log;
