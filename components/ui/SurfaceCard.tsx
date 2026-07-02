import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type SurfaceCardProps = {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
};

export function SurfaceCard({ children, onPress, className = '' }: SurfaceCardProps) {
  const baseClass =
    'rounded-card border border-outline-variant/40 bg-surface-container-low';

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={`${baseClass} active:opacity-90 ${className}`}
      >
        {children}
      </Pressable>
    );
  }

  return <View className={`${baseClass} ${className}`}>{children}</View>;
}

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View className="mb-stack-gap flex-row items-center justify-between">
      <Text className="font-sans-medium text-body-lg text-on-surface">{title}</Text>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text className="font-sans-medium text-label-md text-brand-primary">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
