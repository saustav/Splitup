import { Platform, View } from 'react-native';

import { colors } from '@/constants/theme';

/**
 * Decorative login backdrop — soft brand gradient with organic blobs.
 * Uses style.pointerEvents so taps pass through to content above.
 */
export function LoginBackground({ topInset = 0 }: { topInset?: number }) {
  const heroHeight = 340 + topInset;

  return (
    <View
      className="absolute inset-0 overflow-hidden"
      style={{ pointerEvents: 'none' }}
    >
      {/* Base: warm cream → white wash */}
      <View
        className="absolute inset-0 bg-background"
        style={
          Platform.OS === 'web'
            ? ({
                backgroundImage: `linear-gradient(
                  180deg,
                  ${colors.brand.light} 0%,
                  ${colors.gray[50]} 38%,
                  #ffffff 72%,
                  ${colors.gray[50]} 100%
                )`,
              } as object)
            : undefined
        }
      />

      {/* Native: approximate gradient with stacked layers */}
      {Platform.OS !== 'web' ? (
        <>
          <View
            className="absolute left-0 right-0 bg-brand-light"
            style={{ top: 0, height: heroHeight * 0.55 }}
          />
          <View
            className="absolute left-0 right-0 bg-background"
            style={{ top: heroHeight * 0.35, height: heroHeight * 0.45, opacity: 0.85 }}
          />
          <View
            className="absolute bottom-0 left-0 right-0 bg-surface-container-lowest"
            style={{ height: '40%', opacity: 0.5 }}
          />
        </>
      ) : null}

      {/* Curved hero cap */}
      <View
        className="absolute bg-brand-light/70"
        style={{
          top: 0,
          left: -24,
          right: -24,
          height: heroHeight,
          borderBottomLeftRadius: 48,
          borderBottomRightRadius: 48,
        }}
      />

      {/* Soft highlight arc */}
      <View
        className="absolute rounded-full bg-brand-primary/10"
        style={{
          top: topInset + 20,
          right: -48,
          width: 220,
          height: 220,
        }}
      />
      <View
        className="absolute rounded-full bg-brand-dark/8"
        style={{
          top: topInset + 100,
          left: -36,
          width: 160,
          height: 160,
        }}
      />
      <View
        className="absolute rounded-full bg-brand-primary/6"
        style={{
          top: topInset + 200,
          right: 40,
          width: 96,
          height: 96,
        }}
      />

      {/* Lower ambient shapes */}
      <View
        className="absolute rounded-full bg-brand-light"
        style={{
          bottom: 100,
          left: -72,
          width: 200,
          height: 200,
          opacity: 0.45,
        }}
      />
      <View
        className="absolute rounded-full bg-brand-dark/5"
        style={{
          bottom: 160,
          right: -40,
          width: 140,
          height: 140,
        }}
      />

      {/* Subtle top-edge sheen */}
      <View
        className="absolute left-0 right-0 bg-surface-container-lowest/30"
        style={{ top: 0, height: 1 }}
      />
    </View>
  );
}
