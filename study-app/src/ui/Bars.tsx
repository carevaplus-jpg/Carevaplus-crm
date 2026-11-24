import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { colors, space } from '@/theme/tokens';

import { T } from './Text';

/** Minimal vertical bar chart: one series, labelled days, highlighted current bar. */
export function Bars({ data, height = 120, highlight, color = colors.primary, unit = 'm' }: {
  data: { label: string; value: number }[];
  height?: number;
  highlight?: number;
  color?: string;
  unit?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, height: height + 36 }}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.value / max) * height);
        const on = i === highlight;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }} accessibilityLabel={`${d.label}: ${d.value} ${unit}`}>
            {d.value > 0 && <T variant="micro" color={on ? colors.text : colors.textFaint} style={{ letterSpacing: 0 }}>{Math.round(d.value)}</T>}
            <View style={{ width: '100%', maxWidth: 28, height: h, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' }}>
              {d.value > 0 && (
                <LinearGradient colors={on ? [color, colors.secondary] : [color + '99', color + '33']} style={{ flex: 1 }} />
              )}
            </View>
            <T variant="micro" color={on ? colors.text : colors.textFaint} style={{ letterSpacing: 0.4 }}>{d.label}</T>
          </View>
        );
      })}
    </View>
  );
}
