-- Database webhooks via pg_net → send-notification Edge Function
-- Applied to Splitup project (lcujjhgfnawockwfdvfn)

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_send_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text := 'https://lcujjhgfnawockwfdvfn.supabase.co/functions/v1/send-notification';
  v_body jsonb;
begin
  v_body := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', to_jsonb(NEW),
    'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
  );

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := v_body
  );

  return NEW;
end;
$$;

drop trigger if exists activity_events_send_notification on public.activity_events;
create trigger activity_events_send_notification
  after insert on public.activity_events
  for each row
  execute function public.notify_send_notification();

drop trigger if exists settlements_send_notification_insert on public.settlements;
create trigger settlements_send_notification_insert
  after insert on public.settlements
  for each row
  execute function public.notify_send_notification();

drop trigger if exists settlements_send_notification_update on public.settlements;
create trigger settlements_send_notification_update
  after update on public.settlements
  for each row
  execute function public.notify_send_notification();
