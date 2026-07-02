import { Text, View } from 'react-native';

import { BalanceHero } from '@/components/BalanceHero';
import { ConvertedAmountLabel } from '@/components/ConvertedAmountLabel';
import { getCurrencyByCode } from '@/constants/currencies';
import {
  groupEmojiForName,
  groupIconBackgroundForName,
  initialsFromLabel,
} from '@/lib/groupDisplay';
import { yourBalanceStatusLabel } from '@/lib/balanceDisplay';
import { memberDisplayName } from '@/lib/members';
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
  const currencyMeta = getCurrencyByCode(group.currency);
  const statusLabel = yourBalanceStatusLabel(yourBalance);

  return (
    <View className="overflow-hidden rounded-card border border-outline-variant/40 bg-surface-container-low">
      <View className="p-md">
        <View className="mb-md flex-row items-center gap-md">
          <View
            className="h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: groupIconBackgroundForName(group.name) }}
          >
            <Text className="text-xl">{groupEmojiForName(group.name)}</Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-sans-medium text-headline-sm text-on-surface">
              {group.name}
            </Text>
            <Text className="mt-0.5 font-sans text-label-md text-on-surface-variant">
              {members.length} member{members.length === 1 ? '' : 's'}
              {' · '}
              {currencyMeta?.flag ?? '🌐'} {group.currency}
              {' · '}
              {expenseCount} expense{expenseCount === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        <BalanceHero
          variant="group"
          label="Your balance"
          netBalance={yourBalance}
          currency={group.currency}
          statusLabel={statusLabel}
        />
        <ConvertedAmountLabel
          amount={yourBalance}
          fromCurrency={group.currency}
          className="mt-sm font-sans text-label-md text-on-surface-variant"
        />
      </View>

      {members.length > 0 ? (
        <View className="border-t border-outline-variant/40 px-md py-sm">
          <Text className="mb-sm font-sans-medium text-label-md text-on-surface-variant">
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
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-brand-mint">
                    <Text className="font-sans-semibold text-label-md text-brand-deeper">
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
