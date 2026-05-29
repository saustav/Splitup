# Nepal payment integrations

Both Khalti and eSewa require **server-side** payment initiation (secret keys must never live in the app).

## Settle up flow (in app)

1. User opens **Settle up** on a group → sees simplified debts.
2. `create_settlement` RPC records a pending payment.
3. App opens Khalti/eSewa in the browser (demo URL without keys).
4. User taps **I've paid** → `complete_settlement` marks it done.

## Production checkout

1. Client calls a Supabase Edge Function with amount + settlement id.
2. Edge Function signs the request and returns a checkout URL or token.
3. Client opens the URL in `expo-web-browser`.
4. Provider webhook verifies payment and calls `complete_settlement`.

See `lib/payments/settle.ts` for the client entry point.
