import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

import { formatNPR } from '@/lib/currency';
import { completeSettlement, createSettlement } from '@/lib/settlements';
import { getEsewaConfig, isEsewaConfigured } from '@/lib/payments/esewa';
import { isKhaltiConfigured } from '@/lib/payments/khalti';

export type SettlementPaymentParams = {
  groupId: string;
  payeeId: string;
  payeeName: string;
  amount: number;
  provider: 'khalti' | 'esewa';
};

/**
 * Opens provider checkout (or info page) and records a pending settlement.
 * Confirm with completeSettlement after payment succeeds.
 */
export async function startSettlementPayment(
  params: SettlementPaymentParams
): Promise<{ settlementId: string }> {
  const settlementId = await createSettlement({
    groupId: params.groupId,
    payeeId: params.payeeId,
    amount: params.amount,
    provider: params.provider,
  });

  const ref = settlementId.slice(0, 8);
  let url: string | null = null;

  if (params.provider === 'khalti') {
    if (isKhaltiConfigured()) {
      // Production: replace with Edge Function URL that returns Khalti pidx checkout URL
      url = `https://khalti.com/?ref=${ref}&amount=${Math.round(params.amount * 100)}`;
    } else {
      url = 'https://khalti.com/';
    }
  } else if (params.provider === 'esewa') {
    if (isEsewaConfigured()) {
      const { baseUrl } = getEsewaConfig();
      url = `${baseUrl}?amt=${params.amount}&tx=${ref}`;
    } else {
      url = 'https://esewa.com.np/';
    }
  }

  if (url) {
    await WebBrowser.openBrowserAsync(url);
  }

  const needsBackend =
    (params.provider === 'khalti' && !isKhaltiConfigured()) ||
    (params.provider === 'esewa' && !isEsewaConfigured());

  return new Promise((resolve, reject) => {
    const message = needsBackend
      ? `Pay ${formatNPR(params.amount)} to ${params.payeeName} using ${params.provider === 'khalti' ? 'Khalti' : 'eSewa'}.\n\nAdd payment keys in .env and a Supabase Edge Function for automatic verification. Tap "I've paid" when done.`
      : `Pay ${formatNPR(params.amount)} to ${params.payeeName}. Complete payment in the browser, then tap "I've paid".`;

    Alert.alert(
      `${params.provider === 'khalti' ? 'Khalti' : 'eSewa'} payment`,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => reject(new Error('Payment cancelled')),
        },
        {
          text: "I've paid",
          onPress: async () => {
            try {
              await completeSettlement(settlementId);
              resolve({ settlementId });
            } catch (e) {
              reject(e);
            }
          },
        },
      ]
    );
  });
}

export function getPaymentSetupHint(): string {
  const hints: string[] = [];
  if (!isKhaltiConfigured()) {
    hints.push('EXPO_PUBLIC_KHALTI_PUBLIC_KEY');
  }
  if (!isEsewaConfigured()) {
    hints.push('EXPO_PUBLIC_ESEWA_MERCHANT_CODE');
  }
  if (hints.length === 0) return '';
  return `Add ${hints.join(' and ')} to .env for live checkout URLs.`;
}
