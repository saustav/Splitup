import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Switch, Text, View } from 'react-native';

import { uiColors } from '@/constants/theme';

type ProfileToggleRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  showDivider?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
};

export function ProfileToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  showDivider = true,
  icon,
}: ProfileToggleRowProps) {
  return (
    <View
      className={`flex-row items-center justify-between p-md ${
        showDivider ? 'border-b border-outline-variant/30' : ''
      }`}
    >
      <View className="mr-md min-w-0 flex-1 flex-row items-center gap-md">
        {icon ? (
          <MaterialIcons name={icon} size={22} color={uiColors.iconOnLight} />
        ) : null}
        <View className="min-w-0 flex-1">
          <Text className="font-sans-medium text-body-md text-on-surface">{title}</Text>
          {subtitle ? (
            <Text className="mt-xs font-sans text-label-md text-on-surface-variant">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#dce2f3', true: uiColors.iconOnLight }}
        thumbColor="#ffffff"
      />
    </View>
  );
}
