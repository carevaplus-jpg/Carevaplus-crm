import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { STATUS_COLOR, STATUS_LABEL } from '@/lib/progress';
import { useStore } from '@/store';
import { useDueCards, useSubject, useSubjectMastery } from '@/store/selectors';
import type { ChapterStatus } from '@/store/types';
import { colors, fonts, space } from '@/theme/tokens';
import { Button, Empty, Glass, Header, Icon, IconButton, Pill, Ring, Screen, Segmented, Tap, T } from '@/ui';

type Filter = 'all' | 'todo' | 'done';

export default function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subject = useSubject(id);
  const progress = useStore((s) => s.data.progress);
  const remove = useStore((s) => s.remove);
  const m = useSubjectMastery(subject);
  const due = useDueCards({ subjectId: id });
  const [filter, setFilter] = useState<Filter>('all');

  const chapters = useMemo(() => {
    if (!subject) return [];
    return subject.chapters.filter((c) => {
      const st = progress[c.id]?.status ?? 'new';
      if (filter === 'todo') return st !== 'mastered';
      if (filter === 'done') return st === 'mastered';
      return true;
    });
  }, [subject, progress, filter]);

  if (!subject) {
    return (
      <Screen header={<Header />}>
        <Empty icon="help-circle-outline" title="Subject not found" />
      </Screen>
    );
  }

  return (
    <Screen
      palette={[subject.color, colors.primaryDeep, colors.bgElevated]}
      header={
        <Header
          title={subject.name}
          subtitle={`Class ${subject.classLevel} · ${subject.book}`}
          right={subject.custom ? <IconButton icon="trash-outline" label="Delete subject" color={colors.danger} onPress={() => { remove('subjects', subject.id); router.back(); }} /> : undefined}
        />
      }>
      <Animated.View entering={FadeInDown.springify()}>
        <Glass glow={subject.glow} tint={subject.color + '22'} style={{ alignItems: 'center', gap: space.lg, paddingVertical: space.xxl }}>
          <Ring size={132} stroke={12} progress={m} color={subject.color} color2={colors.text}>
            <Icon name={subject.icon} size={26} color={subject.color} />
            <T style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.text, letterSpacing: -1 }}>{Math.round(m * 100)}%</T>
          </Ring>
          <View style={{ flexDirection: 'row', gap: space.sm, width: '100%' }}>
            <Button label={due.length ? `Review ${due.length}` : 'Review'} icon="layers" variant="secondary" size="md" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/review', params: { subjectId: subject.id } })} />
            <Button label="Focus" icon="timer" size="md" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/focus', params: { subjectId: subject.id } })} />
          </View>
        </Glass>
      </Animated.View>

      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: `All ${subject.chapters.length}` },
          { value: 'todo', label: 'To do' },
          { value: 'done', label: 'Mastered' },
        ]}
      />

      <View style={{ gap: space.sm }}>
        {chapters.length === 0 && <Empty icon={filter === 'done' ? 'trophy-outline' : 'sparkles-outline'} title={filter === 'done' ? 'Nothing mastered yet' : 'Everything mastered!'} body={filter === 'done' ? 'Mark a chapter as mastered once you can explain it without the book.' : 'Incredible work. Keep reviewing to keep it fresh.'} />}
        {chapters.map((c, i) => {
          const st: ChapterStatus = progress[c.id] && !progress[c.id].deleted ? progress[c.id].status : 'new';
          const showPart = c.part && (i === 0 || chapters[i - 1].part !== c.part);
          return (
            <View key={c.id} style={{ gap: space.sm }}>
              {showPart && <T variant="micro" color={colors.textFaint} style={{ marginTop: i ? space.md : 0 }}>{c.part}</T>}
              <Animated.View entering={FadeInDown.delay(Math.min(i, 12) * 35).springify().damping(20)}>
                <Tap onPress={() => router.push(`/chapter/${c.id}`)} style={styles.row} accessibilityLabel={`Chapter ${c.number}, ${c.title}, ${STATUS_LABEL[st]}`}>
                  <View style={[styles.num, { borderColor: STATUS_COLOR[st] + '88', backgroundColor: st === 'mastered' ? colors.mint + '22' : 'transparent' }]}>
                    {st === 'mastered' ? <Icon name="checkmark" size={16} color={colors.mint} /> : <T style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textDim }}>{c.number}</T>}
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <T variant="bodyStrong" numberOfLines={2}>{c.title}</T>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {st !== 'new' && <Pill label={STATUS_LABEL[st]} color={STATUS_COLOR[st]} />}
                      {c.provisional && <Pill label="Verify syllabus" color={colors.textFaint} />}
                    </View>
                  </View>
                  <Icon name="chevron-forward" size={16} color={colors.textFaint} />
                </Tap>
              </Animated.View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  num: { width: 36, height: 36, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
