import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { uiColors } from '@/constants/theme';
import { initialsFromName } from '@/lib/profile';

type DashboardHeaderProps = {
  displayName: string;
  avatarUrl?: string | null;
  notificationCount?: number;
  onNotificationsPress?: () => void;
};

export function DashboardHeader({
  displayName,
  avatarUrl,
  notificationCount = 0,
  onNotificationsPress,
}: DashboardHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const firstName = displayName.split(/\s+/)[0] ?? displayName;
  const initials = initialsFromName(displayName);

  return (
    <View
      className="bg-background px-container-margin pb-2"
      style={{ paddingTop: insets.top + 12 }}
    >
      <View className="flex-row items-center justify-between">
        <View className="min-w-0 flex-1 flex-row items-center gap-sm">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              className="h-[34px] w-[34px] rounded-full"
              accessibilityLabel={`${displayName} profile photo`}
            />
          ) : (
            <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#9FE1CB]">
              <Text className="font-sans-medium text-label-md text-[#085041]">
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

        <View className="flex-row items-center gap-sm">
          {onNotificationsPress ? (
            <Pressable
              onPress={onNotificationsPress}
              accessibilityRole="button"
              accessibilityLabel={
                notificationCount > 0
                  ? `${notificationCount} notifications`
                  : 'Notifications'
              }
              className="relative h-[34px] w-[34px] items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-low active:opacity-80"
            >
              <MaterialIcons
                name="notifications-none"
                size={18}
                color={uiColors.muted}
              />
              {notificationCount > 0 ? (
                <View className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-error" />
              ) : null}
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.push('/(tabs)/account')}
            accessibilityRole="button"
            accessibilityLabel="Account settings"
            className="h-[34px] w-[34px] items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-low active:opacity-80"
          >
            <MaterialIcons name="settings" size={18} color={uiColors.muted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
