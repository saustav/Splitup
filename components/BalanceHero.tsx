import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { formatMoneyCompact } from '@/lib/currency';

type BalanceHeroProps = {
  variant?: 'dashboard' | 'group';
  label?: string;
  netBalance: number;
  totalYouOwe?: number;
  totalOwedToYou?: number;
  currency: string;
  convertedNetBalance?: number | null;
  convertedYouOwe?: number | null;
  convertedOwedToYou?: number | null;
  displayCurrency?: string;
  isConverting?: boolean;
  showConverted?: boolean;
  statusLabel?: string;
};

function BalancePill({
  icon,
  label,
  amount,
  amountColor,
}: {
  icon: 'north-east' | 'south-west';
  label: string;
  amount: string;
  amountColor: string;
}) {
  return (
    <View className="flex-row items-center gap-xs rounded-full bg-white/10 px-sm py-xs">
      <MaterialIcons name={icon} size={12} color={amountColor} />
      <Text className="font-sans text-[11px] text-white/65">{label}</Text>
      <Text className="font-sans-medium text-[11px]" style={{ color: amountColor }}>
        {amount}
      </Text>
    </View>
  );
}

export function BalanceHero({
  variant = 'dashboard',
  label = 'Your net balance',
  netBalance,
  totalYouOwe = 0,
  totalOwedToYou = 0,
  currency,
  convertedNetBalance = null,
  convertedYouOwe = null,
  convertedOwedToYou = null,
  displayCurrency = currency,
  isConverting = false,
  showConverted = false,
  statusLabel,
}: BalanceHeroProps) {
  const useConverted =
    showConverted &&
    convertedNetBalance != null &&
    convertedYouOwe != null &&
    convertedOwedToYou != null &&
    !isConverting;

  const mainCurrency = useConverted ? displayCurrency : currency;
  const mainNet = useConverted ? convertedNetBalance : netBalance;
  const mainOwe = useConverted ? convertedYouOwe : totalYouOwe;
  const mainOwed = useConverted ? convertedOwedToYou : totalOwedToYou;

  return (
    <View className="relative overflow-hidden rounded-hero bg-brand-600 p-md">
      <View className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/5" />
      <View className="absolute bottom-[-20px] right-4 h-14 w-14 rounded-full bg-white/[0.04]" />

      <Text className="font-sans text-label-md text-white/65">{label}</Text>

      {isConverting ? (
        <ActivityIndicator className="my-sm" color="#ffffff" />
      ) : (
        <Text className="mb-sm font-sans-medium text-display-lg-mobile text-white">
          {formatMoneyCompact(mainNet, mainCurrency)}
        </Text>
      )}

      {variant === 'dashboard' ? (
        <View className="flex-row flex-wrap gap-sm">
          <BalancePill
            icon="north-east"
            label="You owe"
            amount={formatMoneyCompact(mainOwe, mainCurrency)}
            amountColor={colors.owe.light}
          />
          <BalancePill
            icon="south-west"
            label="Owed to you"
            amount={formatMoneyCompact(mainOwed, mainCurrency)}
            amountColor={colors.owed.light}
          />
        </View>
      ) : statusLabel ? (
        <View className="self-start rounded-full bg-white/10 px-sm py-xs">
          <Text className="font-sans-medium text-label-md text-white">
            {statusLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
