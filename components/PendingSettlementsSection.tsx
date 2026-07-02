import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { uiColors } from '@/constants/theme';
import { ConvertedAmountLabel } from '@/components/ConvertedAmountLabel';
import { formatMoney } from '@/lib/currency';
import { platformShadow } from '@/lib/platformShadow';
import { acceptSettlement, enrichSettlements } from '@/lib/settlements';
import type { MemberBalance } from '@/types/expense';
import type { EnrichedSettlement } from '@/types/settlement';

type PendingSettlementsProps = {
  settlements: EnrichedSettlement[];
  currentUserId: string | undefined;
  currencyCode: string;
  compact?: boolean;
  onUpdated: () => void | Promise<void>;
};

export function PendingSettlementsSection({
  settlements,
  currentUserId,
  currencyCode,
  compact = false,
  onUpdated,
}: PendingSettlementsProps) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [confirmSettlement, setConfirmSettlement] =
    useState<EnrichedSettlement | null>(null);

  const incoming = useMemo(
    () => settlements.filter((s) => s.payee_id === currentUserId),
    [settlements, currentUserId]
  );
  const outgoing = useMemo(
    () => settlements.filter((s) => s.payer_id === currentUserId),
    [settlements, currentUserId]
  );

  if (incoming.length === 0 && outgoing.length === 0) {
    return null;
  }

  async function handleAccept() {
    if (!confirmSettlement) return;

    setAcceptingId(confirmSettlement.id);
    try {
      await acceptSettlement(confirmSettlement.id);
      setConfirmSettlement(null);
      await onUpdated();
      Alert.alert(
        'Payment confirmed',
        `You confirmed receiving ${formatMoney(confirmSettlement.amount, currencyCode)} from ${confirmSettlement.payer_name}.`
      );
    } catch (e) {
      Alert.alert(
        'Could not confirm',
        e instanceof Error ? e.message : 'Something went wrong'
      );
    } finally {
      setAcceptingId(null);
    }
  }

  return (
    <View className={compact ? 'gap-sm' : 'gap-md'}>
      {incoming.length > 0 ? (
        <View
          className="rounded-xl border border-amber-200 bg-amber-50 p-md dark:border-amber-900/40 dark:bg-amber-950/30"
          style={platformShadow('card')}
        >
          <View className="mb-sm flex-row items-center gap-xs">
            <MaterialIcons name="hourglass-top" size={18} color="#b45309" />
            <Text className="font-sans-semibold text-body-lg text-amber-900 dark:text-amber-200">
              Pending — confirm you received
            </Text>
          </View>
          {incoming.map((settlement) => {
            const isAccepting = acceptingId === settlement.id;
            return (
              <View
                key={settlement.id}
                className="mt-sm rounded-lg bg-white/80 p-sm dark:bg-black/20"
              >
                <Text className="font-sans text-body-md text-on-surface">
                  <Text className="font-sans-semibold">
                    {settlement.payer_name}
                  </Text>
                  {' says they paid you '}
                  <Text className="font-sans-semibold text-primary">
                    {formatMoney(settlement.amount, currencyCode)}
                  </Text>
                </Text>
                <ConvertedAmountLabel
                  amount={settlement.amount}
                  fromCurrency={currencyCode}
                  className="mt-xs font-sans text-label-md text-on-surface-variant"
                />
                <Pressable
                  onPress={() => setConfirmSettlement(settlement)}
                  disabled={acceptingId !== null}
                  className="mt-sm flex-row items-center justify-center gap-xs rounded-xl bg-primary py-sm active:opacity-90 disabled:opacity-50"
                >
                  {isAccepting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <MaterialIcons
                        name="check-circle"
                        size={18}
                        color="#ffffff"
                      />
                      <Text className="font-sans-semibold text-body-md text-on-primary">
                        Confirm received
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      {outgoing.length > 0 ? (
        <View
          className="rounded-xl border border-outline-variant bg-surface-container-low p-md"
          style={platformShadow('card')}
        >
          <View className="mb-sm flex-row items-center gap-xs">
            <MaterialIcons name="schedule" size={18} color={uiColors.muted} />
            <Text className="font-sans-semibold text-body-lg text-on-surface">
              Waiting for confirmation
            </Text>
          </View>
          {outgoing.map((settlement) => (
            <View key={settlement.id} className="mt-sm">
              <Text className="font-sans text-body-md text-on-surface-variant">
                {formatMoney(settlement.amount, currencyCode)} to{' '}
                <Text className="font-sans-semibold text-on-surface">
                  {settlement.payee_name}
                </Text>
                {' — pending their confirmation'}
              </Text>
              <ConvertedAmountLabel
                amount={settlement.amount}
                fromCurrency={currencyCode}
                className="mt-xs font-sans text-label-md text-on-surface-variant"
              />
            </View>
          ))}
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirmSettlement != null}
        title="Confirm payment received?"
        message={
          confirmSettlement
            ? `Did ${confirmSettlement.payer_name} pay you ${formatMoney(confirmSettlement.amount, currencyCode)} in cash? Balances will update once you confirm.`
            : ''
        }
        confirmLabel="Yes, I received it"
        isLoading={acceptingId != null}
        onCancel={() => {
          if (acceptingId == null) {
            setConfirmSettlement(null);
          }
        }}
        onConfirm={handleAccept}
      />
    </View>
  );
}

export function useEnrichedPendingSettlements(
  pendingSettlements: Parameters<typeof enrichSettlements>[0],
  balances: MemberBalance[]
) {
  return useMemo(
    () => enrichSettlements(pendingSettlements, balances),
    [pendingSettlements, balances]
  );
}
