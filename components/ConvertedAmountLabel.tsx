import { ActivityIndicator, Text, View } from 'react-native';

import { useCurrencyConversion } from '@/hooks/useCurrencyConversion';
import { useProfileDisplayCurrency } from '@/hooks/useProfileDisplayCurrency';
import { balanceTone } from '@/lib/balanceDisplay';
import { useAuthStore } from '@/stores/authStore';

type ConvertedAmountLabelProps = {
  amount: number;
  fromCurrency: string;
  className?: string;
  prefix?: string;
};

/**
 * Secondary line: approximate amount in the user's default currency
 * (Account → Default currency + "Show converted amounts").
 */
export function ConvertedAmountLabel({
  amount,
  fromCurrency,
  className,
  prefix = '≈ ',
}: ConvertedAmountLabelProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const { defaultCurrency, showConverted } = useProfileDisplayCurrency(userId);
  const tone = balanceTone(amount);
  const resolvedClassName =
    className ?? `font-sans text-label-md ${tone.convertedHintText}`;
  const { formatted, isLoading, show } = useCurrencyConversion(
    amount,
    fromCurrency,
    defaultCurrency,
    showConverted
  );

  if (!showConverted || fromCurrency.toUpperCase() === defaultCurrency.toUpperCase()) {
    return null;
  }

  if (isLoading) {
    return (
      <View className="mt-0.5">
        <ActivityIndicator size="small" color="#6c7a71" />
      </View>
    );
  }

  if (!show || !formatted) {
    return null;
  }

  return (
    <Text className={resolvedClassName}>
      {prefix}
      {formatted} ({defaultCurrency})
    </Text>
  );
}
