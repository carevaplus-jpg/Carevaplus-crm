import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

import { haptic } from './haptics';

const APressable = Animated.createAnimatedComponent(Pressable);

/** Pressable that physically "gives" under the finger, with optional haptic tick. */
export function Tap({
  children,
  style,
  scaleTo = 0.965,
  feedback = 'tap',
  onPress,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  feedback?: 'tap' | 'soft' | 'firm' | 'none';
}) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...rest}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      onPressIn={(e) => {
        s.set(withSpring(scaleTo, motion.snappy));
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.set(withSpring(1, motion.bouncy));
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (feedback !== 'none') haptic[feedback]();
        onPress?.(e);
      }}
      style={[style, a]}>
      {children}
    </APressable>
  );
}
