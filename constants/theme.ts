export const colors = {
  brand: {
    /** Decorative accent — borders, tints. Do not use for small text on light surfaces. */
    primary: '#1D9E75',
    /** Buttons, links, icons on light backgrounds (AA+ with white / cream surfaces). */
    dark: '#0F6E56',
    light: '#EAF3DE',
    /** Text on light-green containers (AAA on brand.light). */
    deeper: '#085041',
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
    50: '#F1EFE8',
    /** Muted labels — WCAG AA on white/cream (was #888780 @ 3.6:1). */
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

/** Accessible UI colors for icons, spinners, placeholders (import in TSX). */
export const uiColors = {
  iconOnLight: colors.brand.dark,
  muted: colors.gray[400],
  onSurface: colors.gray[900],
} as const;
