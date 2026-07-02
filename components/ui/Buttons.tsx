import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  className = '',
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      className={`rounded-full bg-primary px-md py-sm active:opacity-80 disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text className="text-center font-sans-semibold text-body-md text-on-primary">
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function OutlineButton({
  label,
  onPress,
  disabled = false,
  className = '',
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className={`rounded-full border border-outline-variant bg-background px-md py-sm active:bg-surface-container-high disabled:opacity-50 ${className}`}
    >
      <Text className="text-center font-sans-semibold text-body-md text-primary">
        {label}
      </Text>
    </Pressable>
  );
}

type EmptyStateProps = {
  title: string;
  message: string;
  children?: ReactNode;
};

export function EmptyState({ title, message, children }: EmptyStateProps) {
  return (
    <View className="items-center rounded-card border border-dashed border-outline-variant bg-surface-container-low px-md py-12">
      <Text className="font-sans-medium text-body-lg text-on-surface">{title}</Text>
      <Text className="mt-2 px-6 text-center font-sans text-body-md text-on-surface-variant">
        {message}
      </Text>
      {children ? (
        <View className="mt-4 flex-row flex-wrap items-center justify-center gap-sm">
          {children}
        </View>
      ) : null}
    </View>
  );
}
