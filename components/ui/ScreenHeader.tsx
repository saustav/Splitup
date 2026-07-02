import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/IconButton';
import { uiColors } from '@/constants/theme';
import { goBackOrHome } from '@/lib/navigation';
import { initialsFromName } from '@/lib/profile';

type ScreenHeaderProps = {
  variant: 'dashboard' | 'tab' | 'stack';
  title?: string;
  displayName?: string;
  avatarUrl?: string | null;
  showBack?: boolean;
  onBackPress?: () => void;
  notificationCount?: number;
  hasNotifications?: boolean;
  onNotificationsPress?: () => void;
  onInvitePress?: () => void;
  onMenuPress?: () => void;
};

export function ScreenHeader({
  variant,
  title,
  displayName = '',
  avatarUrl,
  showBack = false,
  onBackPress,
  notificationCount = 0,
  hasNotifications = false,
  onNotificationsPress,
  onInvitePress,
  onMenuPress,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function handleBack() {
    if (onBackPress) {
      onBackPress();
      return;
    }
    goBackOrHome(router);
  }

  const firstName = displayName.split(/\s+/)[0] ?? displayName;
  const initials = initialsFromName(displayName);

  return (
    <View
      className="bg-background px-container-margin pb-1.5"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="min-h-[34px] flex-row items-center justify-between">
        {variant === 'dashboard' ? (
          <View className="min-w-0 flex-1 flex-row items-center gap-sm">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="h-[34px] w-[34px] rounded-full"
                accessibilityLabel={`${displayName} profile photo`}
              />
            ) : (
              <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-brand-mint">
                <Text className="font-sans-medium text-label-md text-brand-deeper">
                  {initials}
                </Text>
              </View>
            )}
            <Text
              className="font-sans-medium text-body-lg text-on-surface"
              numberOfLines={1}
            >
              Hey, {firstName}{' '}
              <Text className="font-sans text-body-lg">👋</Text>
            </Text>
          </View>
        ) : variant === 'tab' ? (
          <Text className="font-sans-medium text-body-lg text-on-surface">
            {title}
          </Text>
        ) : (
          <View className="min-w-0 flex-1 flex-row items-center gap-xs">
            {showBack ? (
              <Pressable
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                className="flex-row items-center gap-xs rounded-lg py-1 pr-sm active:opacity-80"
                hitSlop={8}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={22}
                  color={uiColors.iconOnLight}
                />
              </Pressable>
            ) : null}
            <Text
              className="min-w-0 flex-1 font-sans-medium text-body-lg text-on-surface"
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
        )}

        <View className="flex-row items-center gap-sm">
          {onNotificationsPress ? (
            <IconButton
              icon={
                notificationCount > 0 ? 'notifications' : 'notifications-none'
              }
              onPress={onNotificationsPress}
              accessibilityLabel={
                notificationCount > 0
                  ? `${notificationCount} notifications`
                  : 'Notifications'
              }
              badge={hasNotifications || notificationCount > 0}
            />
          ) : null}
          {onInvitePress ? (
            <IconButton
              icon="person-add"
              onPress={onInvitePress}
              accessibilityLabel="Invite friends"
            />
          ) : null}
          {onMenuPress ? (
            <IconButton
              icon="more-vert"
              onPress={onMenuPress}
              accessibilityLabel="More options"
            />
          ) : null}
          {variant === 'dashboard' ? (
            <IconButton
              icon="settings"
              onPress={() => router.push('/(tabs)/account')}
              accessibilityLabel="Account settings"
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
