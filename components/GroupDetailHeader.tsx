import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';

import { ConvertedAmountLabel } from '@/components/ConvertedAmountLabel';
import { getCurrencyByCode } from '@/constants/currencies';
import { groupIconForName, initialsFromLabel } from '@/lib/groupDisplay';
import { formatMoneyCompact } from '@/lib/currency';
import {
  balanceTone,
  yourBalanceStatusLabel,
} from '@/lib/balanceDisplay';
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
  const tone = balanceTone(yourBalance);
  const currencyMeta = getCurrencyByCode(group.currency);
  const statusLabel = yourBalanceStatusLabel(yourBalance);

  return (
    <View
      className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest"
      style={platformShadow('card')}
    >
      <View className={`relative p-md ${tone.cardBg}`}>
        <View
          className={`absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-10 ${tone.decorBg}`}
        />
        <View className="flex-row items-start gap-md">
          <View
            className={`h-14 w-14 items-center justify-center rounded-full border-2 bg-surface-container-lowest ${
              tone.owes
                ? 'border-on-error-container/20'
                : 'border-on-primary-container/20'
            }`}
          >
            <MaterialIcons
              name={groupIconForName(group.name)}
              size={28}
              color={tone.avatarIconColor}
            />
          </View>
          <View className="min-w-0 flex-1">
            <Text className={`font-sans-bold text-headline-md ${tone.onContainer}`}>
              {group.name}
            </Text>
            <Text className={`mt-xs font-sans text-body-md ${tone.onContainerMuted}`}>
              {members.length} member{members.length === 1 ? '' : 's'}
              {' · '}
              {currencyMeta?.flag ?? '🌐'} {group.currency}
            </Text>
            <Text className={`mt-xs font-sans text-label-md ${tone.onContainerSubtle}`}>
              {expenseCount} expense{expenseCount === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        <View className="mt-md flex-row items-end justify-between">
          <View>
            <Text className={`font-sans text-label-md ${tone.onContainerMuted}`}>
              Your balance
            </Text>
            <Text className={`font-sans-bold text-display-lg-mobile ${tone.amountText}`}>
              {formatMoneyCompact(yourBalance, group.currency)}
            </Text>
            <ConvertedAmountLabel
              amount={yourBalance}
              fromCurrency={group.currency}
              className={`font-sans text-label-md ${tone.onContainerFaint}`}
            />
          </View>
          <View
            className={`flex-row items-center rounded-full px-sm py-xs ${tone.chipBg}`}
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
