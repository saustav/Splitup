import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = (base: string) => `exchange_rates:${base.toUpperCase()}`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type RatesCacheEntry = {
  fetchedAt: number;
  rates: Record<string, number>;
};

const memoryCache = new Map<string, RatesCacheEntry>();

async function readCache(base: string): Promise<RatesCacheEntry | null> {
  const mem = memoryCache.get(base);
  if (mem && Date.now() - mem.fetchedAt < CACHE_TTL_MS) {
    return mem;
  }

  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY(base));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RatesCacheEntry;
    if (Date.now() - parsed.fetchedAt >= CACHE_TTL_MS) {
      return null;
    }
    memoryCache.set(base, parsed);
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(base: string, rates: Record<string, number>): Promise<void> {
  const entry: RatesCacheEntry = { fetchedAt: Date.now(), rates };
  memoryCache.set(base, entry);
  try {
    await AsyncStorage.setItem(CACHE_KEY(base), JSON.stringify(entry));
  } catch {
    /* non-fatal */
  }
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

/** Rates are "1 base = X target" (e.g. 1 USD = 132 NPR). */
export async function getRatesFromBase(
  baseCurrency: string
): Promise<Record<string, number> | null> {
  const base = baseCurrency.toUpperCase();
  const cached = await readCache(base);
  if (cached) {
    return cached.rates;
  }

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

  const rates = await getRatesFromBase(from);
  const rate = rates?.[to];
  if (rate == null || !Number.isFinite(rate)) {
    return null;
  }

  return Math.round(amount * rate * 100) / 100;
}

export async function convertCurrencyBatch(
  items: { amount: number; fromCurrency: string }[],
  toCurrency: string
): Promise<number | null> {
  const to = toCurrency.toUpperCase();
  let sum = 0;
  let anyConverted = false;

  for (const item of items) {
    const from = item.fromCurrency.toUpperCase();
    if (from === to) {
      sum += item.amount;
      anyConverted = true;
      continue;
    }
    const converted = await convertCurrency(item.amount, from, to);
    if (converted == null) {
      return null;
    }
    sum += converted;
    anyConverted = true;
  }

  if (!anyConverted) return null;
  return Math.round(sum * 100) / 100;
}
