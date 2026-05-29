import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';

import { ConvertedAmountLabel } from '@/components/ConvertedAmountLabel';
import { getCurrencyByCode } from '@/constants/currencies';
import { groupIconForName, initialsFromLabel } from '@/lib/groupDisplay';
import { formatMoneyCompact } from '@/lib/currency';
import { memberDisplayName } from '@/lib/members';
import { platformShadow } from '@/lib/platformShadow';
import type { Group, GroupMember } from '@/types/group';

export function GroupDetailHeader({
  group,
  members,
  yourBalance,
  expenseCount,
}: {
  group: Group;
  members: GroupMember[];
  yourBalance: number;
  expenseCount: number;
}) {
  const owed = yourBalance > 0.01;
  const owes = yourBalance < -0.01;
  const currencyMeta = getCurrencyByCode(group.currency);
  const statusLabel = owed
    ? 'You are owed'
    : owes
      ? 'You owe'
      : 'All settled';
  const statusIcon = owed ? 'arrow-upward' : owes ? 'arrow-downward' : 'check';

  return (
    <View
      className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest"
      style={platformShadow('card')}
    >
      <View className="relative bg-primary-container p-md">
        <View className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary opacity-10" />
        <View className="flex-row items-start gap-md">
          <View className="h-14 w-14 items-center justify-center rounded-full border-2 border-on-primary-container/20 bg-surface-container-lowest">
            <MaterialIcons
              name={groupIconForName(group.name)}
              size={28}
              color="#00422b"
            />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-sans-bold text-headline-md text-on-primary-container">
              {group.name}
            </Text>
            <Text className="mt-xs font-sans text-body-md text-on-primary-container/80">
              {members.length} member{members.length === 1 ? '' : 's'}
              {' · '}
              {currencyMeta?.flag ?? '🌐'} {group.currency}
            </Text>
            <Text className="mt-xs font-sans text-label-md text-on-primary-container/70">
              {expenseCount} expense{expenseCount === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        <View className="mt-md flex-row items-end justify-between">
          <View>
            <Text className="font-sans text-label-md text-on-primary-container/80">
              Your balance
            </Text>
            <Text className="font-sans-bold text-display-lg-mobile text-on-primary-container">
              {formatMoneyCompact(yourBalance, group.currency)}
            </Text>
            <ConvertedAmountLabel
              amount={yourBalance}
              fromCurrency={group.currency}
              className="font-sans text-label-md text-on-primary-container/75"
            />
          </View>
          <View className="flex-row items-center rounded-full bg-secondary-container px-sm py-xs">
            <MaterialIcons
              name={statusIcon}
              size={16}
              color="#306d58"
              style={{ marginRight: 4 }}
            />
            <Text className="font-sans-semibold text-label-md text-on-secondary-container">
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>

      {members.length > 0 ? (
        <View className="border-t border-outline-variant/20 px-md py-sm">
          <Text className="mb-sm font-sans-semibold text-label-md text-on-surface-variant">
            Members
          </Text>
          <View className="flex-row flex-wrap gap-sm">
            {members.map((member) => {
              const label = memberDisplayName(member);
              return (
                <View
                  key={member.user_id}
                  className="flex-row items-center gap-xs rounded-full bg-surface-container-high px-sm py-xs"
                >
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-tertiary-fixed">
                    <Text className="font-sans-semibold text-[10px] text-on-tertiary-fixed">
                      {initialsFromLabel(label)}
                    </Text>
                  </View>
                  <Text
                    className="max-w-[100px] font-sans text-label-md text-on-surface"
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
