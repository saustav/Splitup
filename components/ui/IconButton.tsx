import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { layout } from '@/constants/layout';
import { uiColors } from '@/constants/theme';

type IconButtonProps = {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  badge?: boolean;
  badgeCount?: number;
};

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  badge = false,
  badgeCount = 0,
}: IconButtonProps) {
  const showBadge = badge || badgeCount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="relative items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-low active:opacity-80"
      style={{ width: layout.headerIconSize, height: layout.headerIconSize }}
    >
      <MaterialIcons name={icon} size={18} color={uiColors.muted} />
      {showBadge ? (
        <View className="absolute -right-xs -top-xs h-2 w-2 rounded-full bg-error" />
      ) : null}
    </Pressable>
  );
}
