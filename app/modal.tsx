import { StatusBar } from 'expo-status-bar';
import { Platform, Text, View } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';

export default function ModalScreen() {
  return (
    <View className="flex-1 bg-background">
      <Text className="font-sans-medium text-headline-sm text-on-surface">Modal</Text>
      <View className="my-lg h-px w-4/5 bg-outline-variant" />
      <EditScreenInfo path="app/modal.tsx" />
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}
