import { ActivityIndicator, Text, View } from 'react-native';

import { uiColors } from '@/constants/theme';

export function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color={uiColors.iconOnLight} />
      <Text className="mt-4 text-on-surface-variant">
        {message}
      </Text>
    </View>
  );
}
