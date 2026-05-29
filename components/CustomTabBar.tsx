import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { platformShadow } from '@/lib/platformShadow';

type TabConfig = {
  route: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  filledIcon?: keyof typeof MaterialIcons.glyphMap;
};

const TABS: TabConfig[] = [
  { route: 'index', label: 'Groups', icon: 'group', filledIcon: 'group' },
  { route: 'balances', label: 'Balances', icon: 'account-balance' },
  { route: 'add', label: '', icon: 'add' },
  { route: 'activity', label: 'Activity', icon: 'history' },
  { route: 'account', label: 'Account', icon: 'person-outline', filledIcon: 'person' },
];

type TabRoute = { key: string; name: string };

export function CustomTabBar({
  state,
  descriptors,
  navigation,
  onAddPress,
}: {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, { options: { tabBarAccessibilityLabel?: string } }>;
  navigation: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
  onAddPress?: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-end justify-around rounded-t-xl bg-surface-container-lowest px-2 pt-3"
      style={{
        paddingBottom: Math.max(insets.bottom, 12),
        ...platformShadow('tabBarUp'),
      }}
    >
      {TABS.map((tab) => {
        if (tab.route === 'add') {
          return (
            <Pressable
              key="add"
              onPress={onAddPress}
              accessibilityRole="button"
              accessibilityLabel="Add expense or group"
              className="-mt-4 h-14 w-14 items-center justify-center rounded-full border-4 border-surface-container-lowest bg-primary active:opacity-80"
              style={platformShadow('tabBar')}
            >
              <MaterialIcons name="add" size={28} color={colors['on-primary']} />
            </Pressable>
          );
        }

        const routeIndex = state.routes.findIndex(
          (route: TabRoute) => route.name === tab.route
        );
        if (routeIndex === -1) return null;

        const isFocused = state.index === routeIndex;
        const route = state.routes[routeIndex];
        const { options } = descriptors[route.key];

        function onPress() {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        const iconName =
          isFocused && tab.filledIcon ? tab.filledIcon : tab.icon;

        return (
          <Pressable
            key={tab.route}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            className={`items-center justify-center px-3 py-1 active:opacity-80 ${
              isFocused ? 'rounded-full bg-secondary-container' : ''
            }`}
          >
            <MaterialIcons
              name={iconName}
              size={24}
              color={
                isFocused
                  ? colors['on-secondary-container']
                  : colors['on-surface-variant']
              }
            />
            {tab.label ? (
              <Text
                className={`mt-1 font-sans-semibold text-label-md ${
                  isFocused
                    ? 'text-on-secondary-container'
                    : 'text-on-surface-variant'
                }`}
              >
                {tab.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
