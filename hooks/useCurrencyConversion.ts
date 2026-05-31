import { useEffect, useState } from 'react';

import {
  convertCurrency,
  formatMoneyCompact,
  getCachedRatesFromBase,
} from '@/lib/currency';

export function useCurrencyConversion(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  enabled: boolean
) {
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  const shouldConvert = enabled && from !== to && Math.abs(amount) > 0.0001;

  useEffect(() => {
    if (!shouldConvert) {
      setConvertedAmount(null);
      setIsLoading(false);
      return;
    }

    const cachedRates = getCachedRatesFromBase(from);
    if (cachedRates) {
      const rate = cachedRates[to];
      if (rate != null && Number.isFinite(rate)) {
        setConvertedAmount(Math.round(amount * rate * 100) / 100);
        setIsLoading(false);
        return;
      }
    }

    let cancelled = false;
    setIsLoading(true);

    convertCurrency(amount, from, to)
      .then((value) => {
        if (!cancelled) {
          setConvertedAmount(value);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [amount, from, to, shouldConvert]);

  const formatted =
    convertedAmount != null ? formatMoneyCompact(convertedAmount, to) : null;

  return {
    convertedAmount,
    formatted,
    isLoading: shouldConvert && isLoading,
    show: shouldConvert && formatted != null,
  };
}
