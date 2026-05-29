import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { ConvertedAmountLabel } from '@/components/ConvertedAmountLabel';
import { ExpenseCategoryChip } from '@/components/ExpenseCategoryChip';
import { formatMoney } from '@/lib/currency';
import { platformShadow } from '@/lib/platformShadow';
import { canEditExpense, expenseAddedByLabel } from '@/lib/expenseForm';
import type { Expense } from '@/types/expense';

export function ExpenseCard({
  expense,
  currentUserId,
}: {
  expense: Expense;
  currentUserId?: string;
}) {
  const router = useRouter();
  const addedBy = expenseAddedByLabel(expense, currentUserId);
  const youPaid = expense.paid_by === currentUserId;
  const splits = expense.splits ?? [];
  const splitSum = splits.reduce((s, x) => s + Number(x.amount_owed), 0);
  const isEqual =
    splits.length > 0 &&
    splits.every(
      (s) => Math.abs(Number(s.amount_owed) - splitSum / splits.length) < 0.02
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
            <MaterialIcons name="edit" size={18} color="#006c49" />
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
      {splits.length > 0 && (
        <Text className="mt-xs font-sans text-label-md text-on-surface-variant">
          {isEqual
            ? `Split equally · ${formatMoney(splitSum / splits.length, expense.currency)} each (${splits.length} people)`
            : `Custom split · ${splits.length} participant${splits.length === 1 ? '' : 's'}`}
        </Text>
      )}
      <Text className="mt-xs font-sans text-label-md text-on-surface-variant">
        {new Date(expense.expense_date).toLocaleDateString('en-NP', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </Text>
      {editable ? (
        <Text className="mt-sm font-sans-semibold text-label-md text-primary">
          Tap to edit
        </Text>
      ) : null}
    </Pressable>
  );
}
