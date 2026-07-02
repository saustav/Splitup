# Split It

Split bills with friends — built for Nepal with Khalti and eSewa payments.

## Tech stack

| Layer           | Technology                              |
| --------------- | --------------------------------------- |
| Frontend        | React Native + Expo (iOS, Android, Web) |
| Styling         | NativeWind (Tailwind CSS)               |
| Backend & DB    | Supabase (PostgreSQL + realtime)        |
| Auth            | Supabase Auth (Google, Apple)           |
| State           | Zustand                                 |
| Navigation      | Expo Router                             |
| Push            | Expo Notifications                      |
| Payments        | Khalti, eSewa                           |
| Web hosting     | GitHub Pages (`splitup.mantradigital.com.np`) |
| Version control | GitHub                                  |

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in your Supabase and payment keys:

```bash
cp .env.example .env
```

### 3. Run the app

```bash
npx expo start
```

Then press `i` (iOS), `a` (Android), or `w` (web).

Clear cache after NativeWind changes:

```bash
npx expo start -c
```

## Project structure

```
app/              # Expo Router screens (file-based routes)
components/       # Reusable UI components
lib/              # Supabase client, notifications, payments
stores/           # Zustand stores (auth, etc.)
constants/        # Theme colors and shared values
```

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the project URL and anon key into `.env`.
3. Run `supabase/schema.sql` in the Supabase SQL Editor.
4. Enable **Google** and **Apple** under **Auth → Sign In / Providers**.
5. Under **Auth → URL Configuration**:
   - **Site URL:** your production web URL (e.g. `https://splitup.mantradigital.com.np`)
   - **Redirect URLs** (add every URL below — if localhost is missing, OAuth falls back to Site URL and local sign-in opens the live site):
     - `https://splitup.mantradigital.com.np/auth/callback`
     - `http://localhost:8081/auth/callback` (match the port shown when you run `npx expo start`)
     - `http://127.0.0.1:8081/auth/callback`
     - `splitup://**` (iOS/Android)
     - `splitup://auth/callback` (optional exact match)
   - In dev on web, the login screen shows the exact callback URL to whitelist.
6. For Google on iOS: in Supabase **Auth → Providers → Google**, enable **Skip nonce check** if sign-in fails after Google consent.

Sign-in uses `app/(auth)/login.tsx`. Web OAuth completes on `app/auth/callback.tsx`. Signed-in users are routed to tabs via `Stack.Protected`.

## Expense groups

The **Groups** tab lists groups you belong to. Tap **+** to create one (uses the `create_group` RPC). Tap a group to see members.

**Realtime:** In Supabase Dashboard → **Database** → **Replication**, enable `groups` and `group_members` for live updates across devices.

If you already ran an older `schema.sql`, run `supabase/expenses-migration.sql` for expenses tables.

### Expenses

On a group detail screen, tap **+** to add an expense. The amount is **split equally** among all group members. Balances show who owes or is owed (in NPR).

Enable realtime on `expenses` and `expense_splits` in Supabase Replication for live updates.

### Invites, custom splits & settlements

Run `supabase/invites-settlements-migration.sql` if upgrading an existing database.

| Feature             | How to use                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Invite friends**  | Group screen → **Invite** → share link or code (`splitup://invite/CODE`)                                       |
| **Join via invite** | Friend opens link while signed in → joins group                                                                |
| **Unequal splits**  | Add expense → **Custom** → enter amount per person (must sum to total)                                         |
| **Settle up**       | Group screen → **Settle up** → pay via **Khalti** or **eSewa**                                                 |
| **Payment keys**    | Add Khalti/eSewa vars to `.env`; use a Supabase Edge Function for live checkout (see `lib/payments/README.md`) |

Settlements simplify debts (fewest payments) and record payment history. Tap **I've paid** after completing payment in the browser.

## Payments (Khalti & eSewa)

Secret keys must live on the server. Use Supabase Edge Functions to initiate payments and verify webhooks. See `lib/payments/README.md`.

## Deploy web (GitHub Pages)

Production URL: **https://splitup.mantradigital.com.np**

Pushes to `main` build `dist/` and publish it to the `gh-pages` branch via `.github/workflows/deploy-web.yml`. Only the static export is deployed — source code stays on `main`.

### One-time GitHub setup

1. **Actions secrets** (Settings → Secrets and variables → Actions):
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
2. **GitHub Pages** (Settings → Pages):
   - Source: branch `gh-pages` / root
   - Custom domain: `splitup.mantradigital.com.np`
3. **DNS** (at your domain registrar): point `splitup.mantradigital.com.np` to GitHub Pages (CNAME to `<user>.github.io` or A records per [GitHub docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)).

### Supabase (production)

Under **Auth → URL Configuration**:

- **Site URL:** `https://splitup.mantradigital.com.np`
- **Redirect URLs:** `https://splitup.mantradigital.com.np/auth/callback`

### Manual deploy

```bash
npm run build:web
```

The workflow also copies `index.html` to `404.html` for client-side routing on GitHub Pages.

## Push notifications

Call `registerForPushNotifications()` from `lib/notifications.ts` after the user signs in, then save the Expo push token to Supabase.

## WhatsApp bot

Text expenses to your WhatsApp Business number (e.g. `50 dinner`). Users link their phone under **Account → Integrations**.

1. Run `supabase/whatsapp-bot-migration.sql`
2. Deploy `supabase/functions/whatsapp-webhook` with Meta API credentials

See `lib/whatsapp/README.md` for commands and setup.
