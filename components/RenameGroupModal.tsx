import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AutosaveIndicator } from '@/components/AutosaveIndicator';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useAutosaveStatus } from '@/hooks/useAutosaveStatus';

const AUTOSAVE_MS = 600;

export function RenameGroupModal({
  visible,
  initialName,
  onClose,
  onSave,
  isSaving,
  error,
}: {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => void | Promise<void>;
  isSaving: boolean;
  error?: string | null;
}) {
  const [name, setName] = useState(initialName);
  const baselineRef = useRef(initialName);
  const wasSavingRef = useRef(false);
  const autosaveStatus = useAutosaveStatus(isSaving);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      baselineRef.current = initialName;
    }
  }, [visible, initialName]);

  useEffect(() => {
    if (wasSavingRef.current && !isSaving && !error) {
      baselineRef.current = name.trim();
    }
    wasSavingRef.current = isSaving;
  }, [isSaving, error, name]);

  const debouncedSave = useDebouncedCallback((nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === baselineRef.current || isSaving) return;
    void onSave(trimmed);
  }, AUTOSAVE_MS);

  useEffect(() => {
    if (!visible || isSaving) return;
    debouncedSave(name);
  }, [name, visible, isSaving, debouncedSave]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="z-10 rounded-t-3xl bg-surface-container-lowest px-6 pb-10 pt-6">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-semibold text-headline-sm text-on-surface">
              Rename group
            </Text>
            <AutosaveIndicator status={autosaveStatus} />
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Group name"
            placeholderTextColor="#54534D"
            editable={!isSaving}
            autoFocus
            className="mt-md rounded-lg border border-outline-variant bg-background px-md py-sm font-sans text-body-lg text-on-surface"
          />
          {error ? (
            <Text className="mt-sm font-sans text-body-md text-error">{error}</Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
