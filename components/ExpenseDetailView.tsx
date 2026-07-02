import { Text, View } from 'react-native';

import { ConvertedAmountLabel } from '@/components/ConvertedAmountLabel';
import { ExpenseCategoryChip } from '@/components/ExpenseCategoryChip';
import { ExpenseSplitParticipants } from '@/components/ExpenseSplitParticipants';
import { formatMoney } from '@/lib/currency';
import { formatExpenseDate } from '@/lib/dates';
import {
  buildSplitParticipants,
  getIncludedSplits,
} from '@/lib/expenseSplits';
import { expenseAddedByLabel } from '@/lib/expenseForm';
import { initialsFromLabel } from '@/lib/groupDisplay';
import type { Expense } from '@/types/expense';

function SplitAmountRow({
  name,
  amount,
  currency,
  isYou,
}: {
  name: string;
  amount: number;
  currency: string;
  isYou: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between py-sm">
      <View className="min-w-0 flex-1 flex-row items-center gap-sm">
        <View
          className={`h-9 w-9 items-center justify-center rounded-full ${
            isYou ? 'bg-primary-container' : 'bg-surface-container-high'
          }`}
        >
          <Text
            className={`font-sans-semibold text-label-md ${
              isYou ? 'text-on-primary-container' : 'text-on-surface'
            }`}
          >
            {initialsFromLabel(name)}
          </Text>
        </View>
        <Text
          className={`flex-1 font-sans text-body-md ${
            isYou ? 'font-sans-semibold text-primary' : 'text-on-surface'
          }`}
          numberOfLines={1}
        >
          {isYou ? 'You' : name}
        </Text>
      </View>
      <Text className="font-sans-medium text-body-md text-on-surface">
        {formatMoney(amount, currency)}
      </Text>
    </View>
  );
}

export function ExpenseDetailView({
  expense,
  currentUserId,
  memberNameById,
  groupName,
}: {
  expense: Expense;
  currentUserId?: string;
  memberNameById?: Record<string, string>;
  groupName?: string;
}) {
  const splits = expense.splits ?? [];
  const included = getIncludedSplits(splits);
  const participants = buildSplitParticipants(
    splits,
    currentUserId,
    memberNameById
  );
  const splitSum = included.reduce((s, x) => s + Number(x.amount_owed), 0);
  const isEqual =
    included.length > 0 &&
    included.every(
      (s) => Math.abs(Number(s.amount_owed) - splitSum / included.length) < 0.02
    );
  const addedBy = expenseAddedByLabel(expense, currentUserId);
  const youPaid = expense.paid_by === currentUserId;

  return (
    <View className="gap-section-gap">
      <View className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-md">
        <ExpenseCategoryChip categoryId={expense.category} />

        <Text className="mt-md font-sans-bold text-headline-md text-on-surface">
          {expense.description}
        </Text>

        {groupName ? (
          <Text className="mt-xs font-sans text-body-md text-on-surface-variant">
            {groupName}
          </Text>
        ) : null}

        <View className="mt-md">
          <Text className="font-sans-bold text-display-lg-mobile text-primary">
            {formatMoney(Number(expense.amount), expense.currency)}
          </Text>
          <ConvertedAmountLabel
            amount={Number(expense.amount)}
            fromCurrency={expense.currency}
            className="mt-xs font-sans text-label-md text-on-surface-variant"
          />
        </View>

        <View className="mt-md gap-xs">
          <Text
            className={`font-sans text-body-md ${
              youPaid ? 'font-sans-semibold text-primary' : 'text-on-surface'
            }`}
          >
            {addedBy}
          </Text>
          <Text className="font-sans text-body-md text-on-surface-variant">
            {formatExpenseDate(expense.expense_date)}
          </Text>
        </View>
      </View>

      {participants.length > 0 ? (
        <View className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-md">
          <Text className="mb-md font-sans-semibold text-headline-sm text-on-surface">
            Split with
          </Text>

          <ExpenseSplitParticipants
            splits={splits}
            currency={expense.currency}
            currentUserId={currentUserId}
            memberNameById={memberNameById}
            isEqualSplit={isEqual}
          />

          <View className="mt-md border-t border-outline-variant/30 pt-xs">
            {participants.map((participant) => (
              <SplitAmountRow
                key={participant.userId}
                name={participant.rawName}
                amount={participant.amountOwed}
                currency={expense.currency}
                isYou={participant.isYou}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
