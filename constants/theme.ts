export const colors = {
  brand: {
    /** Decorative accent — borders, tints. */
    primary: '#1D9E75',
    /** Buttons, links, icons, hero cards, FAB. */
    dark: '#0F6E56',
    light: '#EAF3DE',
    /** Avatar backgrounds, positive accent tints. */
    mint: '#9FE1CB',
    /** Text on light-green containers. */
    deeper: '#085041',
  },
  owe: {
    default: '#D85A30',
    light: '#F5C4B3',
  },
  owed: {
    default: '#1D9E75',
    light: '#9FE1CB',
  },
  accent: {
    purple: '#534AB7',
    purpleLight: '#EEEDFE',
  },
  red: {
    default: '#A32D2D',
    light: '#FCEBEB',
  },
  blue: {
    default: '#185FA5',
    light: '#E6F1FB',
  },
  amber: {
    default: '#854F0B',
    light: '#FAEEDA',
  },
  gray: {
    50: '#F7F6F3',
    100: '#EEEDEA',
    400: '#54534D',
    900: '#2C2C2A',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  card: 14,
  hero: 20,
  pill: 20,
  full: 9999,
};

export const fontSize = {
  display: 28,
  h1: 22,
  h2: 18,
  h3: 16,
  body: 14,
  small: 13,
  caption: 12,
};

export const duration = {
  fast: 150,
  standard: 250,
  complex: 350,
};

/** Semantic surface tokens for inline styles (RN Web may not re-resolve CSS vars on toggle). */
export const semanticSurfaces = {
  light: {
    background: '#F7F6F3',
    containerLow: '#FFFFFF',
    containerHigh: '#E6E5E2',
    outlineVariant: 'rgba(220, 219, 216, 0.4)',
    onSurfaceVariant: '#54534D',
  },
  dark: {
    background: '#121212',
    containerLow: '#1E1E1E',
    containerHigh: '#303030',
    outlineVariant: 'rgba(55, 55, 55, 0.4)',
    onSurfaceVariant: '#A8A69E',
  },
} as const;

/** Accessible UI colors for icons, spinners, placeholders (import in TSX). */
export const uiColors = {
  iconOnLight: colors.brand.dark,
  iconOnDark: colors.brand.light,
  muted: colors.gray[400],
  onSurface: colors.gray[900],
  error: colors.red.default,
  owe: colors.owe.default,
  owed: colors.owed.default,
  hero: colors.brand.dark,
  fab: colors.brand.dark,
} as const;
