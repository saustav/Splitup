import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CurrencyPicker } from '@/components/CurrencyPicker';
import { DEFAULT_CURRENCY_CODE } from '@/constants/currencies';
import { uiColors } from '@/constants/theme';

export function CreateGroupModal({
  visible,
  onClose,
  onCreate,
  isCreating,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, currency: string) => void | Promise<void>;
  isCreating: boolean;
  error?: string | null;
}) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY_CODE);

  useEffect(() => {
    if (!visible) {
      setName('');
      setCurrency(DEFAULT_CURRENCY_CODE);
    }
  }, [visible]);

  function handleClose() {
    setName('');
    setCurrency(DEFAULT_CURRENCY_CODE);
    onClose();
  }

  function handleSubmit() {
    onCreate(name, currency);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-surface-container-lowest px-lg pb-10 pt-md">
          <View className="mb-md h-1 w-10 self-center rounded-full bg-outline-variant" />
          <Text className="font-sans-medium text-headline-sm text-on-surface">
            New group
          </Text>
          <Text className="mt-1 font-sans text-label-md text-on-surface-variant">
            e.g. Roommates, Trip to Pokhara, Office lunch
          </Text>

          {error ? (
            <View className="mt-4 rounded-card bg-error-container p-md">
              <Text className="text-center font-sans text-body-md text-on-error-container">
                {error}
              </Text>
            </View>
          ) : null}

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Group name"
            placeholderTextColor={uiColors.muted}
            autoFocus
            maxLength={80}
            editable={!isCreating}
            className="mt-4 rounded-card border border-outline-variant/40 bg-surface-container-low px-md py-sm font-sans text-body-md text-on-surface"
            onSubmitEditing={handleSubmit}
          />

          <View className="mt-4">
            <CurrencyPicker
              value={currency}
              onChange={setCurrency}
              disabled={isCreating}
            />
          </View>

          <View className="mt-6 flex-row gap-sm">
            <Pressable
              onPress={handleClose}
              disabled={isCreating}
              className="flex-1 rounded-card border border-outline-variant py-sm active:opacity-80"
            >
              <Text className="text-center font-sans-semibold text-body-md text-on-surface-variant">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={isCreating || !name.trim()}
              className="flex-1 flex-row items-center justify-center rounded-card bg-primary py-sm active:opacity-80 disabled:opacity-50"
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-sans-semibold text-body-md text-on-primary">
                  Create
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
