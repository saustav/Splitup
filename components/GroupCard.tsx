import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

import { ConvertedAmountLabel } from '@/components/ConvertedAmountLabel';
import { getCurrencyByCode } from '@/constants/currencies';
import { formatMoneyCompact } from '@/lib/currency';
import { groupIconForName } from '@/lib/groupDisplay';
import { platformShadow } from '@/lib/platformShadow';
import type { Group } from '@/types/group';

type GroupCardProps = {
  group: Group;
  netBalance?: number;
  onPress: () => void;
};

export function GroupCard({ group, netBalance, onPress }: GroupCardProps) {
  const owes = netBalance !== undefined && netBalance < -0.01;
  const owed = netBalance !== undefined && netBalance > 0.01;

  const statusLabel = owes ? 'You owe' : owed ? 'You are owed' : 'Pending';
  const statusColor = owes ? 'text-error' : owed ? 'text-primary' : 'text-on-surface-variant';
  const amountColor = owes ? 'text-error' : owed ? 'text-primary' : 'text-on-surface';

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-xl border border-white/20 bg-surface-container-lowest p-md shadow-sm active:scale-[0.98]"
      style={platformShadow('card')}
    >
      <View className="flex-row items-center gap-md">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-surface-container">
          <MaterialIcons name={groupIconForName(group.name)} size={24} color="#006c49" />
        </View>
        <View>
          <Text className="font-sans-semibold text-body-lg text-on-surface">
            {group.name}
          </Text>
          <Text className="font-sans text-body-md text-on-surface-variant">
            {group.member_count} member{group.member_count === 1 ? '' : 's'}
            {' · '}
            {getCurrencyByCode(group.currency)?.flag ?? ''} {group.currency}
          </Text>
        </View>
      </View>

      {netBalance !== undefined && (
        <View className="items-end">
          <Text className={`font-sans-semibold text-label-md ${statusColor} mb-xs`}>
            {statusLabel}
          </Text>
          <Text className={`font-sans-medium text-numeric-data ${amountColor}`}>
            {formatMoneyCompact(netBalance, group.currency)}
          </Text>
          <ConvertedAmountLabel amount={netBalance} fromCurrency={group.currency} />
        </View>
      )}
    </Pressable>
  );
}
