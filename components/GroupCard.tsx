import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

import { ConvertedAmountLabel } from '@/components/ConvertedAmountLabel';
import {
  balanceSign,
  dashboardGroupStatusLabel,
  isEffectivelyZero,
} from '@/lib/balanceDisplay';
import { formatMoneyCompact } from '@/lib/currency';
import {
  formatGroupLastActive,
  groupEmojiForName,
  groupIconBackgroundForName,
} from '@/lib/groupDisplay';
import type { Group } from '@/types/group';

type GroupCardProps = {
  group: Group;
  netBalance?: number;
  lastActiveAt?: string | null;
  pendingActionCount?: number;
  onPress: () => void;
};

function formatSignedAmount(amount: number, currency: string): string {
  if (isEffectivelyZero(amount)) {
    return formatMoneyCompact(0, currency);
  }
  const formatted = formatMoneyCompact(Math.abs(amount), currency);
  return amount > 0 ? `+${formatted}` : `-${formatted}`;
}

export function GroupCard({
  group,
  netBalance,
  lastActiveAt = null,
  pendingActionCount = 0,
  onPress,
}: GroupCardProps) {
  const hasBalance = netBalance !== undefined;
  const sign = hasBalance ? balanceSign(netBalance) : 'settled';
  const settled = sign === 'settled';
  const owes = sign === 'owes';
  const owed = sign === 'owed';
  const showConverted =
    hasBalance && netBalance !== undefined && !isEffectivelyZero(netBalance);

  const amountClass = owes
    ? 'text-owe-default'
    : owed
      ? 'text-owed-default'
      : 'text-on-surface-variant';

  const meta = settled
    ? `${group.member_count} member${group.member_count === 1 ? '' : 's'} · Settled up`
    : `${group.member_count} member${group.member_count === 1 ? '' : 's'} · ${formatGroupLastActive(lastActiveAt, false)}`;

  return (
    <Pressable
      onPress={onPress}
      className="mb-2 flex-row items-center gap-sm rounded-card border border-outline-variant/40 bg-surface-container-low px-sm py-sm active:opacity-90"
    >
      <View className="relative">
        <View
          className="h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: groupIconBackgroundForName(group.name) }}
        >
          <Text className="text-base">{groupEmojiForName(group.name)}</Text>
        </View>
        {pendingActionCount > 0 ? (
          <View className="absolute -right-1 -top-1 min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-error">
            <MaterialIcons name="notifications" size={10} color="#ffffff" />
          </View>
        ) : null}
      </View>

      <View className="min-w-0 flex-1">
        <Text
          className="font-sans-medium text-body-md text-on-surface"
          numberOfLines={1}
        >
          {group.name}
        </Text>
        <Text className="font-sans text-label-md text-on-surface-variant">
          {meta}
        </Text>
        {pendingActionCount > 0 ? (
          <Text className="mt-0.5 font-sans-semibold text-label-md text-error">
            {pendingActionCount === 1
              ? 'Confirm payment'
              : `${pendingActionCount} payments to confirm`}
          </Text>
        ) : null}
      </View>

      {hasBalance ? (
        <View className="items-end">
          <Text className={`font-sans-medium text-body-md ${amountClass}`}>
            {formatSignedAmount(netBalance, group.currency)}
          </Text>
          <Text className="mt-0.5 font-sans text-label-md text-on-surface-variant">
            {dashboardGroupStatusLabel(netBalance)}
          </Text>
          {showConverted ? (
            <ConvertedAmountLabel
              amount={netBalance}
              fromCurrency={group.currency}
              className="font-sans text-label-md text-on-surface-variant"
            />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
