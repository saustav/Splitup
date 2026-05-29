import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, Text, View } from 'react-native';

import { ConvertedAmountLabel } from '@/components/ConvertedAmountLabel';
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
  const withActivity = balances.filter((b) => Math.abs(b.net_balance) >= 0.01);

  if (withActivity.length === 0) {
    return (
      <View className="items-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-lg py-lg">
        <View className="mb-sm h-12 w-12 items-center justify-center rounded-full bg-surface-container">
          <MaterialIcons name="account-balance-wallet" size={26} color="#6c7a71" />
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
        const owes = balance.net_balance < 0;
        const owed = balance.net_balance > 0;
        const chipBg = owes
          ? 'bg-error-container'
          : owed
            ? 'bg-primary/10'
            : 'bg-surface-container-high';
        const chipText = owes
          ? 'text-error'
          : owed
            ? 'text-primary'
            : 'text-on-surface-variant';

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
            <View className={`mt-sm self-start rounded-full px-sm py-xs ${chipBg}`}>
              <Text className={`font-sans-semibold text-label-md ${chipText}`}>
                {owes ? 'Owes' : owed ? 'Owed' : 'Settled'}
              </Text>
            </View>
            <Text
              className={`mt-sm font-sans-medium text-numeric-data ${
                owes ? 'text-error' : owed ? 'text-primary' : 'text-on-surface-variant'
              }`}
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
              />
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
