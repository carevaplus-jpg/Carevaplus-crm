import { StyleSheet, View } from 'react-native';

import { addDays, daysUntil, fullDate, weekdayShort } from '@/lib/dates';
import { colors, radius, space } from '@/theme/tokens';

import { Tap } from './Pressable';
import { T } from './Text';

/** Dependency-free date picker: big readable date with day/week steppers. */
export function DateStepper({ value, onChange, min }: { value: Date; onChange: (d: Date) => void; min?: Date }) {
  const step = (n: number) => {
    const next = addDays(value, n);
    if (min && next < min) return;
    onChange(next);
  };
  const left = daysUntil(value);
  return (
    <View style={styles.wrap}>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <T variant="micro" color={colors.textFaint}>{weekdayShort(value)}</T>
        <T variant="h1">{fullDate(value)}</T>
        <T variant="small" color={colors.textDim}>{left > 0 ? `${left} days from today` : left === 0 ? 'Today' : `${-left} days ago`}</T>
      </View>
      <View style={styles.row}>
        {[-7, -1, 1, 7].map((n) => (
          <Tap key={n} onPress={() => step(n)} style={styles.btn} accessibilityLabel={`${n > 0 ? 'Add' : 'Subtract'} ${Math.abs(n)} days`}>
            <T variant="bodyStrong" color={colors.textDim}>{`${n > 0 ? '+' : '−'}1${Math.abs(n) === 7 ? 'w' : 'd'}`}</T>
          </Tap>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', gap: space.sm },
  btn: { flex: 1, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
});
