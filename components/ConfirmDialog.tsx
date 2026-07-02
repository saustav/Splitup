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
        className="flex-1 items-center justify-center bg-black/50 px-lg"
        onPress={onCancel}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-hero bg-surface-container-lowest p-lg"
        >
          <Text className="font-sans-medium text-headline-sm text-on-surface">
            {title}
          </Text>
          <Text className="mt-2 font-sans text-body-md text-on-surface-variant">
            {message}
          </Text>
          <View className="mt-6 flex-row gap-sm">
            <Pressable
              onPress={onCancel}
              disabled={isLoading}
              className="flex-1 rounded-card border border-outline-variant py-sm active:opacity-80"
            >
              <Text className="text-center font-sans-semibold text-body-md text-on-surface-variant">
                {cancelLabel}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={isLoading}
              className={`flex-1 rounded-card py-sm active:opacity-80 disabled:opacity-50 ${
                destructive ? 'bg-error' : 'bg-primary'
              }`}
            >
              <Text className="text-center font-sans-semibold text-body-md text-on-primary">
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
