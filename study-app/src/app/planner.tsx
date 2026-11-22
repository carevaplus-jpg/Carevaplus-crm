import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { addDays, dayKey, daysUntil, fullDate, monthShort, prettyDate, startOfWeek, weekdayShort } from '@/lib/dates';
import { uid } from '@/lib/id';
import { KINDS, smartPlan } from '@/lib/planner';
import { useStore } from '@/store';
import { live, useMySubjects } from '@/store/selectors';
import { colors, fonts, radius, space } from '@/theme/tokens';
import { Button, Glass, haptic, Header, Icon, IconButton, Screen, Section, Tap, T } from '@/ui';

export default function Planner() {
  const profile = useStore((s) => s.profile)!;
  const data = useStore((s) => s.data);
  const toggleTask = useStore((s) => s.toggleTask);
  const upsert = useStore((s) => s.upsert);
  const celebrate = useStore((s) => s.celebrate);
  const subjects = useMySubjects();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState(dayKey());

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(addDays(new Date(), weekOffset * 7)), i)), [weekOffset]);
  const tasks = useMemo(() => live(data.tasks), [data.tasks]);
  const dayTasks = useMemo(
    () => tasks.filter((t) => t.date === selected).sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt - b.createdAt),
    [tasks, selected],
  );
  const exams = useMemo(() => {
    const extra = live(data.exams).map((e) => ({ id: e.id, name: e.name, date: e.date }));
    return [{ id: 'main', name: profile.examName, date: profile.examDate }, ...extra]
      .filter((e) => daysUntil(e.date) >= 0)
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  }, [data.exams, profile]);

  const doneMin = dayTasks.filter((t) => t.done).reduce((s, t) => s + t.estMin, 0);
  const plannedMin = dayTasks.reduce((s, t) => s + t.estMin, 0);

  const generate = () => {
    const drafts = smartPlan(data, subjects, profile);
    const existing = new Set(dayTasks.map((t) => t.title));
    const fresh = drafts.filter((d) => !existing.has(d.title));
    if (!fresh.length) {
      celebrate({ kind: 'xp', title: 'Your plan is already complete', subtitle: 'Nothing new to add' });
      return;
    }
    haptic.success();
    fresh.forEach((d, i) => upsert('tasks', { ...d, id: uid('task_'), date: selected, done: false, createdAt: Date.now() + i, deleted: false }));
  };

  return (
    <Screen palette={[colors.rose, colors.primaryDeep, '#0B1C3A']} header={<Header title="Planner" subtitle={`${monthShort(week[0])} ${week[0].getFullYear()}`} />}>
      {/* Week strip */}
      <View style={styles.weekRow}>
        <IconButton icon="chevron-back" label="Previous week" size={34} onPress={() => setWeekOffset((w) => w - 1)} />
        <View style={styles.week}>
          {week.map((d) => {
            const k = dayKey(d);
            const on = k === selected;
            const isToday = k === dayKey();
            const count = tasks.filter((t) => t.date === k).length;
            const allDone = count > 0 && tasks.filter((t) => t.date === k).every((t) => t.done);
            return (
              <Tap key={k} onPress={() => setSelected(k)} style={[styles.day, on && styles.dayOn]} accessibilityLabel={`${prettyDate(d)}, ${count} tasks`} accessibilityState={{ selected: on }}>
                <T variant="micro" color={on ? '#fff' : colors.textFaint} style={{ letterSpacing: 0.4 }}>{weekdayShort(d).slice(0, 2)}</T>
                <T style={{ fontFamily: fonts.displaySemi, fontSize: 17, color: on ? '#fff' : isToday ? colors.primary : colors.text }}>{d.getDate()}</T>
                <View style={[styles.marker, { backgroundColor: count ? (allDone ? colors.mint : on ? '#fff' : colors.primary) : 'transparent' }]} />
              </Tap>
            );
          })}
        </View>
        <IconButton icon="chevron-forward" label="Next week" size={34} onPress={() => setWeekOffset((w) => w + 1)} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <T variant="h2">{selected === dayKey() ? 'Today' : prettyDate(new Date(selected + 'T00:00:00'))}</T>
          <T variant="small" color={colors.textDim}>{plannedMin ? `${doneMin}/${plannedMin} min done · ${dayTasks.length} tasks` : 'Nothing planned yet'}</T>
        </View>
        <Tap onPress={generate} style={styles.smart} accessibilityLabel="Generate a smart plan">
          <Icon name="sparkles" size={16} color={colors.amber} />
          <T variant="small" color={colors.text}>Smart plan</T>
        </Tap>
      </View>

      <View style={{ gap: space.sm }}>
        {dayTasks.map((t, i) => {
          const subj = subjects.find((s) => s.id === t.subjectId);
          const kind = KINDS.find((k) => k.value === t.kind);
          return (
            <Animated.View key={t.id} entering={FadeInDown.delay(i * 40).springify()} layout={LinearTransition.springify()}>
              <Glass padded={false} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Tap onPress={() => toggleTask(t.id)} style={styles.check} feedback="soft" accessibilityRole="checkbox" accessibilityState={{ checked: t.done }} accessibilityLabel={t.title}>
                  <Icon name={t.done ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={t.done ? colors.mint : colors.textFaint} />
                </Tap>
                <Tap onPress={() => router.push({ pathname: '/task', params: { id: t.id } })} style={{ flex: 1, paddingVertical: space.md, paddingRight: space.lg, gap: 4 }} feedback="none">
                  <T variant="bodyStrong" color={t.done ? colors.textFaint : colors.text} style={t.done && { textDecorationLine: 'line-through' }} numberOfLines={2}>{t.title}</T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {kind && <Icon name={kind.icon} size={12} color={colors.textFaint} />}
                    <T variant="small" color={colors.textFaint}>{[kind?.label, subj?.name, `${t.estMin} min`].filter(Boolean).join(' · ')}</T>
                  </View>
                </Tap>
                {t.chapterId && !t.done && (
                  <IconButton icon="play" label="Start focus" size={36} color={subj?.color ?? colors.primary} onPress={() => router.push({ pathname: '/focus', params: { subjectId: t.subjectId, chapterId: t.chapterId } })} />
                )}
                <View style={{ width: space.md }} />
              </Glass>
            </Animated.View>
          );
        })}
        <Button label="Add task" icon="add" variant="secondary" onPress={() => router.push({ pathname: '/task', params: { date: selected } })} />
      </View>

      <Section title="Countdowns" action="Manage" onAction={() => router.push('/exam')}>
        {exams.map((e, i) => {
          const left = daysUntil(e.date);
          return (
            <Glass key={e.id} tint={i === 0 ? 'rgba(255,107,149,0.15)' : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }} onPress={() => router.push('/exam')}>
              <View style={[styles.countBox, i === 0 && { backgroundColor: colors.rose + '26' }]}>
                <T style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: i === 0 ? colors.rose : colors.text, letterSpacing: -1 }}>{left}</T>
                <T variant="micro" color={colors.textFaint}>days</T>
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{e.name}</T>
                <T variant="small" color={colors.textDim}>{fullDate(new Date(e.date))}</T>
              </View>
            </Glass>
          );
        })}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  week: { flex: 1, flexDirection: 'row', gap: 4 },
  day: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.sm, borderRadius: radius.md },
  dayOn: { backgroundColor: colors.primary },
  marker: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  smart: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, height: 34, borderRadius: radius.pill, backgroundColor: colors.amber + '1F', borderWidth: 1, borderColor: colors.amber + '55' },
  check: { width: 56, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  countBox: { width: 64, height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
});
