import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Text, View } from 'react-native';

import type { AutosaveStatus } from '@/hooks/useAutosaveStatus';

export function AutosaveIndicator({ status }: { status: AutosaveStatus }) {
  if (status === 'idle') return null;

  return (
    <View className="flex-row items-center gap-xs">
      {status === 'saving' ? (
        <>
          <ActivityIndicator size="small" color="#1D9E75" />
          <Text className="font-sans text-label-md text-on-surface-variant">
            Saving…
          </Text>
        </>
      ) : (
        <>
          <MaterialIcons name="check-circle" size={16} color="#1D9E75" />
          <Text className="font-sans-semibold text-label-md text-primary">
            Saved
          </Text>
        </>
      )}
    </View>
  );
}
