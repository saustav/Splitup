import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Text, View } from 'react-native';

import { formatMoneyCompact } from '@/lib/currency';

type BalanceOverviewCardProps = {
  totalBalance: number;
  /** Group currency when all groups share one; otherwise omit. */
  primaryCurrency?: string;
  /** Total converted to user's default currency (multi-group dashboard). */
  convertedTotal?: number | null;
  displayCurrency?: string;
  isConverting?: boolean;
  showConvertedPrimary?: boolean;
};

export function BalanceOverviewCard({
  totalBalance,
  primaryCurrency = 'USD',
  convertedTotal = null,
  displayCurrency = 'USD',
  isConverting = false,
  showConvertedPrimary = false,
}: BalanceOverviewCardProps) {
  const useConverted =
    showConvertedPrimary && convertedTotal != null && !isConverting;
  const mainAmount = useConverted ? convertedTotal : totalBalance;
  const mainCurrency = useConverted ? displayCurrency : primaryCurrency;

  const owed = mainAmount > 0.01;
  const owes = mainAmount < -0.01;

  const statusLabel = owed
    ? 'You are owed in total'
    : owes
      ? 'You owe in total'
      : 'All settled up';

  const StatusIcon = owed ? 'arrow-upward' : owes ? 'arrow-downward' : 'check';

  const cardBg = owes ? 'bg-error-container' : 'bg-primary-container';
  const decorBg = owes ? 'bg-error' : 'bg-primary';
  const labelText = owes
    ? 'text-on-error-container opacity-80'
    : 'text-on-primary-container opacity-80';
  const amountText = owes ? 'text-error' : 'text-on-primary-container';
  const hintText = owes
    ? 'text-on-error-container/70'
    : 'text-on-primary-container/70';
  const chipBg = owes ? 'bg-error/15' : 'bg-secondary-container';
  const chipText = owes ? 'text-error' : 'text-on-secondary-container';
  const iconColor = owes ? '#ba1a1a' : '#306d58';
  const spinnerColor = owes ? '#ba1a1a' : '#00422b';

  return (
    <View className={`relative overflow-hidden rounded-xl p-md ${cardBg}`}>
      <View
        className={`absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10 ${decorBg}`}
      />
      <View
        className={`absolute -bottom-4 -left-4 h-24 w-24 rounded-full opacity-10 ${decorBg}`}
      />

      <Text className={`font-sans text-body-md ${labelText}`}>
        Total Balance
        {useConverted ? ` (${displayCurrency})` : ''}
      </Text>

      {isConverting ? (
        <ActivityIndicator className="mt-2" color={spinnerColor} />
      ) : (
        <Text className={`font-sans-bold text-display-lg-mobile ${amountText}`}>
          {formatMoneyCompact(mainAmount, mainCurrency)}
        </Text>
      )}

      {useConverted && Math.abs(totalBalance) > 0.01 ? (
        <Text className={`mt-xs font-sans text-label-md ${hintText}`}>
          Raw sum in group currencies may differ when groups use mixed currencies.
        </Text>
      ) : null}

      <View
        className={`mt-sm self-start flex-row items-center rounded-full px-sm py-xs ${chipBg}`}
      >
        <MaterialIcons
          name={StatusIcon}
          size={16}
          color={iconColor}
          style={{ marginRight: 4 }}
        />
        <Text className={`font-sans-semibold text-label-md ${chipText}`}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}
