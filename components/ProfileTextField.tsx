import { Text, TextInput, View } from 'react-native';

import { uiColors } from '@/constants/theme';

export function ProfileTextField({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  keyboardType = 'default',
  editable = true,
  autoCapitalize = 'words',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  editable?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences';
}) {
  return (
    <View className="gap-xs">
      <Text className="ml-1 font-sans-semibold text-label-md text-on-surface-variant">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={uiColors.muted}
        keyboardType={keyboardType}
        editable={editable}
        autoCapitalize={autoCapitalize}
        className="h-12 rounded-lg border border-outline-variant bg-background px-md font-sans text-body-md text-on-surface"
      />
    </View>
  );
}
