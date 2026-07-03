# Notifications setup

Follow these steps after applying [`notifications-migration.sql`](notifications-migration.sql) in the Supabase SQL Editor.

## 1. Database migration

Run the full contents of `supabase/notifications-migration.sql`.

This creates:

- `push_tokens` — Expo push tokens per device
- `profiles.notification_prefs` — server-synced notification toggles
- `notification_log` — server-generated items (monthly reports)
- `leave_group` RPC — logs `member_left` before removing membership
- `get_user_net_balance` RPC — used by the monthly report job

## 2. Enable Realtime

In **Supabase Dashboard → Database → Replication**, enable replication for:

- `activity_events`
- `settlements`
- `notification_log`

Or run in the SQL editor:

```sql
alter publication supabase_realtime add table public.activity_events;
alter publication supabase_realtime add table public.settlements;
alter publication supabase_realtime add table public.notification_log;
```

## 3. Deploy Edge Functions

```bash
supabase functions deploy send-notification
supabase functions deploy monthly-report
```

## 4. Database Webhooks (applied on Splitup production)

Webhooks are implemented as **Postgres triggers + pg_net** (see [`notifications-webhooks-migration.sql`](notifications-webhooks-migration.sql)):

| Trigger | Table | Event | Effect |
| ------- | ----- | ----- | ------ |
| `activity_events_send_notification` | `activity_events` | INSERT | Push to group members |
| `settlements_send_notification_insert` | `settlements` | INSERT | Notify payee (pending) |
| `settlements_send_notification_update` | `settlements` | UPDATE | Notify payer (completed) |

Target: `https://lcujjhgfnawockwfdvfn.supabase.co/functions/v1/send-notification`

Edge Functions deployed: `send-notification`, `monthly-report` (both `verify_jwt: false` for pg_net/cron callers; they use `SUPABASE_SERVICE_ROLE_KEY` internally).

## 5. Monthly report cron

In **Supabase Dashboard → Integrations → Cron**, schedule `monthly-report` on the 1st of each month, e.g.:

```
0 9 1 * *
```

(9:00 UTC on the 1st — adjust for your timezone.)

## 6. EAS / Expo push credentials

1. Create an EAS project: `eas init`
2. Copy the project ID into [`app.json`](../app.json) → `extra.eas.projectId`
3. Configure push credentials: `eas credentials`
4. Build a development or production client — push does **not** work in Expo Go

## 7. Manual test matrix

| Scenario                    | In-app bell | Push (dev build) |
| --------------------------- | ----------- | ---------------- |
| Another member adds expense | Yes         | Yes              |
| Expense edited/deleted      | Yes         | Yes              |
| Pending settlement (payee)  | Yes         | Yes              |
| Settlement confirmed (payer)| Yes         | Yes              |
| Member joined               | Yes         | Yes              |
| Member left                 | Yes         | Yes              |
| Monthly report (cron)       | Yes         | Yes              |
| Toggle pref off             | Hidden      | Not sent         |

Test push on a **physical device** with a **development build** (`npx expo run:ios` or `npx expo run:android`).

## 8. Preference sync

Notification toggles on the Account screen write to both AsyncStorage (local cache) and `profiles.notification_prefs` (server). The Edge Function reads server prefs when deciding whether to send push.
