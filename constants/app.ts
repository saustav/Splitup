/** Display name shown in the UI and on the device home screen (app.json). */
export const APP_NAME = "Split It";

/** Settle up screen and manual cash payment recording. */
export const SETTLE_UP_ENABLED = true;

/** Khalti / eSewa checkout — requires Supabase Edge Functions (future phase). */
export const PAYMENT_INTEGRATIONS_ENABLED = false;

/**
 * WhatsApp expense bot — requires Meta Business API + `whatsapp-webhook` Edge Function.
 * See lib/whatsapp/README.md
 */
export const WHATSAPP_BOT_ENABLED = true;
