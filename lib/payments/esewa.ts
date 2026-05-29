/**
 * eSewa payment integration.
 * Docs: https://developer.esewa.com.np/
 */

export type EsewaPaymentParams = {
  amount: number;
  transactionUuid: string;
  productCode: string;
  productName: string;
};

export function isEsewaConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_ESEWA_MERCHANT_CODE);
}

export function getEsewaConfig() {
  const merchantCode = process.env.EXPO_PUBLIC_ESEWA_MERCHANT_CODE;
  const env = process.env.EXPO_PUBLIC_ESEWA_ENV ?? 'development';

  if (!merchantCode) {
    throw new Error('EXPO_PUBLIC_ESEWA_MERCHANT_CODE is not set');
  }

  const baseUrl =
    env === 'production'
      ? 'https://esewa.com.np/epay/main'
      : 'https://rc.esewa.com.np/epay/main';

  return { merchantCode, baseUrl, env };
}

/**
 * Placeholder — eSewa requires a signed payload from your backend.
 */
export async function initiateEsewaPayment(
  _params: EsewaPaymentParams
): Promise<{ paymentUrl: string }> {
  throw new Error(
    'Implement eSewa payment via your Supabase Edge Function. See lib/payments/README.md'
  );
}
