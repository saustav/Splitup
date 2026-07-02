import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  CURRENCIES_SORTED,
  currencyLabel,
  DEFAULT_CURRENCY_CODE,
  getCurrencyByCode,
  type CurrencyOption,
} from '@/constants/currencies';

export function CurrencyPicker({
  value,
  onChange,
  disabled,
  variant = 'default',
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  variant?: 'default' | 'profile';
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = getCurrencyByCode(value) ?? getCurrencyByCode(DEFAULT_CURRENCY_CODE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURRENCIES_SORTED;
    return CURRENCIES_SORTED.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.country.toLowerCase().includes(q) ||
        item.countryCode.toLowerCase().includes(q)
    );
  }, [query]);

  function pick(item: CurrencyOption) {
    onChange(item.code);
    setOpen(false);
    setQuery('');
  }

  const isProfile = variant === 'profile';

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={
          isProfile
            ? 'h-12 flex-row items-center justify-between rounded-lg border border-outline-variant bg-background px-md'
            : 'flex-row items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800'
        }
      >
        <View className="min-w-0 flex-1">
          {!isProfile ? (
            <Text className="text-xs font-medium text-neutral-500">Currency</Text>
          ) : null}
          {selected ? (
            <Text
              className={
                isProfile
                  ? 'font-sans text-body-md text-on-surface'
                  : 'mt-xs text-base text-neutral-900 dark:text-white'
              }
            >
              {selected.flag} {selected.code} ({selected.symbol})
            </Text>
          ) : (
            <Text
              className={
                isProfile
                  ? 'font-sans text-body-md text-on-surface-variant'
                  : 'mt-xs text-base text-neutral-500'
              }
            >
              Select currency
            </Text>
          )}
          {!isProfile && selected ? (
            <Text className="text-xs text-neutral-500">
              {selected.country} ({selected.countryCode})
            </Text>
          ) : null}
        </View>
        <MaterialIcons
          name="expand-more"
          size={24}
          color={isProfile ? '#54534D' : '#737373'}
        />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[85%] rounded-t-3xl bg-white pt-4 dark:bg-neutral-900">
            <View className="px-4 pb-2">
              <Text className="text-lg font-bold text-neutral-900 dark:text-white">
                Select currency
              </Text>
              <Text className="text-sm text-neutral-500">
                ISO code, flag, and country name
              </Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search code, country, or name…"
                placeholderTextColor="#a3a3a3"
                autoCapitalize="none"
                className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-base dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => `${item.code}-${item.countryCode}`}
              keyboardShouldPersistTaps="handled"
              className="px-2"
              contentContainerStyle={{ paddingBottom: 32 }}
              renderItem={({ item }) => {
                const isSelected = item.code === value;
                return (
                  <Pressable
                    onPress={() => pick(item)}
                    className={`mx-2 mb-1 flex-row items-center gap-3 rounded-xl px-3 py-3 ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950'
                        : 'active:bg-neutral-100 dark:active:bg-neutral-800'
                    }`}
                  >
                    <Text className="text-2xl">{item.flag}</Text>
                    <View className="flex-1">
                      <Text className="font-semibold text-neutral-900 dark:text-white">
                        {item.code} · {item.name}
                      </Text>
                      <Text className="text-sm text-neutral-500">
                        {item.country} — ISO {item.countryCode}
                      </Text>
                    </View>
                    {isSelected ? (
                      <MaterialIcons name="check-circle" size={22} color="#16a34a" />
                    ) : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text className="py-8 text-center text-neutral-500">No currencies found</Text>
              }
            />

            <Pressable
              onPress={() => {
                setOpen(false);
                setQuery('');
              }}
              className="mx-4 mb-8 mt-2 rounded-xl border border-neutral-200 py-3 dark:border-neutral-700"
            >
              <Text className="text-center font-semibold text-neutral-700 dark:text-neutral-300">
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
