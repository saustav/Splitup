import { Text, View } from 'react-native';

import {
  buildSplitParticipants,
  formatSplitWithLabel,
  getIncludedSplits,
} from '@/lib/expenseSplits';
import { formatMoney } from '@/lib/currency';
import type { ExpenseSplit } from '@/types/expense';

const MAX_AVATARS = 5;

const AVATAR_COLORS = [
  'bg-tertiary-fixed',
  'bg-secondary-container',
  'bg-primary-container',
  'bg-surface-container-high',
] as const;

const TEXT_COLORS = [
  'text-on-tertiary-fixed',
  'text-on-secondary-container',
  'text-on-primary-container',
  'text-on-surface',
] as const;

function InitialsAvatar({
  initials,
  firstName,
  isYou,
  colorIndex,
}: {
  initials: string;
  firstName: string;
  isYou: boolean;
  colorIndex: number;
}) {
  const bg = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];
  const text = TEXT_COLORS[colorIndex % TEXT_COLORS.length];

  return (
    <View className="items-center">
      <View
        className={`h-8 w-8 items-center justify-center rounded-full border-2 ${
          isYou
            ? 'border-primary bg-primary-container'
            : `border-surface-container-lowest ${bg}`
        }`}
        accessibilityLabel={isYou ? `You, ${initials}` : `${firstName}, ${initials}`}
      >
        <Text
          className={`font-sans-semibold text-[10px] ${
            isYou ? 'text-on-primary-container' : text
          }`}
        >
          {initials}
        </Text>
      </View>
      <Text
        className="mt-0.5 max-w-[44px] text-center font-sans text-[9px] text-on-surface-variant"
        numberOfLines={1}
      >
        {isYou ? 'You' : firstName}
      </Text>
    </View>
  );
}

export function ExpenseSplitParticipants({
  splits,
  currency,
  currentUserId,
  memberNameById,
  isEqualSplit,
}: {
  splits: ExpenseSplit[] | undefined;
  currency: string;
  currentUserId?: string;
  memberNameById?: Record<string, string>;
  isEqualSplit: boolean;
}) {
  const included = getIncludedSplits(splits);
  const participants = buildSplitParticipants(
    splits,
    currentUserId,
    memberNameById
  );

  if (participants.length === 0) {
    return null;
  }

  const visible = participants.slice(0, MAX_AVATARS);
  const overflow = participants.length - visible.length;

  const equalShare =
    isEqualSplit && included.length > 0
      ? formatMoney(
          included.reduce((s, x) => s + Number(x.amount_owed), 0) /
            included.length,
          currency
        )
      : null;

  return (
    <View className="mt-sm gap-xs">
      <Text className="font-sans-semibold text-label-md text-on-surface-variant">
        Split with
      </Text>
      <View className="flex-row items-end">
        {visible.map((p, index) => (
          <View
            key={p.userId}
            style={{
              marginLeft: index > 0 ? -6 : 0,
              zIndex: visible.length - index,
            }}
          >
            <InitialsAvatar
              initials={p.initials}
              firstName={p.firstName}
              isYou={p.isYou}
              colorIndex={index}
            />
          </View>
        ))}
        {overflow > 0 ? (
          <View
            className="mb-3 h-8 w-8 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-surface-container-high"
            style={{ marginLeft: -6, zIndex: 0 }}
          >
            <Text className="font-sans-semibold text-[10px] text-on-surface-variant">
              +{overflow}
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="font-sans text-label-md text-on-surface-variant">
        {formatSplitWithLabel(participants)}
        {isEqualSplit && equalShare
          ? ` · ${equalShare} each`
          : !isEqualSplit
            ? ` · custom amounts`
            : ''}
      </Text>
    </View>
  );
}
