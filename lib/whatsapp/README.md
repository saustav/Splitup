# WhatsApp bot

Add group expenses by texting your Split It WhatsApp Business number — no need to open the app.

## User flow

1. **Account → Integrations → WhatsApp bot** — enter phone (`+977…`), tap **Generate link code**.
2. From that phone, send to your bot: `LINK 123456` (the 6-digit code).
3. Pick a **default group** in the app (or send `GROUP Roommates` on WhatsApp).
4. Add expenses: `50 dinner` or `120 taxi in Tokyo trip`.

## Commands

| Message | Action |
|---------|--------|
| `LINK 482910` | Link phone (code from app) |
| `50 pizza` | Expense in default group |
| `50 lunch in Roommates` | Expense in named group |
| `GROUP Roommates` | Set default group |
| `GROUPS` | List your groups |
| `HELP` | Show commands |

Splits are **equal** among all group members (same as a quick add in the app).

## Setup (developer)

### 1. Database

Run in Supabase SQL Editor:

```bash
supabase/whatsapp-bot-migration.sql
```

### 2. Meta WhatsApp Cloud API

1. [Meta for Developers](https://developers.facebook.com/) → create app → add **WhatsApp** product.
2. Get **Phone number ID** and permanent **Access token**.
3. Set webhook URL to your Edge Function, e.g.  
   `https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook`
4. Subscribe to `messages`. Set verify token to match `WHATSAPP_VERIFY_TOKEN`.

### 3. Deploy Edge Function

```bash
supabase secrets set WHATSAPP_VERIFY_TOKEN=your-verify-token
supabase secrets set WHATSAPP_ACCESS_TOKEN=your-meta-access-token
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically in Edge Functions.

### 4. App flag

`WHATSAPP_BOT_ENABLED` in `constants/app.ts` — set `false` to show “Coming soon” only.

## Security

- Link codes expire in **15 minutes**.
- Expense creation runs via **service role** RPCs; only verified phones can add expenses.
- Users must be **group members**; default group must be set (app or `GROUP` command).
