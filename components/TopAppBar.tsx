import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/AppLogo';

type TopAppBarProps = {
  /** Page context shown under the app logo (e.g. group name). */
  title?: string;
  onWalletPress?: () => void;
  onNotificationsPress?: () => void;
  hasNotifications?: boolean;
  showBack?: boolean;
  onBackPress?: () => void;
  /** Icon-only invite action on the right (replaces close when `showBack`). */
  onInvitePress?: () => void;
};

const SIDE_WIDTH = 88;

export function TopAppBar({
  title,
  onWalletPress,
  onNotificationsPress,
  hasNotifications = false,
  showBack = false,
  onBackPress,
  onInvitePress,
}: TopAppBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function handleBack() {
    if (onBackPress) {
      onBackPress();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  function goHome() {
    router.replace('/(tabs)');
  }

  return (
    <View
      className="border-b border-outline-variant bg-surface-container-lowest"
      style={{ paddingTop: insets.top }}
    >
      <View
        className={`min-h-16 flex-row items-center px-container-margin ${
          title ? 'py-1.5' : 'py-0'
        }`}
      >
        <View style={{ width: SIDE_WIDTH }}>
          {showBack ? (
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="flex-row items-center gap-0.5 rounded-lg py-1 pr-2 active:bg-surface-container-high"
              hitSlop={8}
            >
              <MaterialIcons name="arrow-back" size={22} color="#006c49" />
              <Text className="font-sans-semibold text-label-md text-primary">
                Back
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onWalletPress}
              accessibilityRole="button"
              accessibilityLabel="Wallet"
              className="rounded-full p-2 active:bg-surface-container-high"
              hitSlop={8}
            >
              <MaterialIcons name="account-balance-wallet" size={24} color="#3c4a42" />
            </Pressable>
          )}
        </View>

        <View className="min-w-0 flex-1 items-center justify-center px-1">
          <AppLogo onPress={goHome} />
          {title ? (
            <Text
              className="mt-0.5 max-w-full text-center font-sans-semibold text-label-md text-on-surface-variant"
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}
        </View>

        <View style={{ width: SIDE_WIDTH, alignItems: 'flex-end' }}>
          {hasNotifications ? (
            <Pressable
              onPress={onNotificationsPress}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              className="relative rounded-full p-2 active:bg-surface-container-high"
              hitSlop={8}
            >
              <MaterialIcons name="notifications-none" size={24} color="#3c4a42" />
              <View className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
            </Pressable>
          ) : onInvitePress ? (
            <Pressable
              onPress={onInvitePress}
              accessibilityRole="button"
              accessibilityLabel="Invite friends"
              className="rounded-full p-2 active:bg-surface-container-high"
              hitSlop={8}
            >
              <MaterialIcons name="person-add" size={24} color="#006c49" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
