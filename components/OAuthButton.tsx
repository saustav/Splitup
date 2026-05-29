import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { ComponentProps } from 'react';
import { Pressable, Text } from 'react-native';

type Provider = 'google' | 'apple';

const CONFIG: Record<
  Provider,
  { label: string; icon: ComponentProps<typeof FontAwesome>['name']; bg: string }
> = {
  google: {
    label: 'Continue with Google',
    icon: 'google',
    bg: 'bg-white border border-neutral-300',
  },
  apple: {
    label: 'Continue with Apple',
    icon: 'apple',
    bg: 'bg-neutral-900',
  },
};

export function OAuthButton({
  provider,
  onPress,
  disabled,
}: {
  provider: Provider;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { label, icon, bg } = CONFIG[provider];
  const isApple = provider === 'apple';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-center rounded-xl px-4 py-3.5 ${bg} ${disabled ? 'opacity-50' : 'active:opacity-80'}`}
    >
      <FontAwesome
        name={icon}
        size={20}
        color={isApple ? '#fff' : '#4285F4'}
        style={{ marginRight: 12 }}
      />
      <Text
        className={`text-base font-semibold ${isApple ? 'text-white' : 'text-neutral-900'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
