import { LinearGradient } from 'expo-linear-gradient';

import { fonts } from '@/theme/tokens';

import { T } from './Text';

const hsl = (h: number, s: number, l: number) => `hsl(${Math.round(h) % 360}, ${s}%, ${l}%)`;

export function Avatar({ name, hue = 260, size = 44 }: { name: string; hue?: number; size?: number }) {
  return (
    <LinearGradient
      colors={[hsl(hue, 85, 66), hsl(hue + 50, 80, 52)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <T style={{ fontFamily: fonts.display, fontSize: size * 0.42, color: '#fff' }}>{(name.trim()[0] ?? 'V').toUpperCase()}</T>
    </LinearGradient>
  );
}
