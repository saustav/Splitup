import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { uiColors } from '@/constants/theme';
import { platformShadow } from '@/lib/platformShadow';

type TabConfig = {
  route: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  filledIcon?: keyof typeof MaterialIcons.glyphMap;
};

const TABS: TabConfig[] = [
  {
    route: 'index',
    label: 'Home',
    icon: 'dashboard',
    filledIcon: 'dashboard',
  },
  { route: 'groups', label: 'Groups', icon: 'groups', filledIcon: 'groups' },
  { route: 'add', label: '', icon: 'add' },
  { route: 'activity', label: 'Activity', icon: 'show-chart' },
  {
    route: 'account',
    label: 'Account',
    icon: 'person-outline',
    filledIcon: 'person',
  },
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
      className="px-container-margin"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View
        className="flex-row items-end justify-around rounded-[20px] border border-outline-variant/40 bg-surface-container-low px-1.5 py-1.5"
        style={platformShadow('tabBarUp')}
      >
        {TABS.map((tab) => {
          if (tab.route === 'add') {
            return (
              <Pressable
                key="add"
                onPress={onAddPress}
                accessibilityRole="button"
                accessibilityLabel="Add expense or group"
                className="mx-1 -mt-3 h-11 w-11 items-center justify-center rounded-full bg-[#0F6E56] active:opacity-80"
                style={platformShadow('tabBar')}
              >
                <MaterialIcons name="add" size={24} color="#ffffff" />
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
              className={`min-w-[56px] flex-1 items-center justify-center rounded-[14px] px-2 py-2 active:opacity-80 ${
                isFocused ? 'bg-surface-container-high' : ''
              }`}
            >
              <MaterialIcons
                name={iconName}
                size={20}
                color={isFocused ? '#0F6E56' : uiColors.muted}
              />
              {tab.label ? (
                <Text
                  className={`mt-0.5 font-sans text-[10px] ${
                    isFocused
                      ? 'font-sans-medium text-[#0F6E56]'
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
    </View>
  );
}
