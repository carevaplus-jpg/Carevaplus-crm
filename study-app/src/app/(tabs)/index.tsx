import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { STUDY_QUOTES } from '@/data/content';
import { dayKey, daysUntil, formatMinutes, greeting, prettyDate } from '@/lib/dates';
import { useStore } from '@/store';
import { live, useDueCards, useMySubjects, useStats } from '@/store/selectors';
import { colors, fonts, gradients, radius, space } from '@/theme/tokens';
import { Avatar, Button, Glass, Icon, Ring, Screen, Section, Tap, T } from '@/ui';

const enter = (i: number) => FadeInDown.delay(80 + i * 70).springify().damping(18);

export default function Today() {
  const profile = useStore((s) => s.profile)!;
  const tasks = useStore((s) => s.data.tasks);
  const progress = useStore((s) => s.data.progress);
  const toggleTask = useStore((s) => s.toggleTask);
  const stats = useStats();
  const due = useDueCards();
  const subjects = useMySubjects();

  const today = dayKey();
  const todayTasks = useMemo(
    () => live(tasks).filter((t) => t.date === today).sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt - b.createdAt),
    [tasks, today],
  );
  const continueChapter = (() => {
    const recent = live(progress)
      .filter((p) => p.status !== 'mastered' && p.lastStudied)
      .sort((a, b) => (b.lastStudied ?? 0) - (a.lastStudied ?? 0))[0];
    if (recent) {
      for (const s of subjects) {
        const ch = s.chapters.find((c) => c.id === recent.id);
        if (ch) return { subject: s, chapter: ch };
      }
    }
    const s = subjects[0];
    const ch = s?.chapters.find((c) => !progress[c.id] || progress[c.id].status === 'new');
    return s && ch ? { subject: s, chapter: ch } : undefined;
  })();

  const examIn = daysUntil(profile.examDate);
  const quote = STUDY_QUOTES[new Date().getDate() % STUDY_QUOTES.length];
  const goalPct = Math.min(1, stats.todayMin / Math.max(1, stats.goal));

  return (
    <Screen tabs>
      {/* Header */}
      <Animated.View entering={enter(0)} style={styles.header}>
        <Tap onPress={() => router.push('/me')} accessibilityLabel="Your profile">
          <Avatar name={profile.name} hue={profile.hue} />
        </Tap>
        <View style={{ flex: 1 }}>
          <T variant="small" color={colors.textDim}>{greeting()} · {prettyDate(new Date())}</T>
          <T variant="h2" numberOfLines={1}>{profile.name.split(' ')[0]}</T>
        </View>
        <View style={styles.streak} accessibilityLabel={`${stats.streak} day streak`}>
          <Icon name="flame" size={18} color={stats.streak ? colors.amber : colors.textFaint} />
          <T variant="bodyStrong">{stats.streak}</T>
        </View>
      </Animated.View>

      {/* Daily goal hero */}
      <Animated.View entering={enter(1)}>
        <Glass glow="rgba(139,108,255,0.35)" tint="rgba(139,108,255,0.16)" style={{ padding: space.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
            <Ring size={112} stroke={11} progress={goalPct} color="#B39BFF" color2={colors.mint}>
              <T style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.text, letterSpacing: -1 }}>{Math.round(goalPct * 100)}%</T>
              <T variant="micro" color={colors.textDim}>of goal</T>
            </Ring>
            <View style={{ flex: 1, gap: 6 }}>
              <T variant="micro" color={colors.textDim}>Today&apos;s focus</T>
              <T variant="h1">{formatMinutes(stats.todayMin)}</T>
              <T variant="small" color={colors.textDim}>
                {goalPct >= 1 ? 'Goal crushed. Anything more is a bonus 🔥' : `${formatMinutes(Math.max(0, stats.goal - stats.todayMin))} to reach your ${formatMinutes(stats.goal)} goal`}
              </T>
            </View>
          </View>
          <View style={{ marginTop: space.xl }}>
            <Button label="Start a focus session" icon="play" onPress={() => router.push('/focus')} />
          </View>
        </Glass>
      </Animated.View>

      {/* Countdown + Review */}
      <Animated.View entering={enter(2)} style={{ flexDirection: 'row', gap: space.md }}>
        <Glass style={{ flex: 1, gap: 4 }} onPress={() => router.push('/exam')}>
          <Icon name="calendar-clear-outline" size={18} color={colors.rose} />
          <T style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 39, color: colors.text, letterSpacing: -1.5, marginTop: 6 }}>{Math.max(0, examIn)}</T>
          <T variant="small" color={colors.textDim} numberOfLines={2}>{examIn > 0 ? `days to ${profile.examName}` : profile.examName}</T>
        </Glass>
        <Glass style={{ flex: 1, gap: 4 }} onPress={() => router.push('/review')} tint={due.length ? 'rgba(63,224,184,0.14)' : undefined}>
          <Icon name="layers-outline" size={18} color={colors.mint} />
          <T style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 39, color: colors.text, letterSpacing: -1.5, marginTop: 6 }}>{due.length}</T>
          <T variant="small" color={colors.textDim}>{due.length ? 'cards due · review now' : 'cards due · all clear ✨'}</T>
        </Glass>
      </Animated.View>

      {/* Level */}
      <Animated.View entering={enter(3)}>
        <Glass onPress={() => router.push('/achievements')} style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Icon name="diamond-outline" size={18} color={colors.amber} />
              <T variant="bodyStrong">Level {stats.level.level} · {stats.level.title}</T>
            </View>
            <T variant="small" color={colors.textDim}>{stats.level.into}/{stats.level.span} XP</T>
          </View>
          <View style={styles.track}>
            <LinearGradient colors={[...gradients.sunrise]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.max(4, stats.level.progress * 100)}%`, height: '100%', borderRadius: 4 }} />
          </View>
        </Glass>
      </Animated.View>

      {/* Continue */}
      {continueChapter && (
        <Animated.View entering={enter(4)}>
          <Section title="Continue learning">
            <Glass onPress={() => router.push(`/chapter/${continueChapter.chapter.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={[styles.subjIcon, { backgroundColor: continueChapter.subject.color + '22' }]}>
                <Icon name={continueChapter.subject.icon} size={22} color={continueChapter.subject.color} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="micro" color={continueChapter.subject.color}>{continueChapter.subject.name} · Ch {continueChapter.chapter.number}</T>
                <T variant="bodyStrong" numberOfLines={2}>{continueChapter.chapter.title}</T>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.textFaint} />
            </Glass>
          </Section>
        </Animated.View>
      )}

      {/* Plan */}
      <Animated.View entering={enter(5)}>
        <Section title="Today's plan" action="Planner" onAction={() => router.push('/planner')}>
          <Glass padded={false}>
            {todayTasks.length === 0 ? (
              <Tap onPress={() => router.push('/task')} style={styles.emptyPlan}>
                <Icon name="add-circle-outline" size={20} color={colors.primary} />
                <T variant="bodyStrong" color={colors.textDim}>Plan one small win for today</T>
              </Tap>
            ) : (
              <>
                {todayTasks.map((t, i) => {
                  const subj = subjects.find((s) => s.id === t.subjectId);
                  return (
                    <Tap key={t.id} onPress={() => toggleTask(t.id)} style={[styles.task, i > 0 && styles.divider]} feedback="soft" accessibilityRole="checkbox" accessibilityState={{ checked: t.done }}>
                      <Icon name={t.done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={t.done ? colors.mint : colors.textFaint} />
                      <View style={{ flex: 1 }}>
                        <T variant="bodyStrong" color={t.done ? colors.textFaint : colors.text} style={t.done && { textDecorationLine: 'line-through' }} numberOfLines={2}>{t.title}</T>
                        <T variant="small" color={colors.textFaint}>{[subj?.name, `${t.estMin} min`].filter(Boolean).join(' · ')}</T>
                      </View>
                    </Tap>
                  );
                })}
                <Tap onPress={() => router.push('/task')} style={[styles.task, styles.divider]}>
                  <Icon name="add" size={22} color={colors.primary} />
                  <T variant="bodyStrong" color={colors.primary}>Add task</T>
                </Tap>
              </>
            )}
          </Glass>
        </Section>
      </Animated.View>

      {/* Quote */}
      <Animated.View entering={enter(6)} style={{ paddingHorizontal: space.sm, gap: 6 }}>
        <T style={{ fontFamily: fonts.displayLight, fontSize: 18, lineHeight: 26, color: colors.textDim }}>“{quote.text}”</T>
        <T variant="small" color={colors.textFaint}>{quote.by}</T>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, height: 38, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  subjIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emptyPlan: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.xl },
  task: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
