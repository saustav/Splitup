import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { TopAppBar } from '@/components/TopAppBar';
import { formatMoney } from '@/lib/currency';
import { fetchGroupById } from '@/lib/groups';
import { getPaymentSetupHint, startSettlementPayment } from '@/lib/payments/settle';
import { enrichDebts, simplifyDebts } from '@/lib/settlements';
import { useAuthStore } from '@/stores/authStore';
import { useExpensesStore } from '@/stores/expensesStore';

export default function SettleUpScreen() {
  const router = useRouter();
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const balances = useExpensesStore((s) => s.balances);
  const members = useExpensesStore((s) => s.members);
  const loadForGroup = useExpensesStore((s) => s.loadForGroup);
  const [payingKey, setPayingKey] = useState<string | null>(null);
  const [currencyCode, setCurrencyCode] = useState('USD');

  useEffect(() => {
    if (!groupId) return;
    fetchGroupById(groupId).then((g) => setCurrencyCode(g?.currency ?? 'USD'));
  }, [groupId]);

  const myDebts = useMemo(() => {
    const all = enrichDebts(simplifyDebts(balances), balances);
    return all.filter((d) => d.from_user_id === user?.id);
  }, [balances, user?.id]);

  async function handlePay(
    debt: (typeof myDebts)[0],
    provider: 'khalti' | 'esewa'
  ) {
    if (!groupId || !user) return;

    const key = `${debt.to_user_id}-${provider}`;
    setPayingKey(key);

    try {
      await startSettlementPayment({
        groupId,
        payeeId: debt.to_user_id,
        payeeName: debt.to_name,
        amount: debt.amount,
        provider,
      });
      await loadForGroup(groupId);
      Alert.alert('Success', `Marked payment to ${debt.to_name} as completed.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Payment failed';
      if (msg !== 'Payment cancelled') {
        Alert.alert('Payment', msg);
      }
    } finally {
      setPayingKey(null);
    }
  }

  const setupHint = getPaymentSetupHint();

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <TopAppBar
        title="Settle up"
        showBack
        onBackPress={() => router.back()}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
      <Text className="text-base text-neutral-600 dark:text-neutral-400">
        Simplified debts — pay the fewest people to settle up.
      </Text>

      {setupHint ? (
        <Text className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          {setupHint}
        </Text>
      ) : null}

      {myDebts.length === 0 ? (
        <View className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
          <Text className="text-center text-neutral-600 dark:text-neutral-400">
            You do not owe anyone in this group. You are all settled up.
          </Text>
        </View>
      ) : (
        myDebts.map((debt) => (
          <View
            key={`${debt.to_user_id}-${debt.amount}`}
            className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <Text className="text-lg font-semibold text-neutral-900 dark:text-white">
              Pay {debt.to_name}
            </Text>
            <Text className="mt-1 text-2xl font-bold text-brand-600">
              {formatMoney(debt.amount, currencyCode)}
            </Text>

            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={() => handlePay(debt, 'khalti')}
                disabled={payingKey !== null}
                className="flex-1 rounded-xl bg-purple-600 py-3 active:bg-purple-700 disabled:opacity-50"
              >
                {payingKey === `${debt.to_user_id}-khalti` ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-center font-semibold text-white">Khalti</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => handlePay(debt, 'esewa')}
                disabled={payingKey !== null}
                className="flex-1 rounded-xl bg-green-700 py-3 active:bg-green-800 disabled:opacity-50"
              >
                {payingKey === `${debt.to_user_id}-esewa` ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-center font-semibold text-white">eSewa</Text>
                )}
              </Pressable>
            </View>
          </View>
        ))
      )}

      {myDebts.length > 0 && (
        <View className="mt-6 rounded-xl bg-neutral-100 p-4 dark:bg-neutral-900">
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            All group debts
          </Text>
          {enrichDebts(simplifyDebts(balances), balances).map((d, i) => (
            <Text
              key={i}
              className="mt-2 text-sm text-neutral-600 dark:text-neutral-400"
            >
              {d.from_name} → {d.to_name}: {formatMoney(d.amount, currencyCode)}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
    </View>
  );
}
