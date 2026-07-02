import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, Text, View } from 'react-native';

import { ConvertedAmountLabel } from '@/components/ConvertedAmountLabel';
import { balanceTone, isEffectivelyZero } from '@/lib/balanceDisplay';
import { formatMoney } from '@/lib/currency';
import { platformShadow } from '@/lib/platformShadow';
import type { MemberBalance } from '@/types/expense';

export function BalanceSummary({
  balances,
  currencyCode = 'USD',
}: {
  balances: MemberBalance[];
  currencyCode?: string;
}) {
  const withActivity = balances.filter((b) => !isEffectivelyZero(b.net_balance));

  if (withActivity.length === 0) {
    return (
      <View className="items-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-lg py-lg">
        <View className="mb-sm h-12 w-12 items-center justify-center rounded-full bg-surface-container">
          <MaterialIcons name="account-balance-wallet" size={26} color="#54534D" />
        </View>
        <Text className="text-center font-sans-semibold text-body-md text-on-surface">
          No balances yet
        </Text>
        <Text className="mt-xs text-center font-sans text-body-md text-on-surface-variant">
          Add an expense to see who owes whom in this group.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingRight: 4 }}
    >
      {withActivity.map((balance) => {
        const tone = balanceTone(balance.net_balance);
        const owes = tone.owes;
        const owed = tone.owed;

        return (
          <View
            key={balance.user_id}
            className="min-w-[148] rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md"
            style={platformShadow('card')}
          >
            <Text
              className="font-sans-semibold text-body-md text-on-surface"
              numberOfLines={1}
            >
              {balance.display_name}
            </Text>
            <View className={`mt-sm self-start rounded-full px-sm py-xs ${tone.listChipBg}`}>
              <Text className={`font-sans-semibold text-label-md ${tone.listChipText}`}>
                {owes ? 'Owes' : owed ? 'Owed' : 'Settled'}
              </Text>
            </View>
            <Text
              className={`mt-sm font-sans-medium text-numeric-data ${tone.listAmountText}`}
            >
              {owes
                ? formatMoney(Math.abs(balance.net_balance), currencyCode)
                : owed
                  ? formatMoney(balance.net_balance, currencyCode)
                  : '—'}
            </Text>
            {(owes || owed) && (
              <ConvertedAmountLabel
                amount={balance.net_balance}
                fromCurrency={currencyCode}
                className={`font-sans text-label-md ${tone.convertedHintText}`}
              />
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
