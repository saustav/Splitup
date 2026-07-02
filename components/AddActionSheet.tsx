import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Modal, Pressable, Text, View } from 'react-native';

import { uiColors } from '@/constants/theme';
import { platformShadow } from '@/lib/platformShadow';

type AddActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  onAddExpense: () => void;
  onAddGroup: () => void;
  onJoinWithCode: () => void;
};

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md active:bg-surface-container-low"
      style={platformShadow('card')}
    >
      <View className="h-11 w-11 items-center justify-center rounded-lg bg-primary-container">
        <MaterialIcons name={icon} size={24} color="#00422b" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-sans-semibold text-body-lg text-on-surface">{title}</Text>
        <Text className="font-sans text-body-md text-on-surface-variant">{subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={uiColors.muted} />
    </Pressable>
  );
}

export function AddActionSheet({
  visible,
  onClose,
  onAddExpense,
  onAddGroup,
  onJoinWithCode,
}: AddActionSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          className="rounded-t-3xl bg-surface-container-lowest px-container-margin pb-10 pt-6"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="mb-md h-1 w-10 self-center rounded-full bg-outline-variant" />
          <Text className="font-sans-semibold text-headline-sm text-on-surface">
            Create
          </Text>
          <Text className="mb-lg mt-xs font-sans text-body-md text-on-surface-variant">
            Add a group, join with a code, or log an expense
          </Text>

          <View className="gap-sm">
            <ActionRow
              icon="receipt-long"
              title="New expense"
              subtitle="Split a bill in one of your groups"
              onPress={() => {
                onClose();
                onAddExpense();
              }}
            />
            <ActionRow
              icon="group-add"
              title="New group"
              subtitle="Start splitting with friends"
              onPress={() => {
                onClose();
                onAddGroup();
              }}
            />
            <ActionRow
              icon="vpn-key"
              title="Join with code"
              subtitle="Enter an invite code from a friend"
              onPress={() => {
                onClose();
                onJoinWithCode();
              }}
            />
          </View>

          <Pressable
            onPress={onClose}
            className="mt-lg items-center rounded-xl border border-outline-variant py-md active:bg-surface-container-low"
          >
            <Text className="font-sans-semibold text-body-md text-on-surface-variant">
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
