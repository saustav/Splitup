import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Alert, Image, Pressable, Text, View } from 'react-native';

import { platformShadow } from '@/lib/platformShadow';
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

  function handleChangePhoto() {
    if (onChangePhotoPress) {
      onChangePhotoPress();
      return;
    }
    Alert.alert(
      'Change photo',
      'Profile photo upload will be available in a future update.'
    );
  }

  return (
    <View
      className="items-center rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-lg"
      style={platformShadow('card')}
    >
      <View className="relative mb-md">
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="h-24 w-24 rounded-full border-4 border-primary-container"
            accessibilityLabel={`${name} profile photo`}
          />
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-full border-4 border-primary-container bg-primary-container">
            <Text className="font-sans-bold text-headline-md text-on-primary-container">
              {initials}
            </Text>
          </View>
        )}
        <Pressable
          onPress={handleChangePhoto}
          className="absolute bottom-0 right-0 rounded-full bg-primary p-2 active:opacity-90"
          style={platformShadow('fab')}
        >
          <MaterialIcons name="edit" size={18} color="#ffffff" />
        </Pressable>
      </View>

      <Text className="font-sans-semibold text-headline-sm text-on-surface">
        {name}
      </Text>
      <Text className="mb-md mt-xs font-sans text-body-md text-on-surface-variant">
        {email}
      </Text>

      <Pressable
        onPress={handleChangePhoto}
        className="rounded-full bg-primary/10 px-md py-sm active:bg-primary/20"
      >
        <Text className="font-sans-semibold text-label-md text-primary">
          Change Photo
        </Text>
      </Pressable>
    </View>
  );
}
