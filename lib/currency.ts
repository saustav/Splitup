import AsyncStorage from '@react-native-async-storage/async-storage';

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

// ---------------------------------------------------------------------------
// Exchange rates — memory + AsyncStorage cache, 24 h TTL, in-flight dedupe
// ---------------------------------------------------------------------------

const CACHE_KEY = (base: string) => `exchange_rates:${base.toUpperCase()}`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type RatesCacheEntry = {
  fetchedAt: number;
  rates: Record<string, number>;
};

const memoryCache = new Map<string, RatesCacheEntry>();
const inFlightFetches = new Map<string, Promise<Record<string, number> | null>>();

function isFresh(entry: RatesCacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

async function readCache(base: string): Promise<RatesCacheEntry | null> {
  const key = base.toUpperCase();
  const mem = memoryCache.get(key);
  if (mem && isFresh(mem)) {
    return mem;
  }

  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RatesCacheEntry;
    if (!isFresh(parsed)) {
      return null;
    }
    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(
  base: string,
  rates: Record<string, number>
): Promise<void> {
  const key = base.toUpperCase();
  const entry: RatesCacheEntry = { fetchedAt: Date.now(), rates };
  memoryCache.set(key, entry);
  try {
    await AsyncStorage.setItem(CACHE_KEY(key), JSON.stringify(entry));
  } catch {
    /* non-fatal */
  }
}

/** Synchronous read from the in-memory cache (no network / disk). */
export function getCachedRatesFromBase(
  baseCurrency: string
): Record<string, number> | null {
  const entry = memoryCache.get(baseCurrency.toUpperCase());
  if (!entry || !isFresh(entry)) {
    return null;
  }
  return entry.rates;
}

function convertWithRate(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number | null {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) {
    return Math.round(amount * 100) / 100;
  }

  const rate = rates[to];
  if (rate == null || !Number.isFinite(rate)) {
    return null;
  }

  return Math.round(amount * rate * 100) / 100;
}

/** Frankfurter (ECB) — free, no API key. */
async function fetchFrankfurterRates(
  base: string
): Promise<Record<string, number>> {
  const res = await fetch(
    `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`
  );
  if (!res.ok) {
    throw new Error(`Frankfurter: ${res.status}`);
  }
  const data = (await res.json()) as { rates?: Record<string, number> };
  if (!data.rates || typeof data.rates !== 'object') {
    throw new Error('Frankfurter: invalid response');
  }
  return data.rates;
}

/** ExchangeRate-API free tier fallback. */
async function fetchExchangeRateApiRates(
  base: string
): Promise<Record<string, number>> {
  const res = await fetch(
    `https://api.exchangerate-api.com/v4/latest/${encodeURIComponent(base)}`
  );
  if (!res.ok) {
    throw new Error(`ExchangeRate-API: ${res.status}`);
  }
  const data = (await res.json()) as { rates?: Record<string, number> };
  if (!data.rates || typeof data.rates !== 'object') {
    throw new Error('ExchangeRate-API: invalid response');
  }
  return data.rates;
}

async function fetchAndCacheRates(
  base: string
): Promise<Record<string, number> | null> {
  let rates: Record<string, number>;
  try {
    rates = await fetchFrankfurterRates(base);
  } catch {
    try {
      rates = await fetchExchangeRateApiRates(base);
    } catch {
      return null;
    }
  }

  await writeCache(base, rates);
  return rates;
}

/** Rates are "1 base = X target" (e.g. 1 USD = 132 NPR). */
export async function getRatesFromBase(
  baseCurrency: string
): Promise<Record<string, number> | null> {
  const base = baseCurrency.toUpperCase();

  const cached = await readCache(base);
  if (cached) {
    return cached.rates;
  }

  const inFlight = inFlightFetches.get(base);
  if (inFlight) {
    return inFlight;
  }

  const promise = fetchAndCacheRates(base).finally(() => {
    inFlightFetches.delete(base);
  });
  inFlightFetches.set(base, promise);
  return promise;
}

/** Warm the cache for a set of base currencies (one network call each). */
export async function prefetchRatesForCurrencies(
  baseCurrencies: string[]
): Promise<void> {
  const unique = [
    ...new Set(baseCurrencies.map((c) => c.toUpperCase()).filter(Boolean)),
  ];
  await Promise.all(unique.map((base) => getRatesFromBase(base)));
}

/**
 * Convert `amount` from `fromCurrency` to `toCurrency`.
 * Returns null if the pair is unavailable (e.g. unsupported ISO code).
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) {
    return Math.round(amount * 100) / 100;
  }

  const cached = getCachedRatesFromBase(from);
  if (cached) {
    return convertWithRate(amount, from, to, cached);
  }

  const rates = await getRatesFromBase(from);
  if (!rates) {
    return null;
  }

  return convertWithRate(amount, from, to, rates);
}

export async function convertCurrencyBatch(
  items: { amount: number; fromCurrency: string }[],
  toCurrency: string
): Promise<number | null> {
  const to = toCurrency.toUpperCase();
  if (items.length === 0) {
    return null;
  }

  const uniqueBases = [
    ...new Set(
      items
        .map((item) => item.fromCurrency.toUpperCase())
        .filter((from) => from !== to)
    ),
  ];

  const ratesByBase = new Map<string, Record<string, number>>();
  await Promise.all(
    uniqueBases.map(async (base) => {
      const rates = await getRatesFromBase(base);
      if (rates) {
        ratesByBase.set(base, rates);
      }
    })
  );

  let sum = 0;
  let anyConverted = false;

  for (const item of items) {
    const from = item.fromCurrency.toUpperCase();
    if (from === to) {
      sum += item.amount;
      anyConverted = true;
      continue;
    }

    const rates = ratesByBase.get(from);
    if (!rates) {
      return null;
    }

    const converted = convertWithRate(item.amount, from, to, rates);
    if (converted == null) {
      return null;
    }

    sum += converted;
    anyConverted = true;
  }

  if (!anyConverted) {
    return null;
  }

  return Math.round(sum * 100) / 100;
}
