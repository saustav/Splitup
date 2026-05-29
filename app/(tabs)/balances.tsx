import { Text, View } from 'react-native';

import { TopAppBar } from '@/components/TopAppBar';

export default function BalancesScreen() {
  return (
    <View className="flex-1 bg-background">
      <TopAppBar />
      <View className="flex-1 items-center justify-center px-container-margin">
        <Text className="font-sans-semibold text-headline-sm text-on-surface">
          Balances
        </Text>
        <Text className="mt-2 text-center font-sans text-body-md text-on-surface-variant">
          A detailed breakdown of who owes whom across all groups is coming soon.
        </Text>
      </View>
    </View>
  );
}
