import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

import type { PaymentMethod } from '@/lib/profile';
import { platformShadow } from '@/lib/platformShadow';

export function PaymentMethodRow({
  method,
  onDelete,
}: {
  method: PaymentMethod;
  onDelete: () => void;
}) {
  const isBank = method.type === 'bank';

  return (
    <View
      className="flex-row items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md"
      style={platformShadow('card')}
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-md">
        <View
          className={`h-10 w-10 items-center justify-center rounded-lg ${
            isBank
              ? 'bg-secondary-container'
              : 'bg-primary-container'
          }`}
        >
          <MaterialIcons
            name={isBank ? 'account-balance' : 'account-balance-wallet'}
            size={22}
            color={isBank ? '#2b6954' : '#00422b'}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-sans-semibold text-body-md text-on-surface">
            {method.name}
          </Text>
          <Text className="font-sans text-label-md text-on-surface-variant">
            {method.masked}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onDelete}
        className="rounded p-xs active:opacity-70"
        accessibilityLabel={`Remove ${method.name}`}
      >
        <MaterialIcons name="delete-outline" size={22} color="#6c7a71" />
      </Pressable>
    </View>
  );
}
