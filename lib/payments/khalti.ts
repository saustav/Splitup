/**
 * Khalti payment integration.
 * Docs: https://docs.khalti.com/
 *
 * Flow: initiate payment on your Supabase Edge Function or backend,
 * then open the Khalti checkout URL / SDK with the returned payment URL.
 */

export type KhaltiPaymentParams = {
  amount: number; // in paisa (e.g. Rs. 100 = 10000)
  purchaseOrderId: string;
  purchaseOrderName: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
};

export function isKhaltiConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_KHALTI_PUBLIC_KEY);
}

export function getKhaltiPublicKey(): string {
  const key = process.env.EXPO_PUBLIC_KHALTI_PUBLIC_KEY;
  if (!key) {
    throw new Error('EXPO_PUBLIC_KHALTI_PUBLIC_KEY is not set');
  }
  return key;
}

/**
 * Placeholder — replace with Khalti SDK or WebView checkout once
 * you have a server-side payment initiation endpoint.
 */
export async function initiateKhaltiPayment(
  _params: KhaltiPaymentParams
): Promise<{ paymentUrl: string }> {
  throw new Error(
    'Implement Khalti payment via your Supabase Edge Function. See lib/payments/README.md'
  );
}
