import { StyleSheet, View } from 'react-native';

import { colors, fonts, radius, space } from '@/theme/tokens';

import { Icon } from './Icon';
import { Tap } from './Pressable';
import { T } from './Text';

export function Chip({
  label,
  selected,
  onPress,
  color = colors.primary,
  icon,
  small,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  icon?: string;
  small?: boolean;
}) {
  const body = (
    <View
      style={[
        styles.chip,
        small && styles.small,
        selected && { backgroundColor: color + '26', borderColor: color + 'AA' },
      ]}>
      {icon && <Icon name={icon} size={small ? 13 : 15} color={selected ? color : colors.textDim} />}
      <T style={{ fontFamily: fonts.bodySemi, fontSize: small ? 12 : 14, color: selected ? colors.text : colors.textDim }}>{label}</T>
    </View>
  );
  return onPress ? <Tap onPress={onPress}>{body}</Tap> : body;
}

export function Pill({ label, color = colors.textDim, bg }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg ?? color + '1F' }]}>
      <T style={{ fontFamily: fonts.bodySemi, fontSize: 11, color, letterSpacing: 0.3 }}>{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.lg,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  small: { height: 30, paddingHorizontal: space.md },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
});
