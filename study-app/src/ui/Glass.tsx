import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, gradients, radius, space } from '@/theme/tokens';

import { Tap } from './Pressable';

/** Frosted glass surface: layered gradient, hairline border, optional colored glow. */
export function Glass({
  children,
  style,
  padded = true,
  glow,
  tint,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  glow?: string;
  tint?: string;
  onPress?: () => void;
}) {
  const body = (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        glow && { shadowColor: glow, shadowOpacity: 0.55, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
        style,
      ]}>
      <LinearGradient
        colors={tint ? [tint, 'rgba(255,255,255,0.02)'] : [...gradients.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]}
      />
      {children}
    </View>
  );
  if (!onPress) return body;
  const flat = StyleSheet.flatten(style) ?? {};
  const outer: ViewStyle = {};
  for (const k of LAYOUT_KEYS) if (flat[k] !== undefined) (outer as Record<string, unknown>)[k] = flat[k];
  return (
    <Tap onPress={onPress} style={outer}>
      {body}
    </Tap>
  );
}

const LAYOUT_KEYS = ['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'width', 'minWidth', 'maxWidth', 'alignSelf'] as const;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: colors.border,
    backgroundColor: 'rgba(16,17,32,0.55)',
    overflow: 'visible',
  },
  padded: { padding: space.lg },
});
