import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { uiColors } from '@/constants/theme';
import { formatMoney } from '@/lib/currency';
import { platformShadow } from '@/lib/platformShadow';
import { usePendingActionsStore } from '@/stores/pendingActionsStore';
import type { AppNotification } from '@/types/notification';
import { notificationItemKey } from '@/types/notification';

type RowContent = {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
};

function rowContent(item: AppNotification): RowContent {
  switch (item.kind) {
    case 'payment':
      return {
        icon: 'payments',
        iconBg: 'bg-error-container',
        iconColor: '#93000a',
        title: 'Confirm payment',
        subtitle: `${item.payerName} paid you ${formatMoney(item.amount, item.currency)} in ${item.groupName}`,
      };
    case 'expense_created':
      return {
        icon: 'receipt-long',
        iconBg: 'bg-primary-container',
        iconColor: '#00422b',
        title: 'New expense',
        subtitle: `${item.actorName} added "${item.description}" (${formatMoney(item.amount, item.currency)}) in ${item.groupName}`,
      };
    case 'expense_updated':
      return {
        icon: 'edit-note',
        iconBg: 'bg-primary-container',
        iconColor: '#00422b',
        title: 'Expense updated',
        subtitle: `${item.actorName} edited "${item.description}" in ${item.groupName}`,
      };
    case 'expense_deleted':
      return {
        icon: 'delete-outline',
        iconBg: 'bg-surface-container-high',
        iconColor: uiColors.muted,
        title: 'Expense removed',
        subtitle: `${item.actorName} removed "${item.description}" from ${item.groupName}`,
      };
    case 'settlement_completed':
      return {
        icon: 'check-circle',
        iconBg: 'bg-primary-container',
        iconColor: '#00422b',
        title: 'Payment confirmed',
        subtitle: `${item.actorName} confirmed your ${formatMoney(item.amount, item.currency)} payment in ${item.groupName}`,
      };
    case 'member_joined':
      return {
        icon: 'person-add',
        iconBg: 'bg-secondary-container',
        iconColor: '#1a1a1a',
        title: 'New member',
        subtitle: `${item.actorName} joined ${item.groupName}`,
      };
    case 'member_left':
      return {
        icon: 'person-remove',
        iconBg: 'bg-surface-container-high',
        iconColor: uiColors.muted,
        title: 'Member left',
        subtitle: `${item.actorName} left ${item.groupName}`,
      };
    case 'monthly_report':
      return {
        icon: 'summarize',
        iconBg: 'bg-secondary-container',
        iconColor: '#1a1a1a',
        title: item.title,
        subtitle: item.body,
      };
  }
}

function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: () => void;
}) {
  const content = rowContent(item);

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-md rounded-xl border border-outline-variant/30 bg-surface-container-low p-md active:bg-surface-container"
    >
      <View
        className={`h-11 w-11 items-center justify-center rounded-full ${content.iconBg}`}
      >
        <MaterialIcons name={content.icon} size={22} color={content.iconColor} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-sans-semibold text-body-md text-on-surface">
          {content.title}
        </Text>
        <Text
          className="font-sans text-body-md text-on-surface-variant"
          numberOfLines={2}
        >
          {content.subtitle}
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

    if (item.kind === 'monthly_report') {
      router.push('/(tabs)/balances');
      return;
    }

    if (
      item.kind === 'expense_created' ||
      item.kind === 'expense_updated'
    ) {
      router.push(`/expense/${item.expenseId}`);
      return;
    }

    if ('groupId' in item && item.groupId) {
      router.push(`/group/${item.groupId}`);
    }
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
                No new activity waiting for you.
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
                    key={notificationItemKey(item)}
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
