/**
 * Vidya design tokens — "Midnight Aurora".
 * A single dark, immersive palette tuned for long, low-glare study sessions.
 */

export const colors = {
  bg: '#06060C',
  bgElevated: '#0C0D18',
  bgSunken: '#04040A',

  surface: 'rgba(255,255,255,0.05)',
  surfaceStrong: 'rgba(255,255,255,0.08)',
  surfacePressed: 'rgba(255,255,255,0.12)',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.16)',

  text: '#F3F3FA',
  textDim: '#A6A8C2',
  textFaint: '#6C6F8C',
  textInverse: '#0A0A14',

  primary: '#8B6CFF',
  primaryDeep: '#5B47E0',
  secondary: '#4F8BFF',
  mint: '#3FE0B8',
  amber: '#FFB84D',
  rose: '#FF6B95',
  danger: '#FF5D6C',
  success: '#3FE0A0',

  overlay: 'rgba(4,4,10,0.72)',
} as const;

export const gradients = {
  primary: ['#9B7BFF', '#5B6CFF'] as const,
  aurora: ['#8B6CFF', '#4F8BFF', '#3FE0B8'] as const,
  sunrise: ['#FFB84D', '#FF6B95'] as const,
  mint: ['#3FE0B8', '#4F8BFF'] as const,
  card: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.025)'] as const,
  fade: ['rgba(6,6,12,0)', 'rgba(6,6,12,1)'] as const,
};

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const fonts = {
  display: 'Sora_700Bold',
  displaySemi: 'Sora_600SemiBold',
  displayLight: 'Sora_300Light',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  h1: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  h2: { fontFamily: fonts.displaySemi, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  h3: { fontFamily: fonts.displaySemi, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14, letterSpacing: 0.8 },
  number: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.5 },
} as const;

/** Removes the browser focus ring on web text inputs (native ignores it). */
export const noOutline = { outlineStyle: 'none' } as unknown as Record<string, never>;

/** Spring presets shared by every animated element so motion feels coherent. */
export const motion = {
  snappy: { damping: 18, stiffness: 260, mass: 0.7 },
  gentle: { damping: 20, stiffness: 120, mass: 1 },
  bouncy: { damping: 11, stiffness: 180, mass: 0.8 },
} as const;
