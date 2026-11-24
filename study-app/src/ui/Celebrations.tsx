import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore, type Celebration } from '@/store';
import { colors, gradients, radius, space } from '@/theme/tokens';

import { haptic } from './haptics';
import { Icon } from './Icon';
import { T } from './Text';

function Toast({ c }: { c: Celebration }) {
  const dismiss = useStore((s) => s.dismissCelebration);
  useEffect(() => {
    if (c.kind !== 'xp') haptic.success();
    const t = setTimeout(() => dismiss(c.id), c.kind === 'xp' ? 1800 : 3600);
    return () => clearTimeout(t);
  }, [c, dismiss]);

  const big = c.kind !== 'xp';
  return (
    <Animated.View entering={FadeInUp.springify().damping(16)} exiting={FadeOutUp.duration(220)} layout={LinearTransition} style={[styles.toast, big && styles.big]}>
      {big && (
        <LinearGradient colors={c.kind === 'level' ? [...gradients.aurora] : [...gradients.sunrise]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius.xl, opacity: 0.9 }]} />
      )}
      <View style={[styles.icon, big && { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
        <Icon name={c.icon ?? (c.kind === 'xp' ? 'flash' : 'trophy')} size={big ? 22 : 16} color={big ? '#fff' : colors.amber} />
      </View>
      <View style={{ flexShrink: 1 }}>
        {big && <T variant="micro" color="rgba(255,255,255,0.85)">{c.kind === 'level' ? 'Level up' : 'Achievement unlocked'}</T>}
        <T variant={big ? 'h3' : 'bodyStrong'} color="#fff">{c.title}</T>
        {c.subtitle && <T variant="small" color={big ? 'rgba(255,255,255,0.9)' : colors.textDim} numberOfLines={1}>{c.subtitle}</T>}
      </View>
    </Animated.View>
  );
}

/** Global overlay that turns XP, level-ups and achievements into moments. */
export function Celebrations() {
  const items = useStore((s) => s.celebrations);
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + space.sm }]}>
      {items.map((c) => (
        <Toast key={c.id} c={c} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: space.sm, zIndex: 100 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingLeft: space.sm,
    paddingRight: space.lg,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(20,20,36,0.96)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    maxWidth: 360,
  },
  big: { borderRadius: radius.xl, padding: space.lg, paddingRight: space.xxl, borderWidth: 0 },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,184,77,0.15)' },
});
