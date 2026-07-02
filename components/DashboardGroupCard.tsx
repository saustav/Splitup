import { Pressable, Text, View } from 'react-native';

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

type DashboardGroupCardProps = {
  group: Group;
  netBalance: number;
  lastActiveAt?: string | null;
  onPress: () => void;
};

function formatSignedAmount(amount: number, currency: string): string {
  if (isEffectivelyZero(amount)) {
    return formatMoneyCompact(0, currency);
  }
  const formatted = formatMoneyCompact(Math.abs(amount), currency);
  return amount > 0 ? `+${formatted}` : `-${formatted}`;
}

export function DashboardGroupCard({
  group,
  netBalance,
  lastActiveAt = null,
  onPress,
}: DashboardGroupCardProps) {
  const sign = balanceSign(netBalance);
  const settled = sign === 'settled';
  const owes = sign === 'owes';
  const owed = sign === 'owed';

  const amountClass = owes
    ? 'text-[#D85A30]'
    : owed
      ? 'text-[#1D9E75]'
      : 'text-on-surface-variant';

  const meta = settled
    ? `${group.member_count} member${group.member_count === 1 ? '' : 's'} · Settled up`
    : `${group.member_count} member${group.member_count === 1 ? '' : 's'} · ${formatGroupLastActive(lastActiveAt, false)}`;

  return (
    <Pressable
      onPress={onPress}
      className="mb-[10px] flex-row items-center gap-md rounded-[14px] border border-outline-variant/40 bg-surface-container-low px-md py-[14px] active:opacity-90"
    >
      <View
        className="h-[42px] w-[42px] items-center justify-center rounded-xl"
        style={{ backgroundColor: groupIconBackgroundForName(group.name) }}
      >
        <Text className="text-lg">{groupEmojiForName(group.name)}</Text>
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
      </View>

      <View className="items-end">
        <Text className={`font-sans-medium text-body-md ${amountClass}`}>
          {formatSignedAmount(netBalance, group.currency)}
        </Text>
        <Text className="mt-0.5 font-sans text-label-md text-on-surface-variant">
          {dashboardGroupStatusLabel(netBalance)}
        </Text>
      </View>
    </Pressable>
  );
}
