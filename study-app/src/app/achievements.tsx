import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { fullDate } from '@/lib/dates';
import { ACHIEVEMENTS, levelInfo, levelThreshold } from '@/lib/progress';
import { useStore } from '@/store';
import { useStats } from '@/store/selectors';
import { colors, fonts, gradients, radius, space } from '@/theme/tokens';
import { Glass, Header, Icon, Screen, T } from '@/ui';

export default function Achievements() {
  const unlocks = useStore((s) => s.data.unlocks);
  const stats = useStats();
  const next = levelInfo(levelThreshold(stats.level.level + 1));

  return (
    <Screen palette={[colors.amber, colors.rose, colors.primaryDeep]} header={<Header title="Achievements" />}>
      <Glass glow="rgba(255,184,77,0.35)" style={{ overflow: 'hidden', padding: 0 }}>
        <LinearGradient colors={[...gradients.sunrise]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <T variant="micro" color="rgba(255,255,255,0.85)">Level {stats.level.level}</T>
          <T style={{ fontFamily: fonts.display, fontSize: 36, lineHeight: 41, color: '#fff', letterSpacing: -1.2 }}>{stats.level.title}</T>
          <View style={styles.track}>
            <View style={{ width: `${Math.max(4, stats.level.progress * 100)}%`, height: '100%', backgroundColor: '#fff', borderRadius: 4 }} />
          </View>
          <T variant="small" color="rgba(255,255,255,0.9)">{stats.level.span - stats.level.into} XP to level {stats.level.level + 1}{next.title !== stats.level.title ? ` · ${next.title}` : ''}</T>
        </LinearGradient>
      </Glass>

      <View style={styles.grid}>
        {ACHIEVEMENTS.map((a, i) => {
          const u = unlocks[a.id] && !unlocks[a.id].deleted ? unlocks[a.id] : undefined;
          return (
            <Animated.View key={a.id} entering={FadeInDown.delay(i * 40).springify()} style={styles.cell}>
              <Glass style={[{ alignItems: 'center', gap: 6, minHeight: 168 }, !u && { opacity: 0.55 }]} tint={u ? 'rgba(255,184,77,0.16)' : undefined}>
                <View style={[styles.medal, u ? { backgroundColor: colors.amber + '30', borderColor: colors.amber } : null]}>
                  <Icon name={u ? a.icon : 'lock-closed'} size={26} color={u ? colors.amber : colors.textFaint} />
                </View>
                <T variant="bodyStrong" center>{a.title}</T>
                <T variant="small" color={colors.textDim} center>{a.desc}</T>
                {u && <T variant="micro" color={colors.amber} style={{ letterSpacing: 0.4 }}>{fullDate(new Date(u.at))}</T>}
              </Glass>
            </Animated.View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: space.xxl, gap: space.sm, borderRadius: radius.lg },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden', marginTop: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { width: '47.5%', flexGrow: 1 },
  medal: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border, marginBottom: 4 },
});
