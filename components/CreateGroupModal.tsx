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
        <View className="rounded-t-3xl bg-white px-6 pb-10 pt-6 dark:bg-neutral-900">
          <Text className="text-xl font-bold text-neutral-900 dark:text-white">
            New group
          </Text>
          <Text className="mt-1 text-sm text-neutral-500">
            e.g. Roommates, Trip to Pokhara, Office lunch
          </Text>

          {error ? (
            <View className="mt-4 rounded-lg bg-red-50 p-3 dark:bg-red-950">
              <Text className="text-center text-sm text-red-700 dark:text-red-300">
                {error}
              </Text>
            </View>
          ) : null}

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Group name"
            placeholderTextColor="#a3a3a3"
            autoFocus
            maxLength={80}
            editable={!isCreating}
            className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            onSubmitEditing={handleSubmit}
          />

          <View className="mt-4">
            <CurrencyPicker
              value={currency}
              onChange={setCurrency}
              disabled={isCreating}
            />
          </View>

          <View className="mt-6 flex-row gap-3">
            <Pressable
              onPress={handleClose}
              disabled={isCreating}
              className="flex-1 rounded-xl border border-neutral-200 py-3 dark:border-neutral-700"
            >
              <Text className="text-center font-semibold text-neutral-700 dark:text-neutral-300">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={isCreating || !name.trim()}
              className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-600 py-3 active:bg-brand-700 disabled:opacity-50"
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Create</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
