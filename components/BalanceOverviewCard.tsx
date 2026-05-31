import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Text, View } from 'react-native';

import { balanceTone, totalBalanceStatusLabel } from '@/lib/balanceDisplay';
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

  const tone = balanceTone(mainAmount);
  const statusLabel = totalBalanceStatusLabel(mainAmount);

  const labelText = tone.owes
    ? 'text-on-error-container opacity-80'
    : 'text-on-primary-container opacity-80';

  return (
    <View className={`relative overflow-hidden rounded-xl p-md ${tone.cardBg}`}>
      <View
        className={`absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10 ${tone.decorBg}`}
      />
      <View
        className={`absolute -bottom-4 -left-4 h-24 w-24 rounded-full opacity-10 ${tone.decorBg}`}
      />

      <Text className={`font-sans text-body-md ${labelText}`}>
        Total Balance
        {useConverted ? ` (${displayCurrency})` : ''}
      </Text>

      {isConverting ? (
        <ActivityIndicator className="mt-2" color={tone.spinnerColor} />
      ) : (
        <Text className={`font-sans-bold text-display-lg-mobile ${tone.amountText}`}>
          {formatMoneyCompact(mainAmount, mainCurrency)}
        </Text>
      )}

      <View
        className={`mt-sm self-start flex-row items-center rounded-full px-sm py-xs ${tone.chipBg}`}
      >
        <MaterialIcons
          name={tone.statusIcon}
          size={16}
          color={tone.iconColor}
          style={{ marginRight: 4 }}
        />
        <Text className={`font-sans-semibold text-label-md ${tone.chipText}`}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}
