# Nepal payment integrations

Both Khalti and eSewa require **server-side** payment initiation (secret keys must never live in the app).

## Live today: manual / cash settlements

1. User opens **Settle up** on a group → sees simplified debts.
2. Payer taps **Record payment** after paying in cash → settlement status is **pending**.
3. Payee sees **Pending — confirm you received** on the group or settle screen.
4. Payee taps **Confirm received** → `accept_settlement` marks it **completed** and balances update.

Run `supabase/settlement-acceptance-migration.sql` on existing databases.

## Future: Khalti / eSewa (disabled)

Gated behind `PAYMENT_INTEGRATIONS_ENABLED = false` in `constants/app.ts`.

1. Client calls a Supabase Edge Function with amount + settlement id.
2. Edge Function signs the request and returns a checkout URL or token.
3. Client opens the URL in `expo-web-browser`.
4. Provider webhook verifies payment and calls `complete_settlement` (online providers only).

See `lib/payments/settle.ts` for the online payment client entry point.
