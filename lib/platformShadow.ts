import { Platform, type ViewStyle } from 'react-native';

type ShadowPreset = 'card' | 'fab' | 'tabBar' | 'tabBarUp';

const PRESETS: Record<
  ShadowPreset,
  { web: string; native: ViewStyle }
> = {
  card: {
    web: '0 4px 12px rgba(0, 0, 0, 0.05)',
    native: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
  },
  fab: {
    web: '0 4px 8px rgba(0, 0, 0, 0.15)',
    native: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
  },
  tabBar: {
    web: '0 4px 8px rgba(0, 0, 0, 0.15)',
    native: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
  },
  tabBarUp: {
    web: '0 -4px 12px rgba(0, 0, 0, 0.05)',
    native: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 8,
    },
  },
};

/** Card / panel shadow. Uses boxShadow on web to avoid LogBox deprecation noise. */
export function platformShadow(preset: ShadowPreset): ViewStyle {
  const presetStyle = PRESETS[preset];
  if (Platform.OS === 'web') {
    return { boxShadow: presetStyle.web } as ViewStyle;
  }
  return presetStyle.native;
}
