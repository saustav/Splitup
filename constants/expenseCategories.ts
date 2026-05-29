import type { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food', icon: 'restaurant' },
  { id: 'transport', label: 'Transport', icon: 'directions-car' },
  { id: 'housing', label: 'Housing', icon: 'home' },
  { id: 'entertainment', label: 'Entertainment', icon: 'movie' },
  { id: 'groceries', label: 'Groceries', icon: 'shopping-cart' },
  { id: 'health', label: 'Health', icon: 'local-hospital' },
  { id: 'other', label: 'Other', icon: 'category' },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
}>;

export type ExpenseCategoryId = (typeof EXPENSE_CATEGORIES)[number]['id'];

export const DEFAULT_EXPENSE_CATEGORY: ExpenseCategoryId = 'other';

const VALID_IDS = new Set<string>(EXPENSE_CATEGORIES.map((c) => c.id));

export function normalizeExpenseCategory(
  value: string | null | undefined
): ExpenseCategoryId {
  const id = value?.toLowerCase().trim();
  if (id && VALID_IDS.has(id)) {
    return id as ExpenseCategoryId;
  }
  return DEFAULT_EXPENSE_CATEGORY;
}

export function expenseCategoryMeta(id: ExpenseCategoryId) {
  return (
    EXPENSE_CATEGORIES.find((c) => c.id === id) ??
    EXPENSE_CATEGORIES.find((c) => c.id === DEFAULT_EXPENSE_CATEGORY)!
  );
}
