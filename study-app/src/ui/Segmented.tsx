import { StyleSheet, View } from 'react-native';

import { colors, fonts, radius } from '@/theme/tokens';

import { Tap } from './Pressable';
import { T } from './Text';

export function Segmented<V extends string>({ value, options, onChange }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void }) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Tap key={o.value} onPress={() => onChange(o.value)} style={[styles.item, on && styles.on]} accessibilityState={{ selected: on }}>
            <T style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: on ? colors.text : colors.textFaint }}>{o.label}</T>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  item: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  on: { backgroundColor: colors.surfacePressed },
});
