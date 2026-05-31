import { colors } from '@/constants/theme';
import {
  BALANCE_ZERO_THRESHOLD,
  isEffectivelyZero,
} from '@/lib/balances';

export type BalanceSign = 'owed' | 'owes' | 'settled';

export type BalanceStatusIcon =
  | 'arrow-upward'
  | 'arrow-downward'
  | 'check-circle';

export function balanceSign(amount: number): BalanceSign {
  if (amount > BALANCE_ZERO_THRESHOLD) return 'owed';
  if (amount < -BALANCE_ZERO_THRESHOLD) return 'owes';
  return 'settled';
}

export { BALANCE_ZERO_THRESHOLD, isEffectivelyZero };

/**
 * Semantic balance styling from design tokens (error = you owe, primary = owed/settled).
 * Use wherever a net balance amount or hero card is shown.
 */
export function balanceTone(amount: number) {
  const sign = balanceSign(amount);
  const owes = sign === 'owes';
  const owed = sign === 'owed';

  return {
    sign,
    owes,
    owed,
    settled: sign === 'settled',
    cardBg: owes ? 'bg-error-container' : 'bg-primary-container',
    decorBg: owes ? 'bg-error' : 'bg-primary',
    onContainer: owes ? 'text-on-error-container' : 'text-on-primary-container',
    onContainerMuted: owes
      ? 'text-on-error-container/80'
      : 'text-on-primary-container/80',
    onContainerSubtle: owes
      ? 'text-on-error-container/70'
      : 'text-on-primary-container/70',
    onContainerFaint: owes
      ? 'text-on-error-container/75'
      : 'text-on-primary-container/75',
    amountText: owes ? 'text-error' : 'text-on-primary-container',
    chipBg: owes ? 'bg-error/15' : 'bg-secondary-container',
    chipText: owes ? 'text-error' : 'text-on-secondary-container',
    listAmountText: owes
      ? 'text-error'
      : owed
        ? 'text-primary'
        : 'text-on-surface-variant',
    listStatusText: owes
      ? 'text-error'
      : owed
        ? 'text-primary'
        : 'text-primary',
    listChipBg: owes
      ? 'bg-error-container'
      : owed
        ? 'bg-primary/10'
        : 'bg-primary/10',
    listChipText: owes
      ? 'text-error'
      : owed
        ? 'text-primary'
        : 'text-primary',
    convertedHintText: owes
      ? 'text-error/80'
      : owed
        ? 'text-primary/80'
        : 'text-on-surface-variant',
    groupListStatusIconColor: owes ? colors.red.default : colors.brand.primary,
    iconColor: owes ? colors.red.default : colors.brand.dark,
    avatarIconColor: owes ? colors.red.default : colors.brand.deeper,
    groupIconColor: owes ? colors.red.default : colors.brand.primary,
    spinnerColor: owes ? colors.red.default : colors.brand.deeper,
    statusIcon: (owed
      ? 'arrow-upward'
      : owes
        ? 'arrow-downward'
        : 'check-circle') as BalanceStatusIcon,
  };
}

export function yourBalanceStatusLabel(amount: number): string {
  const sign = balanceSign(amount);
  if (sign === 'owed') return 'You are owed';
  if (sign === 'owes') return 'You owe';
  return 'All settled';
}

export function totalBalanceStatusLabel(amount: number): string {
  const sign = balanceSign(amount);
  if (sign === 'owed') return 'You are owed in total';
  if (sign === 'owes') return 'You owe in total';
  return 'All settled up';
}

export function groupCardStatusLabel(amount: number): string {
  const sign = balanceSign(amount);
  if (sign === 'owed') return 'You are owed';
  if (sign === 'owes') return 'You owe';
  return 'Settled';
}
