import { Linking, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  APP_PUBLISHER,
  APP_PUBLISHER_URL,
  APP_VERSION_LABEL,
} from '@/constants/app';

export function AppFooter() {
  const insets = useSafeAreaInsets();

  function openPublisherSite() {
    void Linking.openURL(APP_PUBLISHER_URL);
  }

  return (
    <View
      className="border-t border-outline-variant/20 bg-surface-container-lowest/80 px-lg pt-sm backdrop-blur-sm"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <Text className="text-center font-sans text-caption text-on-surface-variant">
        A beta project of{' '}
        <Text
          className="font-sans-semibold text-caption text-primary underline"
          onPress={openPublisherSite}
          accessibilityRole="link"
          accessibilityLabel={`${APP_PUBLISHER} website`}
          accessibilityHint="Opens Mantra Digital in your browser"
        >
          {APP_PUBLISHER}
        </Text>
        {' · '}
        {APP_VERSION_LABEL}
      </Text>
    </View>
  );
}
