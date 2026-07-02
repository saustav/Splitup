import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/AppLogo';
import { goBackOrHome, HOME_ROUTE } from '@/lib/navigation';
import { useThemeStore } from '@/stores/themeStore';

type TopAppBarProps = {
  /** Page context shown under the app logo (e.g. group name). */
  title?: string;
  onNotificationsPress?: () => void;
  /** Show bell; use with `notificationCount` for pending actions. */
  showNotifications?: boolean;
  /** Red dot when > 0 without a numeric badge. */
  hasNotifications?: boolean;
  notificationCount?: number;
  showBack?: boolean;
  onBackPress?: () => void;
  /** Icon-only invite action on the right (replaces close when `showBack`). */
  onInvitePress?: () => void;
  /** Three-dot group / page menu. */
  onMenuPress?: () => void;
};

const SIDE_WIDTH = 56;
const SIDE_WIDTH_WITH_ACTIONS = 120;

export function TopAppBar({
  title,
  onNotificationsPress,
  showNotifications = false,
  hasNotifications = false,
  notificationCount = 0,
  showBack = false,
  onBackPress,
  onInvitePress,
  onMenuPress,
}: TopAppBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const isDark = themeMode === 'dark';

  function handleBack() {
    if (onBackPress && router.canGoBack()) {
      onBackPress();
      return;
    }
    goBackOrHome(router);
  }

  function goHome() {
    router.replace(HOME_ROUTE);
  }

  const rightHasActions =
    (showNotifications && !!onNotificationsPress) ||
    !!onInvitePress ||
    !!onMenuPress;
  const rightWidth = rightHasActions ? SIDE_WIDTH_WITH_ACTIONS : SIDE_WIDTH;

  return (
    <View
      className="border-b border-outline-variant bg-surface-container-lowest"
      style={{ paddingTop: insets.top }}
    >
      <View
        className={`min-h-16 flex-row items-center px-container-margin ${
          title ? 'py-sm' : 'py-0'
        }`}
      >
        <View style={{ width: SIDE_WIDTH }}>
          {showBack ? (
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="flex-row items-center gap-xs rounded-lg py-sm pr-sm active:bg-surface-container-high"
              hitSlop={8}
            >
              <MaterialIcons name="arrow-back" size={22} color="#0F6E56" />
              <Text className="font-sans-semibold text-label-md text-primary">
                Back
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="rounded-full p-2 active:bg-surface-container-high"
              hitSlop={8}
            >
              <MaterialIcons
                name={isDark ? 'light-mode' : 'dark-mode'}
                size={24}
                color={isDark ? '#EAF3DE' : '#54534D'}
              />
            </Pressable>
          )}
        </View>

        <View className="min-w-0 flex-1 items-center justify-center px-1">
          <AppLogo onPress={goHome} />
          {title ? (
            <Text
              className="mt-xs max-w-full text-center font-sans-semibold text-label-md text-on-surface-variant"
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}
        </View>

        <View
          className="flex-row items-center justify-end"
          style={{ width: rightWidth }}
        >
          {showNotifications && onNotificationsPress ? (
            <Pressable
              onPress={onNotificationsPress}
              accessibilityRole="button"
              accessibilityLabel={
                notificationCount > 0
                  ? `${notificationCount} notifications`
                  : 'Notifications'
              }
              className="relative rounded-full p-2 active:bg-surface-container-high"
              hitSlop={8}
            >
              <MaterialIcons
                name={notificationCount > 0 ? 'notifications' : 'notifications-none'}
                size={24}
                color={notificationCount > 0 ? '#0F6E56' : '#54534D'}
              />
              {notificationCount > 0 ? (
                <View className="absolute -right-xs -top-xs min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1">
                  <Text className="font-sans-semibold text-label-md text-on-error">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              ) : hasNotifications ? (
                <View className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
              ) : null}
            </Pressable>
          ) : null}
          {onInvitePress ? (
            <Pressable
              onPress={onInvitePress}
              accessibilityRole="button"
              accessibilityLabel="Invite friends"
              className="rounded-full p-2 active:bg-surface-container-high"
              hitSlop={8}
            >
              <MaterialIcons name="person-add" size={24} color="#0F6E56" />
            </Pressable>
          ) : null}
          {onMenuPress ? (
            <Pressable
              onPress={onMenuPress}
              accessibilityRole="button"
              accessibilityLabel="Group options"
              className="rounded-full p-2 active:bg-surface-container-high"
              hitSlop={8}
            >
              <MaterialIcons name="more-vert" size={24} color="#54534D" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
