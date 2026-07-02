import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '@/constants/layout';
import { colors, semanticSurfaces, uiColors } from '@/constants/theme';
import { platformShadow } from '@/lib/platformShadow';
import { useThemeStore } from '@/stores/themeStore';

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
  const themeMode = useThemeStore((s) => s.mode);
  const isDark = themeMode === 'dark';
  const surfaces = isDark ? semanticSurfaces.dark : semanticSurfaces.light;
  const activeAccent = isDark ? colors.brand.primary : colors.brand.dark;

  return (
    <View
      className="px-container-margin"
      style={{
        paddingBottom: Math.max(insets.bottom, 8),
        backgroundColor: surfaces.background,
      }}
    >
      <View
        className="w-full self-center"
        style={{ maxWidth: layout.contentMaxWidth }}
      >
        <View
          className="flex-row items-center justify-around rounded-2xl border px-0.5 py-0.5"
          style={{
            ...platformShadow('tabBarUp'),
            backgroundColor: surfaces.containerLow,
            borderColor: surfaces.outlineVariant,
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
                  className="mx-0.5 -mt-2 h-10 w-10 items-center justify-center rounded-full bg-brand-dark active:opacity-85"
                  style={platformShadow('fab')}
                >
                  <MaterialIcons name="add" size={22} color="#ffffff" />
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
                className="min-w-[48px] flex-1 items-center justify-center rounded-xl px-1 py-1.5 active:opacity-80"
                style={
                  isFocused
                    ? { backgroundColor: surfaces.containerHigh }
                    : undefined
                }
              >
                <MaterialIcons
                  name={iconName}
                  size={18}
                  color={
                    isFocused
                      ? activeAccent
                      : isDark
                        ? surfaces.onSurfaceVariant
                        : uiColors.muted
                  }
                />
                {tab.label ? (
                  <Text
                    className={`mt-px font-sans text-[9px] leading-3 ${
                      isFocused ? 'font-sans-medium' : ''
                    }`}
                    style={{
                      color: isFocused
                        ? activeAccent
                        : surfaces.onSurfaceVariant,
                    }}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
