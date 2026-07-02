import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

type DashboardQuickActionsProps = {
  onAddExpense: () => void;
  onSettleUp: () => void;
};

function QuickActionButton({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center gap-sm rounded-[14px] border border-outline-variant/40 bg-surface-container-low p-[14px] active:opacity-90"
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: iconBg }}
      >
        <MaterialIcons name={icon} size={18} color={iconColor} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-sans-medium text-label-md text-on-surface">
          {title}
        </Text>
        <Text className="mt-px font-sans text-label-md text-on-surface-variant">
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

export function DashboardQuickActions({
  onAddExpense,
  onSettleUp,
}: DashboardQuickActionsProps) {
  return (
    <View>
      <Text className="mb-stack-gap font-sans-medium text-body-lg text-on-surface">
        Quick actions
      </Text>
      <View className="flex-row gap-[10px]">
        <QuickActionButton
          icon="add"
          iconBg="#E1F5EE"
          iconColor="#0F6E56"
          title="Add expense"
          subtitle="Split a new bill"
          onPress={onAddExpense}
        />
        <QuickActionButton
          icon="payments"
          iconBg="#EEEDFE"
          iconColor="#534AB7"
          title="Settle up"
          subtitle="Pay what you owe"
          onPress={onSettleUp}
        />
      </View>
    </View>
  );
}
