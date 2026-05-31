import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { ConvertedAmountLabel } from '@/components/ConvertedAmountLabel';
import { ExpenseCategoryChip } from '@/components/ExpenseCategoryChip';
import { ExpenseSplitParticipants } from '@/components/ExpenseSplitParticipants';
import { formatMoney } from '@/lib/currency';
import { formatExpenseDate } from '@/lib/dates';
import { platformShadow } from '@/lib/platformShadow';
import { getIncludedSplits } from '@/lib/expenseSplits';
import { canEditExpense, expenseAddedByLabel } from '@/lib/expenseForm';
import type { Expense } from '@/types/expense';

export function ExpenseCard({
  expense,
  currentUserId,
  memberNameById,
}: {
  expense: Expense;
  currentUserId?: string;
  /** Fallback names when split profiles are missing. */
  memberNameById?: Record<string, string>;
}) {
  const router = useRouter();
  const addedBy = expenseAddedByLabel(expense, currentUserId);
  const youPaid = expense.paid_by === currentUserId;
  const splits = expense.splits ?? [];
  const included = getIncludedSplits(splits);
  const splitSum = included.reduce((s, x) => s + Number(x.amount_owed), 0);
  const isEqual =
    included.length > 0 &&
    included.every(
      (s) => Math.abs(Number(s.amount_owed) - splitSum / included.length) < 0.02
    );
  const editable = canEditExpense(expense, currentUserId);

  return (
    <Pressable
      onPress={
        editable
          ? () =>
              router.push(
                `/expense/edit?expenseId=${expense.id}&groupId=${expense.group_id}`
              )
          : undefined
      }
      disabled={!editable}
      className="mb-stack-gap rounded-xl border border-surface-variant bg-surface-container-lowest p-md active:opacity-90"
      style={platformShadow('card')}
    >
      <View className="mb-xs">
        <ExpenseCategoryChip categoryId={expense.category} />
      </View>
      <View className="flex-row items-start justify-between">
        <Text className="flex-1 font-sans-semibold text-body-lg text-on-surface">
          {expense.description}
        </Text>
        <View className="flex-row items-center gap-sm">
          <View className="items-end">
            <Text className="font-sans-medium text-numeric-data text-primary">
              {formatMoney(Number(expense.amount), expense.currency)}
            </Text>
            <ConvertedAmountLabel
              amount={Number(expense.amount)}
              fromCurrency={expense.currency}
            />
          </View>
          {editable ? (
            <MaterialIcons name="edit" size={18} color="#1D9E75" />
          ) : null}
        </View>
      </View>
      <Text
        className={`mt-xs font-sans text-body-md ${
          youPaid ? 'font-sans-semibold text-primary' : 'text-on-surface-variant'
        }`}
      >
        {addedBy}
      </Text>
      {included.length > 0 ? (
        <ExpenseSplitParticipants
          splits={splits}
          currency={expense.currency}
          currentUserId={currentUserId}
          memberNameById={memberNameById}
          isEqualSplit={isEqual}
        />
      ) : null}
      <View className="mt-xs flex-row items-center gap-xs">
        <MaterialIcons name="calendar-today" size={14} color="#6c7a71" />
        <Text className="font-sans text-label-md text-on-surface-variant">
          {formatExpenseDate(expense.expense_date)}
        </Text>
      </View>
      {editable ? (
        <Text className="mt-sm font-sans-semibold text-label-md text-primary">
          Tap to edit
        </Text>
      ) : null}
    </Pressable>
  );
}
