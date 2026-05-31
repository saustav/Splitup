import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { formatActivityTime, type ActivityItem } from '@/lib/activity';
import { platformShadow } from '@/lib/platformShadow';

function iconConfig(type: ActivityItem['type']): {
  name: keyof typeof MaterialIcons.glyphMap;
  containerClass: string;
  iconColor: string;
} {
  switch (type) {
    case 'expense':
      return {
        name: 'receipt-long',
        containerClass: 'bg-surface-container-highest',
        iconColor: '#1D9E75',
      };
    case 'expense_updated':
      return {
        name: 'edit',
        containerClass: 'bg-surface-container-highest',
        iconColor: '#1D9E75',
      };
    case 'expense_deleted':
      return {
        name: 'delete-outline',
        containerClass: 'bg-surface-variant',
        iconColor: '#3c4a42',
      };
    case 'payment':
      return {
        name: 'payments',
        containerClass: 'bg-secondary-container',
        iconColor: '#306d58',
      };
    case 'group_join':
      return {
        name: 'group-add',
        containerClass: 'bg-tertiary-fixed',
        iconColor: '#001a42',
      };
    case 'invite':
      return {
        name: 'link',
        containerClass: 'bg-tertiary-fixed',
        iconColor: '#001a42',
      };
    case 'settlement':
      return {
        name: 'check-circle',
        containerClass: 'bg-surface-variant',
        iconColor: '#3c4a42',
      };
    case 'settlement_pending':
      return {
        name: 'hourglass-top',
        containerClass: 'bg-amber-100 dark:bg-amber-950',
        iconColor: '#b45309',
      };
  }
}

function ActivityMessage({ item }: { item: ActivityItem }) {
  if (item.type === 'expense') {
    const quote = `"${item.description}"`;
    return (
      <Text className="font-sans text-body-md text-on-surface">
        <Text className="font-sans-semibold">{item.actorName}</Text>
        {' added '}
        <Text className="font-sans-semibold">{quote}</Text>
        {' in '}
        <Text className="font-sans-semibold text-primary">{item.groupName}</Text>
      </Text>
    );
  }

  if (item.type === 'expense_updated') {
    const quote = `"${item.description}"`;
    return (
      <Text className="font-sans text-body-md text-on-surface">
        <Text className="font-sans-semibold">{item.actorName}</Text>
        {' updated '}
        <Text className="font-sans-semibold">{quote}</Text>
        {' in '}
        <Text className="font-sans-semibold text-primary">{item.groupName}</Text>
      </Text>
    );
  }

  if (item.type === 'expense_deleted') {
    const quote = `"${item.description}"`;
    return (
      <Text className="font-sans text-body-md text-on-surface-variant">
        <Text className="font-sans-semibold">{item.actorName}</Text>
        {' removed '}
        <Text className="font-sans-semibold">{quote}</Text>
        {' from '}
        <Text className="font-sans-semibold">{item.groupName}</Text>
      </Text>
    );
  }

  if (item.type === 'invite') {
    return (
      <Text className="font-sans text-body-md text-on-surface">
        <Text className="font-sans-semibold">{item.actorName}</Text>
        {' shared invite '}
        <Text className="font-sans-semibold text-primary">{item.description}</Text>
        {' for '}
        <Text className="font-sans-semibold text-primary">{item.groupName}</Text>
      </Text>
    );
  }

  if (item.type === 'payment' && item.amount != null) {
    return (
      <Text className="font-sans text-body-md text-on-surface">{item.message}</Text>
    );
  }

  if (item.type === 'settlement') {
    return (
      <Text className="font-sans text-body-md text-on-surface-variant">
        {item.message}
      </Text>
    );
  }

  if (item.type === 'settlement_pending') {
    return (
      <Text className="font-sans text-body-md text-amber-900 dark:text-amber-200">
        {item.message}
      </Text>
    );
  }

  if (item.type === 'group_join') {
    if (item.actorName === 'You') {
      return (
        <Text className="font-sans text-body-md text-on-surface">
          You joined{' '}
          <Text className="font-sans-semibold text-primary">{item.groupName}</Text>
        </Text>
      );
    }
    return (
      <Text className="font-sans text-body-md text-on-surface">
        <Text className="font-sans-semibold">{item.actorName}</Text>
        {' joined '}
        <Text className="font-sans-semibold text-primary">{item.groupName}</Text>
      </Text>
    );
  }

  return (
    <Text className="font-sans text-body-md text-on-surface-variant">
      {item.message}
    </Text>
  );
}

export function ActivityCard({
  item,
  onPress,
}: {
  item: ActivityItem;
  onPress?: () => void;
}) {
  const router = useRouter();
  const icon = iconConfig(item.type);

  function handlePress() {
    if (onPress) {
      onPress();
      return;
    }
    router.push(`/group/${item.groupId}`);
  }

  return (
    <Pressable
      onPress={handlePress}
      className={`flex-row items-start gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md active:opacity-90 ${
        item.dimmed ? 'opacity-80' : ''
      }`}
      style={platformShadow('card')}
    >
      <View className={`rounded-full p-sm ${icon.containerClass}`}>
        <MaterialIcons name={icon.name} size={22} color={icon.iconColor} />
      </View>

      <View className="min-w-0 flex-1">
        <ActivityMessage item={item} />
        <Text className="mt-xs font-sans text-label-md text-on-surface-variant">
          {formatActivityTime(item.createdAt)}
        </Text>
      </View>

      <Pressable
        onPress={handlePress}
        className="self-center rounded p-xs active:bg-surface-container"
      >
        <MaterialIcons name="chevron-right" size={20} color="#1D9E75" />
      </Pressable>
    </Pressable>
  );
}
