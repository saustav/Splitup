import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import {
  expenseCategoryMeta,
  normalizeExpenseCategory,
} from '@/constants/expenseCategories';
import { uiColors } from '@/constants/theme';
import { formatMoney } from '@/lib/currency';
import { formatExpenseDateCompact } from '@/lib/dates';
import {
  buildSplitParticipants,
  formatSplitWithLabel,
  getIncludedSplits,
} from '@/lib/expenseSplits';
import { expenseAddedByLabel } from '@/lib/expenseForm';
import type { Expense } from '@/types/expense';

export function ExpenseCard({
  expense,
  currentUserId,
  memberNameById,
}: {
  expense: Expense;
  currentUserId?: string;
  memberNameById?: Record<string, string>;
}) {
  const router = useRouter();
  const category = expenseCategoryMeta(normalizeExpenseCategory(expense.category));
  const addedBy = expenseAddedByLabel(expense, currentUserId);
  const youPaid = expense.paid_by === currentUserId;
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
  const metaParts = [
    addedBy,
    formatExpenseDateCompact(expense.expense_date),
  ];

  if (participants.length > 0) {
    const splitLabel = formatSplitWithLabel(participants, 2);
    if (isEqual && included.length > 0) {
      const each = formatMoney(splitSum / included.length, expense.currency);
      metaParts.push(`${splitLabel} · ${each} ea`);
    } else {
      metaParts.push(splitLabel);
    }
  }

  function openDetail() {
    router.push(
      `/expense/${expense.id}?groupId=${expense.group_id}`
    );
  }

  return (
    <Pressable
      onPress={openDetail}
      accessibilityLabel={`View expense ${expense.description}`}
      className="mb-xs flex-row items-center gap-sm rounded-card border border-outline-variant/40 bg-surface-container-low px-sm py-sm active:opacity-90"
    >
      <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high">
        <MaterialIcons name={category.icon} size={18} color={uiColors.iconOnLight} />
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-start justify-between gap-sm">
          <Text
            className="flex-1 font-sans-semibold text-body-md text-on-surface"
            numberOfLines={1}
          >
            {expense.description}
          </Text>
          <Text className="shrink-0 font-sans-semibold text-body-md text-primary">
            {formatMoney(Number(expense.amount), expense.currency)}
          </Text>
        </View>

        <Text
          className={`mt-xs font-sans text-label-md ${
            youPaid ? 'text-primary' : 'text-on-surface-variant'
          }`}
          numberOfLines={1}
        >
          {metaParts.join(' · ')}
        </Text>
      </View>

      <MaterialIcons name="chevron-right" size={20} color={uiColors.muted} />
    </Pressable>
  );
}
