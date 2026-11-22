import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { addDays, dayKey, formatMinutes, startOfWeek, timeAgo } from '@/lib/dates';
import { ACHIEVEMENTS, bestStreak } from '@/lib/progress';
import { cloudEnabled } from '@/lib/supabase';
import { useStore } from '@/store';
import { live, useStats } from '@/store/selectors';
import { colors, fonts, radius, space } from '@/theme/tokens';
import { Avatar, Bars, Glass, Icon, Ring, Screen, Section, Tap, T } from '@/ui';

export default function Me() {
  const profile = useStore((s) => s.profile)!;
  const days = useStore((s) => s.data.days);
  const unlocks = useStore((s) => s.data.unlocks);
  const sync = useStore((s) => s.sync);
  const stats = useStats();

  const totals = useMemo(() => {
    const d = live(days);
    const focus = d.reduce((s, x) => s + x.focusMin, 0);
    const cards = d.reduce((s, x) => s + x.cards, 0);
    const qs = d.reduce((s, x) => s + x.questions, 0);
    const correct = d.reduce((s, x) => s + x.correct, 0);
    return { focus, cards, accuracy: qs ? Math.round((correct / qs) * 100) : null, best: bestStreak(days) };
  }, [days]);

  const week = useMemo(() => {
    const start = startOfWeek();
    return ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => {
      const k = dayKey(addDays(start, i));
      return { label, value: days[k] && !days[k].deleted ? days[k].focusMin : 0 };
    });
  }, [days]);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const unlocked = ACHIEVEMENTS.filter((a) => unlocks[a.id] && !unlocks[a.id].deleted);

  const tiles = [
    { icon: 'time', label: 'Focus time', value: formatMinutes(totals.focus), color: colors.primary },
    { icon: 'flame', label: 'Best streak', value: `${totals.best}d`, color: colors.amber },
    { icon: 'layers', label: 'Cards reviewed', value: `${totals.cards}`, color: colors.mint },
    { icon: 'checkmark-done', label: 'Quiz accuracy', value: totals.accuracy === null ? '—' : `${totals.accuracy}%`, color: colors.rose },
  ];

  return (
    <Screen tabs>
      <Animated.View entering={FadeInDown.springify()} style={styles.profile}>
        <Ring size={96} stroke={5} progress={stats.level.progress} color={colors.amber} color2={colors.rose}>
          <Avatar name={profile.name} hue={profile.hue} size={76} />
        </Ring>
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="h1" numberOfLines={1}>{profile.name}</T>
          <T variant="small" color={colors.textDim}>Class {profile.classLevel}{profile.stream ? ` · ${profile.stream}` : ''} · CBSE</T>
          <View style={styles.levelPill}>
            <Icon name="diamond" size={12} color={colors.amber} />
            <T variant="small" color={colors.text}>Lv {stats.level.level} · {stats.level.title} · {stats.xp} XP</T>
          </View>
        </View>
      </Animated.View>

      <View style={styles.tiles}>
        {tiles.map((t, i) => (
          <Animated.View key={t.label} entering={FadeInDown.delay(60 + i * 50).springify()} style={styles.tile}>
            <Glass style={{ gap: 6 }}>
              <Icon name={t.icon} size={18} color={t.color} />
              <T style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.text, letterSpacing: -0.8 }}>{t.value}</T>
              <T variant="small" color={colors.textFaint}>{t.label}</T>
            </Glass>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeInDown.delay(260).springify()}>
        <Section title="This week" action="All stats" onAction={() => router.push('/stats')}>
          <Glass>
            <Bars data={week} highlight={todayIdx} />
          </Glass>
        </Section>
      </Animated.View>

      <Section title={`Achievements · ${unlocked.length}/${ACHIEVEMENTS.length}`} action="See all" onAction={() => router.push('/achievements')}>
        <View style={styles.badges}>
          {ACHIEVEMENTS.slice(0, 6).map((a) => {
            const on = !!unlocks[a.id] && !unlocks[a.id].deleted;
            return (
              <Tap key={a.id} onPress={() => router.push('/achievements')} style={[styles.badge, on && { borderColor: colors.amber + '88', backgroundColor: colors.amber + '18' }]} accessibilityLabel={`${a.title}${on ? ', unlocked' : ', locked'}`}>
                <Icon name={on ? a.icon : 'lock-closed'} size={22} color={on ? colors.amber : colors.textFaint} />
              </Tap>
            );
          })}
        </View>
      </Section>

      <Glass padded={false}>
        {[
          { icon: 'document-text-outline', label: 'All notes', to: '/notes' as const },
          { icon: 'calendar-outline', label: 'Planner & exams', to: '/planner' as const },
          { icon: 'stats-chart-outline', label: 'Statistics', to: '/stats' as const },
          { icon: 'settings-outline', label: 'Settings', to: '/settings' as const },
        ].map((l, i) => (
          <Tap key={l.label} onPress={() => router.push(l.to)} style={[styles.link, i > 0 && styles.divider]}>
            <Icon name={l.icon} size={20} color={colors.textDim} />
            <T variant="bodyStrong" style={{ flex: 1 }}>{l.label}</T>
            <Icon name="chevron-forward" size={16} color={colors.textFaint} />
          </Tap>
        ))}
      </Glass>

      <Tap onPress={() => router.push(cloudEnabled ? '/auth' : '/settings')} style={styles.syncRow}>
        <Icon name={sync.status === 'error' ? 'cloud-offline-outline' : sync.lastSyncedAt ? 'cloud-done-outline' : 'cloud-outline'} size={18} color={sync.status === 'error' ? colors.danger : colors.textFaint} />
        <T variant="small" color={colors.textFaint}>
          {!cloudEnabled
            ? 'Saved on this device · cloud sync not configured'
            : sync.status === 'syncing'
              ? 'Syncing…'
              : sync.status === 'error'
                ? `Sync error · ${sync.error ?? 'tap to retry'}`
                : sync.lastSyncedAt
                  ? `Synced ${timeAgo(sync.lastSyncedAt)}`
                  : 'Sign in to back up & sync across devices'}
        </T>
      </Tap>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  levelPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.surfaceStrong, marginTop: 4 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: { width: '47.5%', flexGrow: 1 },
  badges: { flexDirection: 'row', gap: space.sm },
  badge: { flex: 1, aspectRatio: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  syncRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: space.sm },
});
