import { Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/Buttons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { layout } from '@/constants/layout';

export default function BalancesScreen() {
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader variant="tab" title="Balances" />
      <View
        className="flex-1 justify-center px-container-margin"
        style={{ paddingBottom: layout.tabScrollBottom }}
      >
        <EmptyState
          title="Balances"
          message="A detailed breakdown of who owes whom across all groups is coming soon."
        />
      </View>
    </View>
  );
}
