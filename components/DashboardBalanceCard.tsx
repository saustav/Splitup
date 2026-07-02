import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Text, View } from 'react-native';

import { formatMoneyCompact } from '@/lib/currency';

type DashboardBalanceCardProps = {
  netBalance: number;
  totalYouOwe: number;
  totalOwedToYou: number;
  currency: string;
  convertedNetBalance?: number | null;
  convertedYouOwe?: number | null;
  convertedOwedToYou?: number | null;
  displayCurrency?: string;
  isConverting?: boolean;
  showConverted?: boolean;
};

function BalancePill({
  icon,
  label,
  amount,
  amountClassName,
}: {
  icon: 'north-east' | 'south-west';
  label: string;
  amount: string;
  amountClassName: string;
}) {
  return (
    <View className="flex-row items-center gap-xs rounded-full bg-white/10 px-sm py-xs">
      <MaterialIcons
        name={icon}
        size={14}
        color={icon === 'north-east' ? '#F5C4B3' : '#9FE1CB'}
      />
      <Text className="font-sans text-label-md text-white/65">{label}</Text>
      <Text className={`font-sans-medium text-label-md ${amountClassName}`}>
        {amount}
      </Text>
    </View>
  );
}

export function DashboardBalanceCard({
  netBalance,
  totalYouOwe,
  totalOwedToYou,
  currency,
  convertedNetBalance = null,
  convertedYouOwe = null,
  convertedOwedToYou = null,
  displayCurrency = currency,
  isConverting = false,
  showConverted = false,
}: DashboardBalanceCardProps) {
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
    <View className="relative overflow-hidden rounded-[20px] bg-[#0F6E56] p-lg">
      <View className="absolute -right-5 -top-5 h-[120px] w-[120px] rounded-full bg-white/5" />
      <View className="absolute bottom-[-30px] right-5 h-20 w-20 rounded-full bg-white/[0.04]" />

      <Text className="font-sans text-label-md text-white/65">
        Your net balance
      </Text>

      {isConverting ? (
        <ActivityIndicator className="my-md" color="#ffffff" />
      ) : (
        <Text className="mb-md font-sans-medium text-[32px] leading-[40px] text-white">
          {formatMoneyCompact(mainNet, mainCurrency)}
        </Text>
      )}

      <View className="flex-row flex-wrap gap-sm">
        <BalancePill
          icon="north-east"
          label="You owe"
          amount={formatMoneyCompact(mainOwe, mainCurrency)}
          amountClassName="text-[#F5C4B3]"
        />
        <BalancePill
          icon="south-west"
          label="Owed to you"
          amount={formatMoneyCompact(mainOwed, mainCurrency)}
          amountClassName="text-[#9FE1CB]"
        />
      </View>
    </View>
  );
}
