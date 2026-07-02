import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { uiColors } from '@/constants/theme';
import { ConvertedAmountLabel } from '@/components/ConvertedAmountLabel';
import {
  PendingSettlementsSection,
  useEnrichedPendingSettlements,
} from '@/components/PendingSettlementsSection';
import { TopAppBar } from '@/components/TopAppBar';
import { balanceTone } from '@/lib/balanceDisplay';
import { settlementAmountForDebt } from '@/lib/balances';
import { formatMoney } from '@/lib/currency';
import { fetchGroupById } from '@/lib/groups';
import { platformShadow } from '@/lib/platformShadow';
import {
  enrichDebts,
  recordManualSettlement,
  simplifyDebts,
} from '@/lib/settlements';
import { useAuthStore } from '@/stores/authStore';
import { useExpensesStore } from '@/stores/expensesStore';
import { usePendingActionsStore } from '@/stores/pendingActionsStore';
import type { SimplifiedDebt } from '@/types/settlement';

export default function SettleUpScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const balances = useExpensesStore((s) => s.balances);
  const pendingSettlements = useExpensesStore((s) => s.pendingSettlements);
  const loadForGroup = useExpensesStore((s) => s.loadForGroup);
  const refreshPendingActions = usePendingActionsStore((s) => s.refresh);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [confirmDebt, setConfirmDebt] = useState<SimplifiedDebt | null>(null);

  useEffect(() => {
    if (!groupId) return;
    fetchGroupById(groupId).then((g) => setCurrencyCode(g?.currency ?? 'USD'));
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      if (!groupId) return;
      void loadForGroup(groupId);
      void refreshPendingActions();
    }, [groupId, loadForGroup, refreshPendingActions]),
  );

  const enrichedPending = useEnrichedPendingSettlements(
    pendingSettlements,
    balances
  );

  const myDebts = useMemo(() => {
    const all = enrichDebts(simplifyDebts(balances), balances);
    return all.filter((d) => d.from_user_id === user?.id);
  }, [balances, user?.id]);

  const allDebts = useMemo(
    () => enrichDebts(simplifyDebts(balances), balances),
    [balances]
  );

  async function handleRecordManual() {
    if (!groupId || !confirmDebt || !user?.id) return;

    const payerBalance =
      balances.find((b) => b.user_id === user.id)?.net_balance ?? 0;
    const amount = settlementAmountForDebt(
      confirmDebt.amount,
      payerBalance
    );

    const key = `${confirmDebt.to_user_id}-${amount}`;
    setRecordingKey(key);

    try {
      await recordManualSettlement({
        groupId,
        payeeId: confirmDebt.to_user_id,
        amount,
      });
      await loadForGroup(groupId);
      await refreshPendingActions();
      setConfirmDebt(null);
      Alert.alert(
        'Payment sent for confirmation',
        `${confirmDebt.to_name} will need to confirm they received ${formatMoney(amount, currencyCode)} before balances update.`
      );
    } catch (e) {
      Alert.alert(
        'Could not record payment',
        e instanceof Error ? e.message : 'Something went wrong'
      );
    } finally {
      setRecordingKey(null);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <TopAppBar title="Settle up" showBack />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
          maxWidth: 900,
          width: '100%',
          alignSelf: 'center',
          gap: 16,
        }}
      >
        <Text className="font-sans text-body-md text-on-surface-variant">
          Simplified debts — pay the fewest people to settle up. Record a cash
          payment after paying someone; they must confirm before balances change.
        </Text>

        {enrichedPending.length > 0 ? (
          <PendingSettlementsSection
            settlements={enrichedPending}
            currentUserId={user?.id}
            currencyCode={currencyCode}
            compact
            onUpdated={async () => {
              if (groupId) {
                await loadForGroup(groupId);
                await refreshPendingActions();
              }
            }}
          />
        ) : null}

        {myDebts.length === 0 ? (
          <View className="items-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-lg py-lg">
            <View className="mb-sm h-14 w-14 items-center justify-center rounded-full bg-surface-container">
              <MaterialIcons name="check-circle" size={28} color={uiColors.iconOnLight} />
            </View>
            <Text className="text-center font-sans-semibold text-body-lg text-on-surface">
              All settled up
            </Text>
            <Text className="mt-xs text-center font-sans text-body-md text-on-surface-variant">
              You do not owe anyone in this group.
            </Text>
          </View>
        ) : (
          myDebts.map((debt) => {
            const debtKey = `${debt.to_user_id}-${debt.amount}`;
            const isRecording = recordingKey === debtKey;
            const tone = balanceTone(-debt.amount);

            return (
              <View
                key={debtKey}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md"
                style={platformShadow('card')}
              >
                <Text className="font-sans-semibold text-headline-sm text-on-surface">
                  Pay {debt.to_name}
                </Text>
                <Text className={`mt-xs font-sans-bold text-headline-md ${tone.amountText}`}>
                  {formatMoney(debt.amount, currencyCode)}
                </Text>
                <ConvertedAmountLabel
                  amount={-debt.amount}
                  fromCurrency={currencyCode}
                  className={`font-sans text-label-md ${tone.convertedHintText}`}
                />

                <Pressable
                  onPress={() => setConfirmDebt(debt)}
                  disabled={recordingKey !== null}
                  className="mt-md flex-row items-center justify-center gap-xs rounded-xl bg-primary py-md active:opacity-90 disabled:opacity-50"
                >
                  {isRecording ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <MaterialIcons name="payments" size={20} color="#ffffff" />
                      <Text className="font-sans-semibold text-body-md text-on-primary">
                        Record payment
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            );
          })
        )}

        {allDebts.length > 0 ? (
          <View
            className="rounded-xl border border-outline-variant bg-surface-container-low p-md"
            style={platformShadow('card')}
          >
            <Text className="font-sans-semibold text-body-lg text-on-surface">
              All group debts
            </Text>
            {allDebts.map((debt, index) => (
              <View
                key={`${debt.from_user_id}-${debt.to_user_id}-${index}`}
                className="mt-sm"
              >
                <Text className="font-sans text-body-md text-on-surface-variant">
                  {debt.from_name} → {debt.to_name}:{' '}
                  {formatMoney(debt.amount, currencyCode)}
                </Text>
                <ConvertedAmountLabel
                  amount={debt.amount}
                  fromCurrency={currencyCode}
                  className="font-sans text-label-md text-on-surface-variant"
                />
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={confirmDebt != null}
        title="Record payment?"
        message={
          confirmDebt
            ? `Record that you paid ${formatMoney(confirmDebt.amount, currencyCode)} to ${confirmDebt.to_name} in cash? ${confirmDebt.to_name} will need to confirm before balances update.`
            : ''
        }
        confirmLabel="Record"
        isLoading={recordingKey != null}
        onCancel={() => {
          if (recordingKey == null) {
            setConfirmDebt(null);
          }
        }}
        onConfirm={handleRecordManual}
      />
    </View>
  );
}
