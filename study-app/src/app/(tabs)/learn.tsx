import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { mastery } from '@/lib/progress';
import { useStore } from '@/store';
import { live, useDueCards, useMySubjects } from '@/store/selectors';
import { colors, fonts, radius, space } from '@/theme/tokens';
import { Glass, Icon, Pill, Ring, Screen, Tap, T } from '@/ui';

export default function Learn() {
  const profile = useStore((s) => s.profile)!;
  const progress = useStore((s) => s.data.progress);
  const notes = useStore((s) => s.data.notes);
  const subjects = useMySubjects();
  const due = useDueCards();

  const overall = useMemo(() => mastery(subjects.flatMap((s) => s.chapters.map((c) => c.id)), progress), [subjects, progress]);
  const mastered = useMemo(() => live(progress).filter((p) => p.status === 'mastered').length, [progress]);
  const total = subjects.reduce((n, s) => n + s.chapters.length, 0);

  return (
    <Screen tabs>
      <Animated.View entering={FadeInDown.springify()} style={{ gap: space.xs }}>
        <T variant="micro" color={colors.textDim}>CBSE · NCERT · Class {profile.classLevel}{profile.stream ? ` · ${profile.stream}` : ''}</T>
        <T variant="hero">Learn</T>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).springify()}>
        <Glass style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }} tint="rgba(79,139,255,0.14)">
          <Ring size={76} stroke={8} progress={overall} color={colors.secondary} color2={colors.mint}>
            <T style={{ fontFamily: fonts.display, fontSize: 18, lineHeight: 21, color: colors.text }}>{Math.round(overall * 100)}%</T>
          </Ring>
          <View style={{ flex: 1, gap: 4 }}>
            <T variant="h3">Syllabus mastery</T>
            <T variant="small" color={colors.textDim}>{mastered} of {total} chapters mastered across {subjects.length} subjects</T>
          </View>
        </Glass>
      </Animated.View>

      <View style={styles.quick}>
        {[
          { icon: 'layers', label: 'Review', sub: `${due.length} due`, color: colors.mint, to: '/review' as const },
          { icon: 'document-text', label: 'Notes', sub: `${live(notes).length} saved`, color: colors.amber, to: '/notes' as const },
          { icon: 'calendar', label: 'Planner', sub: 'This week', color: colors.rose, to: '/planner' as const },
        ].map((q, i) => (
          <Animated.View key={q.label} entering={FadeInDown.delay(100 + i * 60).springify()} style={{ flex: 1 }}>
            <Glass onPress={() => router.push(q.to)} style={{ gap: 6, alignItems: 'flex-start' }}>
              <View style={[styles.qIcon, { backgroundColor: q.color + '22' }]}>
                <Icon name={q.icon} size={18} color={q.color} />
              </View>
              <T variant="bodyStrong">{q.label}</T>
              <T variant="small" color={colors.textFaint}>{q.sub}</T>
            </Glass>
          </Animated.View>
        ))}
      </View>

      <T variant="h3">Your subjects</T>
      <View style={{ gap: space.md }}>
        {subjects.map((s, i) => {
          const m = mastery(s.chapters.map((c) => c.id), progress);
          const started = s.chapters.filter((c) => progress[c.id] && !progress[c.id].deleted && progress[c.id].status !== 'new').length;
          const sDue = due.filter((c) => c.subjectId === s.id).length;
          return (
            <Animated.View key={s.id} entering={FadeInDown.delay(160 + i * 70).springify().damping(18)}>
              <Glass onPress={() => router.push(`/subject/${s.id}`)} glow={s.glow} style={styles.subject} tint={s.color + '1F'}>
                <View style={[styles.sIcon, { backgroundColor: s.color + '26' }]}>
                  <Icon name={s.icon} size={26} color={s.color} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <T variant="h3">{s.name}</T>
                  <T variant="small" color={colors.textDim}>{s.book} · {started}/{s.chapters.length} started</T>
                  {sDue > 0 && <Pill label={`${sDue} cards due`} color={colors.mint} />}
                </View>
                <Ring size={54} stroke={6} progress={m} color={s.color}>
                  <T style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: colors.text }}>{Math.round(m * 100)}</T>
                </Ring>
              </Glass>
            </Animated.View>
          );
        })}
        <Tap onPress={() => router.push('/custom-subject')} style={styles.add}>
          <Icon name="add" size={20} color={colors.textDim} />
          <T variant="bodyStrong" color={colors.textDim}>Add a subject (English, SST, CS…)</T>
        </Tap>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: 'row', gap: space.md },
  qIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  subject: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.xl },
  sIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, height: 60, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong },
});
