import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DEFAULT_CURRENCY_CODE } from '@/constants/currencies';
import {
  DEFAULT_EXPENSE_CATEGORY,
  type ExpenseCategoryId,
} from '@/constants/expenseCategories';
import { ExpenseCategoryPicker } from '@/components/ExpenseCategoryPicker';
import { currencyInputLabel, formatMoney, parseAmount } from '@/lib/currency';
import { platformShadow } from '@/lib/platformShadow';
import { expenseToFormState, type SplitMode } from '@/lib/expenseForm';
import { memberDisplayName } from '@/lib/members';
import type { ExpenseSplitInput } from '@/lib/expenses';
import type { Expense } from '@/types/expense';
import type { Group, GroupMember } from '@/types/group';

export type AddExpenseSubmitParams = {
  description: string;
  amount: number;
  paidById: string;
  category: ExpenseCategoryId;
  splits?: ExpenseSplitInput[];
};

function equalShare(amount: number, count: number): number {
  if (count <= 0) return 0;
  return Math.round((amount / count) * 100) / 100;
}

function memberInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

const AVATAR_STYLES = [
  'bg-tertiary-container',
  'bg-secondary-container',
  'bg-surface-container-high',
] as const;

export function AddExpenseForm({
  mode = 'create',
  groups,
  groupId,
  onGroupChange,
  members,
  currentUserId,
  initialExpense,
  onSubmit,
  onCancel,
  onDelete,
  isSubmitting,
  error,
  currencyCode: currencyCodeProp,
}: {
  mode?: 'create' | 'edit';
  groups: Group[];
  groupId: string;
  currencyCode?: string;
  onGroupChange: (id: string) => void;
  members: GroupMember[];
  currentUserId: string | undefined;
  initialExpense?: Expense;
  onSubmit: (params: AddExpenseSubmitParams) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isSubmitting: boolean;
  error?: string | null;
}) {
  const isEdit = mode === 'edit';
  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [paidById, setPaidById] = useState('');
  const [category, setCategory] = useState<ExpenseCategoryId>(DEFAULT_EXPENSE_CATEGORY);
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [includedIds, setIncludedIds] = useState<Set<string>>(new Set());
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [payerPickerOpen, setPayerPickerOpen] = useState(false);
  const editSeededForId = useRef<string | null>(null);

  const selectedGroup = groups.find((g) => g.id === groupId);
  const currencyCode =
    currencyCodeProp ??
    selectedGroup?.currency ??
    initialExpense?.currency ??
    DEFAULT_CURRENCY_CODE;

  useEffect(() => {
    if (!members.length) return;

    if (isEdit && initialExpense) {
      if (editSeededForId.current !== initialExpense.id) {
        editSeededForId.current = initialExpense.id;
        const seeded = expenseToFormState(
          initialExpense,
          members.map((m) => m.user_id)
        );
        setDescription(seeded.description);
        setAmountText(seeded.amountText);
        setPaidById(seeded.paidById);
        setCategory(seeded.category);
        setSplitMode(seeded.splitMode);
        setIncludedIds(seeded.includedIds);
        setCustomSplits(seeded.customSplits);
      }
      return;
    }

    editSeededForId.current = null;
    setPaidById(currentUserId ?? members[0]?.user_id ?? '');
    setCategory(DEFAULT_EXPENSE_CATEGORY);
    const ids = new Set(members.map((m) => m.user_id));
    setIncludedIds(ids);
    const initial: Record<string, string> = {};
    for (const m of members) {
      initial[m.user_id] = '';
    }
    setCustomSplits(initial);
  }, [members, currentUserId, isEdit, initialExpense]);

  const totalAmount = parseAmount(amountText) ?? 0;
  const includedMembers = members.filter((m) => includedIds.has(m.user_id));
  const includedCount = includedMembers.length;

  const equalAmounts = useMemo(() => {
    const share = equalShare(totalAmount, includedCount);
    const map: Record<string, number> = {};
    for (const m of includedMembers) {
      map[m.user_id] = share;
    }
    return map;
  }, [totalAmount, includedCount, includedMembers]);

  const customSplitTotal = useMemo(() => {
    return includedMembers.reduce((sum, m) => {
      const v = parseAmount(customSplits[m.user_id] ?? '');
      return sum + (v ?? 0);
    }, 0);
  }, [includedMembers, customSplits]);

  const splitValid =
    includedCount > 0 &&
    (splitMode === 'equal' ||
      (totalAmount > 0 && Math.abs(customSplitTotal - totalAmount) < 0.06));

  const youAreMember =
    Boolean(currentUserId) &&
    members.some((m) => m.user_id === currentUserId);

  function toggleMember(userId: string) {
    setIncludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        if (next.size > 1) next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  const paidByMember = members.find((m) => m.user_id === paidById);
  const paidByLabel = paidByMember
    ? memberDisplayName(paidByMember) +
      (paidById === currentUserId ? ' (You)' : '')
    : 'Select payer';

  function buildSplits(): ExpenseSplitInput[] | undefined {
    if (splitMode === 'equal') {
      if (includedCount === members.length) return undefined;
      return includedMembers.map((m) => ({
        user_id: m.user_id,
        amount_owed: equalAmounts[m.user_id] ?? 0,
      }));
    }
    return includedMembers
      .map((m) => ({
        user_id: m.user_id,
        amount_owed: parseAmount(customSplits[m.user_id] ?? '') ?? 0,
      }))
      .filter((s) => s.amount_owed > 0);
  }

  function handleSubmit() {
    const amount = parseAmount(amountText);
    if (
      !description.trim() ||
      !amount ||
      !groupId ||
      !currentUserId ||
      !youAreMember ||
      !paidById
    ) {
      return;
    }
    onSubmit({
      description: description.trim(),
      amount,
      paidById,
      category,
      splits: buildSplits(),
    });
  }

  const canSubmit =
    Boolean(groupId) &&
    Boolean(currentUserId) &&
    Boolean(paidById) &&
    youAreMember &&
    description.trim().length > 0 &&
    totalAmount > 0 &&
    splitValid;

  return (
    <View className="gap-lg">
      {error ? (
        <View className="rounded-lg bg-error-container p-3">
          <Text className="text-center font-sans text-body-md text-on-error-container">
            {error}
          </Text>
        </View>
      ) : null}

      {/* Primary entry card */}
      <View
        className="gap-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-lg"
        style={platformShadow('card')}
      >
        <View className="gap-xs">
          <Text className="font-sans-semibold text-label-md text-on-surface-variant">
            Total Amount
          </Text>
          <View className="relative justify-center">
            <Text className="absolute left-4 font-sans-bold text-display-lg-mobile text-on-surface-variant">
              {currencyInputLabel(currencyCode)}
            </Text>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              placeholder="0.00"
              placeholderTextColor="#6c7a71"
              keyboardType="decimal-pad"
              editable={!isSubmitting}
              className="min-h-[80px] rounded-lg border border-outline-variant bg-background py-md pl-20 pr-4 font-sans-bold text-display-lg-mobile text-on-surface"
            />
          </View>
        </View>

        <View className="gap-md">
          <View className="gap-xs">
            <Text className="font-sans-semibold text-label-md text-on-surface-variant">
              Description
            </Text>
            <View className="relative">
              <MaterialIcons
                name="description"
                size={20}
                color="#6c7a71"
                style={{ position: 'absolute', left: 12, top: 14, zIndex: 1 }}
              />
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Dinner at lakeside"
                placeholderTextColor="#6c7a71"
                editable={!isSubmitting}
                className="rounded-lg border border-outline-variant bg-background py-sm pl-10 pr-3 font-sans text-body-lg text-on-surface"
              />
            </View>
          </View>

          <View className="gap-xs">
            <Text className="font-sans-semibold text-label-md text-on-surface-variant">
              Category
            </Text>
            <ExpenseCategoryPicker
              value={category}
              onChange={setCategory}
              disabled={isSubmitting}
            />
          </View>

          <View className="gap-xs">
            <Text className="font-sans-semibold text-label-md text-on-surface-variant">
              Group / Friend
            </Text>
            <Pressable
              onPress={() => groups.length > 1 && !isEdit && setGroupPickerOpen(true)}
              disabled={isSubmitting || groups.length <= 1 || isEdit}
              className="flex-row items-center rounded-lg border border-outline-variant bg-background py-sm pl-10 pr-3"
            >
              <MaterialIcons
                name="group"
                size={20}
                color="#6c7a71"
                style={{ position: 'absolute', left: 12 }}
              />
              <Text
                className={`flex-1 font-sans text-body-lg ${
                  selectedGroup ? 'text-on-surface' : 'text-on-surface-variant'
                }`}
              >
                {selectedGroup?.name ?? 'Select group…'}
              </Text>
              {groups.length > 1 ? (
                <MaterialIcons name="expand-more" size={22} color="#6c7a71" />
              ) : null}
            </Pressable>
          </View>
        </View>

        <View className="gap-xs">
          <Text className="font-sans-semibold text-label-md text-on-surface-variant">
            Paid by
          </Text>
          <Pressable
            onPress={() => members.length > 0 && setPayerPickerOpen(true)}
            disabled={isSubmitting || members.length === 0}
            className="flex-row items-center justify-between rounded-lg border border-outline-variant bg-background py-sm pl-10 pr-3"
          >
            <MaterialIcons
              name="payments"
              size={20}
              color="#6c7a71"
              style={{ position: 'absolute', left: 12 }}
            />
            <Text className="flex-1 font-sans text-body-lg text-on-surface">
              {paidByLabel}
            </Text>
            <MaterialIcons name="expand-more" size={22} color="#6c7a71" />
          </Pressable>
        </View>

        <View className="mt-sm flex-row flex-wrap items-center gap-sm">
          <Text className="font-sans text-body-md text-on-surface-variant">Split</Text>
          <Pressable
            onPress={() => setSplitMode('equal')}
            disabled={isSubmitting}
            className={`flex-row items-center gap-xs rounded-md border px-sm py-xs ${
              splitMode === 'equal'
                ? 'border-primary bg-secondary-container'
                : 'border-outline-variant bg-surface-container'
            }`}
          >
            <MaterialIcons name="pie-chart" size={16} color="#006c49" />
            <Text className="font-sans-semibold text-label-md text-on-surface">Equally</Text>
          </Pressable>
          <Pressable
            onPress={() => setSplitMode('custom')}
            disabled={isSubmitting}
            className={`flex-row items-center gap-xs rounded-md border px-sm py-xs ${
              splitMode === 'custom'
                ? 'border-primary bg-secondary-container'
                : 'border-outline-variant bg-surface-container'
            }`}
          >
            <MaterialIcons name="tune" size={16} color="#006c49" />
            <Text className="font-sans-semibold text-label-md text-on-surface">Custom</Text>
          </Pressable>
        </View>
        {!youAreMember && members.length > 0 ? (
          <Text className="font-sans text-body-md text-error">
            You must be a member of this group to add an expense.
          </Text>
        ) : (
          <Text className="font-sans text-body-md text-on-surface-variant">
            Pick who paid, then choose who owes what. Uncheck people who should not
            owe (e.g. you paid only for someone else).
          </Text>
        )}
      </View>

      {/* Split details card */}
      <View
        className="gap-md rounded-xl border border-surface-variant bg-surface-container-lowest p-lg"
        style={platformShadow('card')}
      >
        <Text className="border-b border-surface-variant pb-sm font-sans-semibold text-headline-sm text-on-surface">
          Split Details
        </Text>

        {members.length === 0 ? (
          <Text className="py-md text-center font-sans text-body-md text-on-surface-variant">
            Select a group to see members.
          </Text>
        ) : (
          <View className="gap-stack-gap">
            {members.map((member, index) => {
              const included = includedIds.has(member.user_id);
              const name = memberDisplayName(member);
              const displayAmount =
                splitMode === 'equal'
                  ? (included ? equalAmounts[member.user_id] ?? 0 : 0)
                  : parseAmount(customSplits[member.user_id] ?? '') ?? 0;

              return (
                <View
                  key={member.user_id}
                  className="flex-row items-center justify-between rounded-lg border border-transparent p-sm active:bg-background"
                >
                  <View className="flex-1 flex-row items-center gap-md">
                    <Pressable
                      onPress={() => toggleMember(member.user_id)}
                      disabled={isSubmitting}
                      className={`h-5 w-5 items-center justify-center rounded border ${
                        included
                          ? 'border-primary bg-primary'
                          : 'border-outline-variant bg-background'
                      }`}
                    >
                      {included ? (
                        <MaterialIcons name="check" size={14} color="#ffffff" />
                      ) : null}
                    </Pressable>
                    <View
                      className={`h-10 w-10 items-center justify-center rounded-full border border-outline-variant ${
                        AVATAR_STYLES[index % AVATAR_STYLES.length]
                      }`}
                    >
                      <Text className="font-sans-semibold text-label-md text-primary">
                        {memberInitial(name)}
                      </Text>
                    </View>
                    <Text className="font-sans text-body-lg text-on-surface">
                      {name}
                      {member.user_id === currentUserId ? ' (You)' : ''}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-sm">
                    <Text className="font-sans-semibold text-label-md text-on-surface-variant">
                      {currencyInputLabel(currencyCode)}
                    </Text>
                    {splitMode === 'custom' && included ? (
                      <TextInput
                        value={customSplits[member.user_id] ?? ''}
                        onChangeText={(text) =>
                          setCustomSplits((prev) => ({
                            ...prev,
                            [member.user_id]: text,
                          }))
                        }
                        placeholder="0.00"
                        placeholderTextColor="#6c7a71"
                        keyboardType="decimal-pad"
                        editable={!isSubmitting}
                        className="w-24 rounded-md bg-transparent px-sm py-xs text-right font-sans-medium text-numeric-data text-on-surface"
                      />
                    ) : (
                      <Text className="w-24 text-right font-sans-medium text-numeric-data text-on-surface">
                        {displayAmount.toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {splitMode === 'custom' && totalAmount > 0 ? (
          <Text
            className={`font-sans text-body-md ${
              splitValid ? 'text-on-surface-variant' : 'text-error'
            }`}
          >
            Split total: {formatMoney(customSplitTotal, currencyCode)} /{' '}
            {formatMoney(totalAmount, currencyCode)}
          </Text>
        ) : null}
      </View>

      {/* Actions */}
      <View className="gap-md pt-md">
        {isEdit && onDelete ? (
          <Pressable
            onPress={onDelete}
            disabled={isSubmitting}
            className="flex-row items-center justify-center gap-xs rounded-lg border border-error-container bg-error-container/30 py-sm active:opacity-80"
          >
            <MaterialIcons name="delete-outline" size={18} color="#ba1a1a" />
            <Text className="font-sans-semibold text-label-md text-error">
              Delete expense
            </Text>
          </Pressable>
        ) : null}
        <View className="flex-row justify-end gap-md">
          <Pressable
            onPress={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-outline-variant px-xl py-sm active:bg-surface-container"
          >
            <Text className="font-sans-semibold text-label-md text-primary">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting || !canSubmit}
            className="flex-row items-center gap-xs rounded-lg bg-primary-container px-xl py-sm shadow-sm active:opacity-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <MaterialIcons name="check" size={18} color="#ffffff" />
                <Text className="font-sans-semibold text-label-md text-on-primary">
                  {isEdit ? 'Save changes' : 'Save'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* Payer picker */}
      <Modal visible={payerPickerOpen} transparent animationType="fade">
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setPayerPickerOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-3xl bg-surface-container-lowest p-lg"
          >
            <Text className="mb-md font-sans-semibold text-headline-sm text-on-surface">
              Who paid?
            </Text>
            <ScrollView className="max-h-64">
              {members.map((m) => (
                <Pressable
                  key={m.user_id}
                  onPress={() => {
                    setPaidById(m.user_id);
                    setPayerPickerOpen(false);
                  }}
                  className={`mb-2 flex-row items-center gap-md rounded-lg px-md py-sm ${
                    m.user_id === paidById
                      ? 'bg-secondary-container'
                      : 'bg-surface-container-low'
                  }`}
                >
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-tertiary-fixed">
                    <Text className="font-sans-semibold text-label-md text-on-tertiary-fixed">
                      {memberInitial(memberDisplayName(m))}
                    </Text>
                  </View>
                  <Text className="font-sans text-body-lg text-on-surface">
                    {memberDisplayName(m)}
                    {m.user_id === currentUserId ? ' (You)' : ''}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Group picker */}
      <Modal visible={groupPickerOpen} transparent animationType="fade">
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setGroupPickerOpen(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()} className="rounded-t-3xl bg-surface-container-lowest p-lg">
            <Text className="mb-md font-sans-semibold text-headline-sm text-on-surface">
              Select group
            </Text>
            <ScrollView className="max-h-64">
              {groups.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => {
                    onGroupChange(g.id);
                    setGroupPickerOpen(false);
                  }}
                  className={`mb-2 rounded-lg px-md py-sm ${
                    g.id === groupId ? 'bg-secondary-container' : 'bg-surface-container-low'
                  }`}
                >
                  <Text className="font-sans text-body-lg text-on-surface">{g.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}
