import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { uiColors } from '@/constants/theme';
import { formatMoney } from '@/lib/currency';
import { platformShadow } from '@/lib/platformShadow';
import { usePendingActionsStore } from '@/stores/pendingActionsStore';
import type { AppNotification } from '@/types/notification';

function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: () => void;
}) {
  if (item.kind === 'payment') {
    return (
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-md rounded-xl border border-outline-variant/30 bg-surface-container-low p-md active:bg-surface-container"
      >
        <View className="h-11 w-11 items-center justify-center rounded-full bg-error-container">
          <MaterialIcons name="payments" size={22} color="#93000a" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-sans-semibold text-body-md text-on-surface">
            Confirm payment
          </Text>
          <Text
            className="font-sans text-body-md text-on-surface-variant"
            numberOfLines={2}
          >
            {item.payerName} paid you{' '}
            {formatMoney(item.amount, item.currency)} in {item.groupName}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={uiColors.muted} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-md rounded-xl border border-outline-variant/30 bg-surface-container-low p-md active:bg-surface-container"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-container">
        <MaterialIcons name="receipt-long" size={22} color="#00422b" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-sans-semibold text-body-md text-on-surface">
          New expense
        </Text>
        <Text
          className="font-sans text-body-md text-on-surface-variant"
          numberOfLines={2}
        >
          {item.actorName} added &quot;{item.description}&quot; (
          {formatMoney(item.amount, item.currency)}) in {item.groupName}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={uiColors.muted} />
    </Pressable>
  );
}

export function PendingActionsSheet() {
  const router = useRouter();
  const visible = usePendingActionsStore((s) => s.sheetOpen);
  const closeSheet = usePendingActionsStore((s) => s.closeSheet);
  const items = usePendingActionsStore((s) => s.items);

  function handlePress(item: AppNotification) {
    closeSheet();
    if (item.kind === 'expense') {
      router.push(`/group/${item.groupId}`);
      return;
    }
    router.push(`/group/${item.groupId}`);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={closeSheet}
    >
      <Pressable
        className="flex-1 justify-end bg-black/40"
        onPress={closeSheet}
      >
        <Pressable
          className="max-h-[80%] rounded-t-2xl bg-surface-container-lowest px-container-margin pb-8 pt-4"
          style={platformShadow('card')}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="mb-md flex-row items-center justify-between">
            <Text className="font-sans-semibold text-headline-sm text-on-surface">
              Notifications
            </Text>
            <Pressable
              onPress={closeSheet}
              accessibilityLabel="Close"
              className="rounded-full p-2 active:bg-surface-container-high"
            >
              <MaterialIcons name="close" size={22} color={uiColors.muted} />
            </Pressable>
          </View>

          {items.length === 0 ? (
            <View className="items-center py-10">
              <MaterialIcons name="notifications-none" size={40} color={uiColors.muted} />
              <Text className="mt-md font-sans-semibold text-body-lg text-on-surface">
                All caught up
              </Text>
              <Text className="mt-xs text-center font-sans text-body-md text-on-surface-variant">
                No new expenses or payments waiting for you.
              </Text>
            </View>
          ) : (
            <ScrollView
              className="max-h-[420px]"
              showsVerticalScrollIndicator={false}
            >
              <View className="gap-stack-gap pb-2">
                {items.map((item) => (
                  <NotificationRow
                    key={
                      item.kind === 'payment'
                        ? `payment-${item.settlementId}`
                        : `expense-${item.eventId}`
                    }
                    item={item}
                    onPress={() => handlePress(item)}
                  />
                ))}
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
