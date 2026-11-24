import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, gradients, radius, space } from '@/theme/tokens';

import { Icon } from './Icon';
import { Tap } from './Pressable';
import { T } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  size = 'lg',
  disabled,
  loading,
  style,
  colorsOverride,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: string;
  iconRight?: string;
  size?: 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  colorsOverride?: readonly [string, string, ...string[]];
}) {
  const h = size === 'lg' ? 56 : 44;
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? colors.danger : colors.text;
  const content = (
    <View style={[styles.row, { height: h, paddingHorizontal: size === 'lg' ? space.xxl : space.lg }]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={size === 'lg' ? 20 : 17} color={fg} />}
          <T style={{ fontFamily: fonts.bodySemi, fontSize: size === 'lg' ? 16 : 14, color: fg }}>{label}</T>
          {iconRight && <Icon name={iconRight} size={size === 'lg' ? 20 : 17} color={fg} />}
        </>
      )}
    </View>
  );

  return (
    <Tap
      onPress={disabled || loading ? undefined : onPress}
      feedback={variant === 'primary' ? 'soft' : 'tap'}
      accessibilityState={{ disabled: !!disabled }}
      style={[{ opacity: disabled ? 0.45 : 1, borderRadius: radius.pill }, style]}>
      {variant === 'primary' ? (
        <View style={styles.primaryShadow}>
          <LinearGradient
            colors={colorsOverride ?? [...gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: radius.pill }}>
            {content}
          </LinearGradient>
        </View>
      ) : (
        <View
          style={[
            styles.base,
            variant === 'secondary' && styles.secondary,
            variant === 'danger' && styles.danger,
          ]}>
          {content}
        </View>
      )}
    </Tap>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  base: { borderRadius: radius.pill },
  secondary: { backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: 'rgba(255,93,108,0.1)', borderWidth: 1, borderColor: 'rgba(255,93,108,0.3)' },
  primaryShadow: {
    borderRadius: radius.pill,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
