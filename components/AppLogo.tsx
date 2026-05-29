import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

import { APP_NAME } from '@/constants/app';

export function AppLogo({
  onPress,
  size = 'default',
}: {
  onPress?: () => void;
  size?: 'default' | 'compact';
}) {
  const iconSize = size === 'compact' ? 20 : 24;
  const textClass =
    size === 'compact'
      ? 'font-sans-bold text-body-md text-primary'
      : 'font-sans-bold text-headline-sm text-primary';

  const content = (
    <View className="flex-row items-center gap-sm">
      <MaterialIcons name="payments" size={iconSize} color="#006c49" />
      <Text className={textClass}>{APP_NAME}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${APP_NAME} home`}
        className="active:opacity-80"
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
