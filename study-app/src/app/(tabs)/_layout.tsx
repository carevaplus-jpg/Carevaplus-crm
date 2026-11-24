import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUi } from '@/store/ui';
import { colors, fonts, gradients, motion, radius, space } from '@/theme/tokens';
import { Icon, Tap, T } from '@/ui';

const TABS: Record<string, { label: string; icon: string; active: string }> = {
  index: { label: 'Today', icon: 'sunny-outline', active: 'sunny' },
  learn: { label: 'Learn', icon: 'library-outline', active: 'library' },
  focus: { label: 'Focus', icon: 'timer-outline', active: 'timer' },
  tutor: { label: 'Tutor', icon: 'sparkles-outline', active: 'sparkles' },
  me: { label: 'You', icon: 'person-circle-outline', active: 'person-circle' },
};

function TabItem({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const t = TABS[name];
  const dot = useAnimatedStyle(() => ({
    opacity: withSpring(focused ? 1 : 0, motion.snappy),
    transform: [{ scale: withSpring(focused ? 1 : 0.4, motion.bouncy) }],
  }));
  if (name === 'focus') {
    return (
      <Tap onPress={onPress} feedback="firm" accessibilityLabel="Focus" accessibilityState={{ selected: focused }} style={styles.item}>
        <View style={styles.orbGlow}>
          <LinearGradient colors={[...gradients.aurora]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.orb}>
            <Icon name={focused ? 'timer' : 'timer-outline'} size={24} color="#fff" />
          </LinearGradient>
        </View>
      </Tap>
    );
  }
  return (
    <Tap onPress={onPress} accessibilityLabel={t.label} accessibilityState={{ selected: focused }} style={styles.item}>
      <Icon name={focused ? t.active : t.icon} size={22} color={focused ? colors.text : colors.textFaint} />
      <T style={{ fontFamily: fonts.bodySemi, fontSize: 10.5, color: focused ? colors.text : colors.textFaint }}>{t.label}</T>
      <Animated.View style={[styles.dot, dot]} />
    </Tap>
  );
}

function GlassTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const immersive = useUi((s) => s.immersive);
  if (immersive) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
      <View style={styles.bar}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={40} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]} />
        ) : null}
        <View style={[StyleSheet.absoluteFill, styles.barFill]} />
        {state.routes.map((route, i) => (
          <TabItem
            key={route.key}
            name={route.name}
            focused={state.index === i}
            onPress={() => {
              if (state.index !== i) navigateToTab(route.key);
            }}
          />
        ))}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg }, animation: 'shift' }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="focus" />
      <Tabs.Screen name="tutor" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: space.lg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    height: 72,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  barFill: { borderRadius: radius.xl, backgroundColor: Platform.OS === 'ios' ? 'rgba(14,14,26,0.55)' : 'rgba(14,14,26,0.94)' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: '100%' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 1 },
  orbGlow: { borderRadius: 29, shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12, marginTop: -26 },
  orb: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.bg },
});
