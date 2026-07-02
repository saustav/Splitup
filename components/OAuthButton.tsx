import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { uiColors } from '@/constants/theme';
import { platformShadow } from '@/lib/platformShadow';

type Provider = 'google' | 'apple';
type BrandIcon = ComponentProps<typeof FontAwesome5>['name'];

const CONFIG: Record<
  Provider,
  {
    label: string;
    icon: BrandIcon;
    containerClass: string;
    iconWrapClass: string;
    labelClass: string;
    iconColor: string;
    spinnerColor: string;
  }
> = {
  google: {
    label: 'Continue with Google',
    icon: 'google',
    containerClass:
      'border border-outline-variant/40 bg-surface-container-low active:opacity-90',
    iconWrapClass: 'bg-surface-container-lowest border border-outline-variant/40',
    labelClass: 'text-on-surface',
    iconColor: '#4285F4',
    spinnerColor: uiColors.iconOnLight,
  },
  apple: {
    label: 'Continue with Apple',
    icon: 'apple',
    containerClass: 'bg-brand-deeper active:opacity-90',
    iconWrapClass: 'bg-white/15',
    labelClass: 'text-on-primary',
    iconColor: '#ffffff',
    spinnerColor: '#ffffff',
  },
};

export function OAuthButton({
  provider,
  onPress,
  disabled,
  loading,
}: {
  provider: Provider;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const config = CONFIG[provider];
  const isBusy = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isBusy}
      accessibilityRole="button"
      accessibilityState={{ disabled: isBusy, busy: loading }}
      className={`relative min-h-[44px] justify-center rounded-card px-md py-sm ${config.containerClass} ${
        isBusy ? 'opacity-60' : ''
      }`}
      style={platformShadow('card')}
    >
      <View className="absolute bottom-0 left-md top-0 justify-center">
        <View
          className={`h-8 w-8 items-center justify-center rounded-md ${config.iconWrapClass}`}
        >
          {loading ? (
            <ActivityIndicator size="small" color={config.spinnerColor} />
          ) : (
            <FontAwesome5 name={config.icon} brand size={16} color={config.iconColor} />
          )}
        </View>
      </View>
      <Text
        className={`text-center font-sans-semibold text-label-md ${config.labelClass}`}
      >
        {loading ? 'Signing in…' : config.label}
      </Text>
    </Pressable>
  );
}
