import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

import { ConvertedAmountLabel } from '@/components/ConvertedAmountLabel';
import { getCurrencyByCode } from '@/constants/currencies';
import {
  balanceTone,
  groupCardStatusLabel,
  isEffectivelyZero,
} from '@/lib/balanceDisplay';
import { formatMoneyCompact } from '@/lib/currency';
import { groupIconForName } from '@/lib/groupDisplay';
import { platformShadow } from '@/lib/platformShadow';
import type { Group } from '@/types/group';

type GroupCardProps = {
  group: Group;
  netBalance?: number;
  /** Incoming manual payments waiting for this user's confirmation. */
  pendingActionCount?: number;
  onPress: () => void;
};

export function GroupCard({
  group,
  netBalance,
  pendingActionCount = 0,
  onPress,
}: GroupCardProps) {
  const tone =
    netBalance !== undefined ? balanceTone(netBalance) : null;
  const statusLabel =
    netBalance !== undefined ? groupCardStatusLabel(netBalance) : '';
  const showConverted =
    netBalance !== undefined && tone && !isEffectivelyZero(netBalance);

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-xl border border-white/20 bg-surface-container-lowest p-md shadow-sm active:scale-[0.98]"
      style={platformShadow('card')}
    >
      <View className="flex-row items-center gap-md">
        <View className="relative">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-surface-container">
            <MaterialIcons
              name={groupIconForName(group.name)}
              size={24}
              color={tone?.groupIconColor ?? '#1D9E75'}
            />
          </View>
          {pendingActionCount > 0 ? (
            <View className="absolute -right-0.5 -top-0.5 min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface-container-lowest bg-error px-0.5">
              <MaterialIcons name="notifications" size={10} color="#ffffff" />
            </View>
          ) : null}
        </View>
        <View>
          <Text className="font-sans-semibold text-body-lg text-on-surface">
            {group.name}
          </Text>
          <Text className="font-sans text-body-md text-on-surface-variant">
            {group.member_count} member{group.member_count === 1 ? '' : 's'}
            {' · '}
            {getCurrencyByCode(group.currency)?.flag ?? ''} {group.currency}
          </Text>
          {pendingActionCount > 0 ? (
            <Text className="mt-0.5 font-sans-semibold text-label-md text-error">
              {pendingActionCount === 1
                ? 'Confirm payment'
                : `${pendingActionCount} payments to confirm`}
            </Text>
          ) : null}
        </View>
      </View>

      {netBalance !== undefined && tone ? (
        <View className="items-end">
          <View className="mb-xs flex-row items-center gap-0.5">
            <MaterialIcons
              name={tone.statusIcon}
              size={16}
              color={tone.groupListStatusIconColor}
            />
            <Text
              className={`font-sans-semibold text-label-md ${tone.listStatusText}`}
            >
              {statusLabel}
            </Text>
          </View>
          {!tone.settled ? (
            <Text
              className={`font-sans-medium text-numeric-data ${tone.listAmountText}`}
            >
              {formatMoneyCompact(netBalance, group.currency)}
            </Text>
          ) : null}
          {showConverted ? (
            <ConvertedAmountLabel
              amount={netBalance}
              fromCurrency={group.currency}
              className={`font-sans text-label-md ${tone.convertedHintText}`}
            />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
