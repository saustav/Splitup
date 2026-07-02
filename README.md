# Split It

Split bills with friends — track expenses, balances, and settle up in cash.

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
| Web hosting     | Hostinger (`splitup.mantradigital.com.np`)    |
| Version control | GitHub                                  |

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in your Supabase keys:

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
lib/              # Supabase client, notifications, business logic
stores/           # Zustand stores (auth, etc.)
constants/        # Theme colors and shared values
```

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the project URL and anon key into `.env`.
3. Run `supabase/schema.sql` in the Supabase SQL Editor.
4. Enable **Google** and **Apple** under **Auth → Sign In / Providers**.
5. Under **Auth → URL Configuration**:

- **Site URL:** `https://splitup.mantradigital.com.np`
- **Redirect URLs** (add every URL below — if production is missing, OAuth falls back to Site URL and may send you to `localhost`):
  - `https://splitup.mantradigital.com.np/auth/callback`
  - `http://localhost:8081/auth/callback` (match the port shown when you run `npx expo start`)
  - `http://127.0.0.1:8081/auth/callback`
  - `splitup://**` (iOS/Android)
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
| **Settle up**       | Group screen → **Settle up** → **Record payment** (payee confirms receipt) |

Settlements simplify debts (fewest payments) and record cash payment history. The payee must confirm before balances update.

If your database was created before payment integrations were removed, run `supabase/remove-payment-integrations-migration.sql` in the Supabase SQL Editor.

## Deploy web (Hostinger)

Production URL: **https://splitup.mantradigital.com.np**

Pushes to `main` build `dist/` and upload it to Hostinger via FTP using `.github/workflows/deploy-web.yml`. Only the static export is deployed — source code stays on `main`.

### One-time GitHub setup

**Actions secrets** (Settings → Secrets and variables → Actions):

| Secret | Description |
| ------ | ----------- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `FTP_HOST` | Hostinger FTP hostname (e.g. `ftp.mantradigital.com.np`) |
| `FTP_USERNAME` | Hostinger FTP username |
| `FTP_PASSWORD` | Hostinger FTP password |

### Hostinger

Files are uploaded to `/domains/mantradigital.com.np/public_html/splitup/` (relative to your FTP home directory). Apache routing is handled by `public/.htaccess` (copied into `dist/` on build). Ensure **AllowOverride** is enabled for that directory in your Hostinger panel.

### Supabase (production)

Under **Auth → URL Configuration**:

- **Site URL:** `https://splitup.mantradigital.com.np`
- **Redirect URLs:** `https://splitup.mantradigital.com.np/auth/callback`

### Manual deploy

```bash
npm run build:web
```

Then upload everything inside `dist/` to your Hostinger document root (same path as above).

## Push notifications

Call `registerForPushNotifications()` from `lib/notifications.ts` after the user signs in, then save the Expo push token to Supabase.
