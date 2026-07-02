import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';

import {
  expenseCategoryMeta,
  normalizeExpenseCategory,
  type ExpenseCategoryId,
} from '@/constants/expenseCategories';
import { uiColors } from '@/constants/theme';

export function ExpenseCategoryChip({
  categoryId,
}: {
  categoryId: ExpenseCategoryId | string | null | undefined;
}) {
  const id = normalizeExpenseCategory(categoryId);
  const meta = expenseCategoryMeta(id);

  return (
    <View className="flex-row items-center gap-xs self-start rounded-full bg-surface-container-high px-sm py-xs">
      <MaterialIcons name={meta.icon} size={14} color={uiColors.iconOnLight} />
      <Text className="font-sans-semibold text-label-md text-on-surface-variant">
        {meta.label}
      </Text>
    </View>
  );
}
