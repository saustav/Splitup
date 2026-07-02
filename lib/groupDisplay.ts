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

const GROUP_EMOJIS = ['🏔️', '🏠', '🍜', '✈️', '🛒', '🎮', '☕', '🚗'];
const GROUP_ICON_BACKGROUNDS = [
  '#E1F5EE',
  '#EEEDFE',
  '#FAEEDA',
  '#E1F5EE',
  '#FAEEDA',
  '#EEEDFE',
  '#FAEEDA',
  '#E1F5EE',
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function groupIconForName(
  name: string
): ComponentProps<typeof MaterialIcons>['name'] {
  return GROUP_ICONS[hashName(name) % GROUP_ICONS.length];
}

export function groupEmojiForName(name: string): string {
  return GROUP_EMOJIS[hashName(name) % GROUP_EMOJIS.length];
}

export function groupIconBackgroundForName(name: string): string {
  return GROUP_ICON_BACKGROUNDS[hashName(name) % GROUP_ICON_BACKGROUNDS.length];
}

export function formatGroupLastActive(
  lastActiveAt: string | null,
  settled: boolean
): string {
  if (settled) return 'Settled up';
  if (!lastActiveAt) return 'No activity yet';

  const diffMs = Date.now() - new Date(lastActiveAt).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) return 'Last active today';
  if (days === 1) return 'Last active yesterday';
  return `Last active ${days}d ago`;
}

export function initialsFromLabel(label: string): string {
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}
