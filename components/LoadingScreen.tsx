import { ActivityIndicator, Text, View } from 'react-native';

export function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
      <ActivityIndicator size="large" color="#16a34a" />
      <Text className="mt-4 text-neutral-600 dark:text-neutral-400">
        {message}
      </Text>
    </View>
  );
}
