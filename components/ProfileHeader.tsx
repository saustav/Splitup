import { Image, Pressable, Text, View } from 'react-native';

import { initialsFromName } from '@/lib/profile';

export function ProfileHeader({
  name,
  email,
  avatarUrl,
  onChangePhotoPress,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  onChangePhotoPress?: () => void;
}) {
  const initials = initialsFromName(name);

  return (
    <View className="flex-row items-center gap-md rounded-card border border-outline-variant/40 bg-surface-container-low px-md py-md">
      <Pressable
        onPress={onChangePhotoPress}
        disabled={!onChangePhotoPress}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="h-14 w-14 rounded-full"
            accessibilityLabel={`${name} profile photo`}
          />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-full bg-brand-mint">
            <Text className="font-sans-semibold text-body-lg text-brand-deeper">
              {initials}
            </Text>
          </View>
        )}
      </Pressable>

      <View className="min-w-0 flex-1">
        <Text
          className="font-sans-medium text-body-lg text-on-surface"
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          className="mt-xs font-sans text-label-md text-on-surface-variant"
          numberOfLines={1}
        >
          {email}
        </Text>
      </View>
    </View>
  );
}
