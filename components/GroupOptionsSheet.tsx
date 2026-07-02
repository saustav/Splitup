import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Modal, Pressable, Text, View } from 'react-native';

import { uiColors } from '@/constants/theme';
import { platformShadow } from '@/lib/platformShadow';

function MenuRow({
  icon,
  label,
  onPress,
  disabled,
  destructive,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const iconColor = disabled ? '#9ca89f' : destructive ? uiColors.error : uiColors.muted;
  const textColor = disabled
    ? 'text-on-surface-variant/50'
    : destructive
      ? 'text-error'
      : 'text-on-surface';

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      className={`flex-row items-center gap-md rounded-xl px-md py-md ${
        disabled ? 'opacity-60' : 'active:bg-surface-container-low'
      }`}
    >
      <MaterialIcons name={icon} size={22} color={iconColor} />
      <Text className={`flex-1 font-sans-semibold text-body-lg ${textColor}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function GroupOptionsSheet({
  visible,
  onClose,
  canRename,
  canDelete,
  canLeave,
  onRename,
  onLeave,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  canRename: boolean;
  canDelete: boolean;
  canLeave: boolean;
  onRename: () => void;
  onLeave: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          className="rounded-t-3xl bg-surface-container-lowest px-container-margin pb-10 pt-4"
          style={platformShadow('card')}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="mb-md h-1 w-10 self-center rounded-full bg-outline-variant" />
          <Text className="mb-sm font-sans-semibold text-headline-sm text-on-surface">
            Group options
          </Text>

          <View className="gap-xs">
            <MenuRow
              icon="drive-file-rename-outline"
              label="Rename group"
              disabled={!canRename}
              onPress={() => {
                onClose();
                onRename();
              }}
            />
            <MenuRow
              icon="logout"
              label="Leave group"
              disabled={!canLeave}
              onPress={() => {
                onClose();
                onLeave();
              }}
            />
            <MenuRow
              icon="delete-outline"
              label="Delete group"
              disabled={!canDelete}
              destructive={canDelete}
              onPress={() => {
                onClose();
                onDelete();
              }}
            />
          </View>

          {!canDelete ? (
            <Text className="mt-sm px-md font-sans text-label-md text-on-surface-variant">
              Only the group creator can delete this group.
            </Text>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
