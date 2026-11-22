import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '@/theme/tokens';

const DEFAULT = ['#6B4CFF', '#2F6BFF', '#18B79A'];

function Blob({ color, size, x, y, t, dx, dy, id, opacity }: {
  color: string; size: number; x: number; y: number; t: SharedValue<number>; dx: number; dy: number; id: string; opacity: number;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x + Math.sin(t.value * Math.PI * 2) * dx },
      { translateY: y + Math.cos(t.value * Math.PI * 2) * dy },
      { scale: 1 + Math.sin(t.value * Math.PI * 2) * 0.08 },
    ],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', width: size, height: size, left: -size / 2, top: -size / 2, opacity }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.55} />
            <Stop offset="0.45" stopColor={color} stopOpacity={0.18} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** Slow-drifting aurora light field behind every screen. */
export function Aurora({ palette = DEFAULT, intensity = 1 }: { palette?: string[]; intensity?: number }) {
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: 22000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [t]);
  const big = Math.max(width, 420) * 1.3;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, overflow: 'hidden' }]}>
      <Blob id="a1" color={palette[0]} size={big} x={width * 0.1} y={height * 0.02} t={t} dx={40} dy={30} opacity={0.9 * intensity} />
      <Blob id="a2" color={palette[1]} size={big * 0.9} x={width * 0.95} y={height * 0.3} t={t} dx={-50} dy={40} opacity={0.7 * intensity} />
      <Blob id="a3" color={palette[2] ?? palette[0]} size={big * 0.8} x={width * 0.3} y={height * 0.85} t={t} dx={30} dy={-40} opacity={0.45 * intensity} />
    </View>
  );
}
