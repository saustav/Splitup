# Split It

Split bills with friends — built for Nepal with Khalti and eSewa payments.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React Native + Expo (iOS, Android, Web) |
| Styling | NativeWind (Tailwind CSS) |
| Backend & DB | Supabase (PostgreSQL + realtime) |
| Auth | Supabase Auth (Google, Apple) |
| State | Zustand |
| Navigation | Expo Router |
| Push | Expo Notifications |
| Payments | Khalti, eSewa |
| Web hosting | Vercel |
| Version control | GitHub |

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
5. Add redirect URLs under **Auth → URL Configuration**:
   - `splitup://auth/callback` (iOS/Android)
   - `http://localhost:8081/auth/callback` (local web — use the port shown in the terminal)
   - Your production web URL + `/auth/callback` after deploying

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

| Feature | How to use |
|---------|------------|
| **Invite friends** | Group screen → **Invite** → share link or code (`splitup://invite/CODE`) |
| **Join via invite** | Friend opens link while signed in → joins group |
| **Unequal splits** | Add expense → **Custom** → enter amount per person (must sum to total) |
| **Settle up** | Group screen → **Settle up** → pay via **Khalti** or **eSewa** |
| **Payment keys** | Add Khalti/eSewa vars to `.env`; use a Supabase Edge Function for live checkout (see `lib/payments/README.md`) |

Settlements simplify debts (fewest payments) and record payment history. Tap **I've paid** after completing payment in the browser.

## Payments (Khalti & eSewa)

Secret keys must live on the server. Use Supabase Edge Functions to initiate payments and verify webhooks. See `lib/payments/README.md`.

## Deploy web to Vercel

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add environment variables (`EXPO_PUBLIC_*`).
4. Vercel uses `vercel.json` to run `expo export -p web`.

## Push notifications

Call `registerForPushNotifications()` from `lib/notifications.ts` after the user signs in, then save the Expo push token to Supabase.
