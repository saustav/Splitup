import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

import {
  EXPENSE_CATEGORIES,
  type ExpenseCategoryId,
} from '@/constants/expenseCategories';

export function ExpenseCategoryPicker({
  value,
  onChange,
  disabled,
}: {
  value: ExpenseCategoryId;
  onChange: (id: ExpenseCategoryId) => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row flex-wrap gap-sm">
      {EXPENSE_CATEGORIES.map((cat) => {
        const selected = value === cat.id;
        return (
          <Pressable
            key={cat.id}
            onPress={() => !disabled && onChange(cat.id)}
            disabled={disabled}
            className={`flex-row items-center gap-xs rounded-full border px-sm py-xs ${
              selected
                ? 'border-primary bg-secondary-container'
                : 'border-outline-variant bg-background'
            }`}
          >
            <MaterialIcons
              name={cat.icon}
              size={16}
              color={selected ? '#006c49' : '#6c7a71'}
            />
            <Text
              className={`font-sans-semibold text-label-md ${
                selected ? 'text-on-surface' : 'text-on-surface-variant'
              }`}
            >
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
