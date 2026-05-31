-- Remove expired or fully-used group invites.
-- Optional daily job: enable pg_cron in Supabase Dashboard → Database → Extensions,
-- then run the schedule block at the bottom of this file.

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

comment on function public.cleanup_expired_group_invites() is
  'Deletes invite rows past expires_at or at max_uses. Returns number of rows removed.';

grant execute on function public.cleanup_expired_group_invites() to authenticated;

-- Prune stale invites for this group whenever a member generates a new code.
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

-- One-time cleanup for existing projects (safe to re-run).
select public.cleanup_expired_group_invites();

-- ---------------------------------------------------------------------------
-- Daily schedule (pg_cron). Run manually in SQL Editor after enabling pg_cron:
--
-- select cron.schedule(
--   'cleanup-expired-group-invites',
--   '0 3 * * *',
--   $$select public.cleanup_expired_group_invites()$$
-- );
--
-- To remove the job later:
-- select cron.unschedule('cleanup-expired-group-invites');
-- ---------------------------------------------------------------------------
