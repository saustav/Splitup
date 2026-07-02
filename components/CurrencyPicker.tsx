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
import { uiColors } from '@/constants/theme';

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
            : 'flex-row items-center justify-between rounded-card border border-outline-variant/40 bg-surface-container-low px-md py-sm'
        }
      >
        <View className="min-w-0 flex-1">
          {!isProfile ? (
            <Text className="font-sans text-label-md text-on-surface-variant">Currency</Text>
          ) : null}
          {selected ? (
            <Text
              className={
                isProfile
                  ? 'font-sans text-body-md text-on-surface'
                  : 'mt-xs font-sans text-body-md text-on-surface'
              }
            >
              {selected.flag} {selected.code} ({selected.symbol})
            </Text>
          ) : (
            <Text
              className={
                isProfile
                  ? 'font-sans text-body-md text-on-surface-variant'
                  : 'mt-xs font-sans text-body-md text-on-surface-variant'
              }
            >
              Select currency
            </Text>
          )}
          {!isProfile && selected ? (
            <Text className="font-sans text-label-md text-on-surface-variant">
              {selected.country} ({selected.countryCode})
            </Text>
          ) : null}
        </View>
        <MaterialIcons
          name="expand-more"
          size={24}
          color={uiColors.muted}
        />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[85%] rounded-t-3xl bg-surface-container-lowest pt-md">
            <View className="px-md pb-sm">
              <Text className="font-sans-medium text-headline-sm text-on-surface">
                Select currency
              </Text>
              <Text className="font-sans text-label-md text-on-surface-variant">
                ISO code, flag, and country name
              </Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search code, country, or name…"
                placeholderTextColor={uiColors.muted}
                autoCapitalize="none"
                className="mt-3 rounded-card border border-outline-variant/40 bg-surface-container-low px-md py-sm font-sans text-body-md text-on-surface"
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => `${item.code}-${item.countryCode}`}
              keyboardShouldPersistTaps="handled"
              className="px-sm"
              contentContainerStyle={{ paddingBottom: 32 }}
              renderItem={({ item }) => {
                const isSelected = item.code === value;
                return (
                  <Pressable
                    onPress={() => pick(item)}
                    className={`mx-sm mb-1 flex-row items-center gap-md rounded-card px-sm py-sm ${
                      isSelected
                        ? 'bg-secondary-container'
                        : 'active:bg-surface-container-high'
                    }`}
                  >
                    <Text className="text-2xl">{item.flag}</Text>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-body-md text-on-surface">
                        {item.code} · {item.name}
                      </Text>
                      <Text className="font-sans text-label-md text-on-surface-variant">
                        {item.country} — ISO {item.countryCode}
                      </Text>
                    </View>
                    {isSelected ? (
                      <MaterialIcons name="check-circle" size={22} color={uiColors.iconOnLight} />
                    ) : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text className="py-8 text-center font-sans text-body-md text-on-surface-variant">
                  No currencies found
                </Text>
              }
            />

            <Pressable
              onPress={() => {
                setOpen(false);
                setQuery('');
              }}
              className="mx-md mb-8 mt-sm rounded-card border border-outline-variant py-sm"
            >
              <Text className="text-center font-sans-semibold text-body-md text-on-surface-variant">
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
