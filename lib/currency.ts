import { getCurrencyByCode } from '@/constants/currencies';

const LOCALE_BY_CURRENCY: Record<string, string> = {
  USD: 'en-US',
  GBP: 'en-GB',
  EUR: 'de-DE',
  INR: 'en-IN',
  NPR: 'en-NP',
  JPY: 'ja-JP',
};

function localeFor(code: string): string {
  return LOCALE_BY_CURRENCY[code.toUpperCase()] ?? 'en-US';
}

/** Format amount using ISO 4217 currency code. */
export function formatMoney(amount: number, currencyCode: string): string {
  const code = currencyCode.toUpperCase();
  try {
    return new Intl.NumberFormat(localeFor(code), {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const symbol = getCurrencyByCode(code)?.symbol ?? code;
    return `${symbol} ${amount.toFixed(2)}`;
  }
}

/** Compact format for lists (no decimals for large whole amounts). */
export function formatMoneyCompact(amount: number, currencyCode: string): string {
  const code = currencyCode.toUpperCase();
  const abs = Math.abs(amount);
  try {
    return new Intl.NumberFormat(localeFor(code), {
      style: 'currency',
      currency: code,
      minimumFractionDigits: abs >= 100 ? 0 : 2,
      maximumFractionDigits: abs >= 100 ? 0 : 2,
    }).format(amount);
  } catch {
    const symbol = getCurrencyByCode(code)?.symbol ?? code;
    return `${symbol} ${abs.toLocaleString()}`;
  }
}

/** @deprecated Use formatMoney(amount, 'NPR') */
export function formatNPR(amount: number): string {
  return formatMoney(amount, 'NPR');
}

/** @deprecated Use formatMoneyCompact(amount, 'NPR') */
export function formatNPRCompact(amount: number): string {
  return formatMoneyCompact(amount, 'NPR');
}

export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/,/g, '').trim();
  const value = parseFloat(cleaned);
  if (Number.isNaN(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

/** Currency code label for amount inputs (e.g. USD, NPR). */
export function currencyInputLabel(currencyCode: string): string {
  return currencyCode.toUpperCase();
}
