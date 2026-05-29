import { Modal, Pressable, Text, View } from 'react-native';

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  isLoading,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        className="flex-1 items-center justify-center bg-black/50 px-6"
        onPress={onCancel}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-neutral-900"
        >
          <Text className="text-lg font-bold text-neutral-900 dark:text-white">
            {title}
          </Text>
          <Text className="mt-2 text-base text-neutral-600 dark:text-neutral-400">
            {message}
          </Text>
          <View className="mt-6 flex-row gap-3">
            <Pressable
              onPress={onCancel}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-neutral-200 py-3 dark:border-neutral-700"
            >
              <Text className="text-center font-semibold text-neutral-700 dark:text-neutral-300">
                {cancelLabel}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={isLoading}
              className={`flex-1 rounded-xl py-3 ${
                destructive ? 'bg-red-600' : 'bg-brand-600'
              } disabled:opacity-50`}
            >
              <Text className="text-center font-semibold text-white">
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
