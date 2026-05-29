import type { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const GROUP_ICONS: ComponentProps<typeof MaterialIcons>['name'][] = [
  'terrain',
  'home',
  'restaurant',
  'flight',
  'shopping-cart',
  'sports-esports',
  'local-cafe',
  'directions-car',
];

export function groupIconForName(
  name: string
): ComponentProps<typeof MaterialIcons>['name'] {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GROUP_ICONS[Math.abs(hash) % GROUP_ICONS.length];
}

export function initialsFromLabel(label: string): string {
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}
