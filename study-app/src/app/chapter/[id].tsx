import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { questionsForChapter } from '@/data/content';
import { timeAgo } from '@/lib/dates';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/progress';
import { strength } from '@/lib/srs';
import { useNow } from '@/lib/useNow';
import { useStore } from '@/store';
import { live, useChapter } from '@/store/selectors';
import type { ChapterStatus } from '@/store/types';
import { colors, radius, space } from '@/theme/tokens';
import { Empty, Glass, Header, Icon, Screen, Section, Tap, T } from '@/ui';

const STATUSES: ChapterStatus[] = ['new', 'learning', 'revising', 'mastered'];
const STATUS_ICON: Record<ChapterStatus, string> = { new: 'ellipse-outline', learning: 'book-outline', revising: 'repeat', mastered: 'trophy' };

export default function ChapterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const found = useChapter(id);
  const progress = useStore((s) => (id ? s.data.progress[id] : undefined));
  const setStatus = useStore((s) => s.setChapterStatus);
  const allNotes = useStore((s) => s.data.notes);
  const allCards = useStore((s) => s.data.cards);
  const attempts = useStore((s) => s.data.attempts);

  const notes = useMemo(() => live(allNotes).filter((n) => n.chapterId === id).sort((a, b) => b.updatedAt - a.updatedAt), [allNotes, id]);
  const cards = useMemo(() => live(allCards).filter((c) => c.chapterId === id), [allCards, id]);
  const now = useNow();
  const dueCount = cards.filter((c) => c.srs.due <= now).length;
  const memory = cards.length ? cards.reduce((s, c) => s + strength(c.srs), 0) / cards.length : 0;
  const bankQs = id ? questionsForChapter(id).length : 0;
  const quizQs = bankQs + cards.length;
  const best = useMemo(() => {
    const mine = live(attempts).filter((a) => a.chapterId === id);
    return mine.length ? Math.max(...mine.map((a) => Math.round((a.correct / a.total) * 100))) : null;
  }, [attempts, id]);

  if (!found) {
    return (
      <Screen header={<Header />}>
        <Empty icon="help-circle-outline" title="Chapter not found" />
      </Screen>
    );
  }
  const { subject, chapter } = found;
  const status: ChapterStatus = progress && !progress.deleted ? progress.status : 'new';

  const actions = [
    { icon: 'timer', label: 'Focus', sub: 'Deep work on this', color: colors.primary, onPress: () => router.push({ pathname: '/focus', params: { subjectId: subject.id, chapterId: chapter.id } }) },
    { icon: 'layers', label: 'Flashcards', sub: dueCount ? `${dueCount} due now` : `${cards.length} cards`, color: colors.mint, onPress: () => router.push({ pathname: '/review', params: { chapterId: chapter.id, all: dueCount ? undefined : '1' } }) },
    { icon: 'help-buoy', label: 'Quiz', sub: quizQs ? `${quizQs} questions${best !== null ? ` · best ${best}%` : ''}` : 'Add cards first', color: colors.amber, onPress: () => router.push(`/quiz/${chapter.id}`) },
    { icon: 'sparkles', label: 'Ask tutor', sub: 'Explain · quiz · doubts', color: colors.rose, onPress: () => router.push({ pathname: '/tutor', params: { chapterId: chapter.id } }) },
  ];

  return (
    <Screen palette={[subject.color, colors.primaryDeep, colors.bgElevated]} header={<Header title={`${subject.name} · Ch ${chapter.number}`} subtitle={chapter.part ? `${subject.book} · ${chapter.part}` : subject.book} />}>
      <Animated.View entering={FadeInDown.springify()} style={{ gap: space.sm }}>
        <T variant="h1">{chapter.title}</T>
        {chapter.provisional && (
          <T variant="small" color={colors.textFaint}>New 2026-27 textbook. Confirm the chapter order with your teacher or ncert.nic.in.</T>
        )}
        {progress?.lastStudied && <T variant="small" color={colors.textDim}>Last studied {timeAgo(progress.lastStudied)}</T>}
      </Animated.View>

      {/* Status stepper */}
      <Animated.View entering={FadeInDown.delay(60).springify()}>
        <Glass style={{ gap: space.md }}>
          <T variant="micro" color={colors.textFaint}>Where are you with this chapter?</T>
          <View style={styles.statusRow}>
            {STATUSES.map((s) => {
              const on = s === status;
              return (
                <Tap key={s} onPress={() => setStatus(chapter.id, s)} feedback={s === 'mastered' ? 'firm' : 'tap'} style={[styles.status, on && { backgroundColor: STATUS_COLOR[s] + '26', borderColor: STATUS_COLOR[s] }]} accessibilityState={{ selected: on }} accessibilityLabel={STATUS_LABEL[s]}>
                  <Icon name={STATUS_ICON[s]} size={18} color={on ? STATUS_COLOR[s] : colors.textFaint} />
                  <T variant="small" color={on ? colors.text : colors.textFaint} numberOfLines={1}>{STATUS_LABEL[s]}</T>
                </Tap>
              );
            })}
          </View>
          {cards.length > 0 && (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T variant="small" color={colors.textDim}>Memory strength</T>
                <T variant="small" color={colors.textDim}>{Math.round(memory * 100)}%</T>
              </View>
              <View style={styles.track}>
                <View style={{ width: `${Math.max(3, memory * 100)}%`, height: '100%', backgroundColor: colors.mint, borderRadius: 3 }} />
              </View>
            </View>
          )}
        </Glass>
      </Animated.View>

      {/* Actions */}
      <View style={styles.grid}>
        {actions.map((a, i) => (
          <Animated.View key={a.label} entering={FadeInDown.delay(100 + i * 50).springify()} style={styles.cell}>
            <Glass onPress={a.onPress} style={{ gap: 6, minHeight: 116 }} tint={a.color + '18'}>
              <View style={[styles.aIcon, { backgroundColor: a.color + '26' }]}>
                <Icon name={a.icon} size={20} color={a.color} />
              </View>
              <T variant="bodyStrong">{a.label}</T>
              <T variant="small" color={colors.textFaint} numberOfLines={1}>{a.sub}</T>
            </Glass>
          </Animated.View>
        ))}
      </View>

      <Section title="Notes" action="New note" onAction={() => router.push({ pathname: '/note/[id]', params: { id: 'new', chapterId: chapter.id, subjectId: subject.id } })}>
        {notes.length === 0 ? (
          <Glass onPress={() => router.push({ pathname: '/note/[id]', params: { id: 'new', chapterId: chapter.id, subjectId: subject.id } })} style={styles.emptyRow}>
            <Icon name="create-outline" size={20} color={colors.amber} />
            <T variant="body" color={colors.textDim} style={{ flex: 1 }}>Summarise this chapter in your own words. It&apos;s the fastest way to learn.</T>
          </Glass>
        ) : (
          notes.map((n) => (
            <Glass key={n.id} onPress={() => router.push(`/note/${n.id}`)} style={{ gap: 4 }}>
              <T variant="bodyStrong" numberOfLines={1}>{n.title || 'Untitled note'}</T>
              <T variant="small" color={colors.textDim} numberOfLines={2}>{n.body || 'Empty'}</T>
            </Glass>
          ))
        )}
      </Section>

      <Section title={`Flashcards · ${cards.length}`} action="Add card" onAction={() => router.push({ pathname: '/card/[id]', params: { id: 'new', chapterId: chapter.id, subjectId: subject.id } })}>
        {cards.length === 0 ? (
          <Glass onPress={() => router.push({ pathname: '/card/[id]', params: { id: 'new', chapterId: chapter.id, subjectId: subject.id } })} style={styles.emptyRow}>
            <Icon name="add-circle-outline" size={20} color={colors.mint} />
            <T variant="body" color={colors.textDim} style={{ flex: 1 }}>Turn key definitions and formulas into cards. Vidya will remind you right before you forget.</T>
          </Glass>
        ) : (
          <Glass padded={false}>
            {cards.slice(0, 8).map((c, i) => (
              <Tap key={c.id} onPress={() => router.push(`/card/${c.id}`)} style={[styles.cardRow, i > 0 && styles.divider]}>
                <View style={[styles.dot, { backgroundColor: c.srs.due <= now ? colors.mint : colors.textFaint }]} />
                <T variant="body" style={{ flex: 1 }} numberOfLines={1}>{c.front}</T>
                <Icon name="chevron-forward" size={14} color={colors.textFaint} />
              </Tap>
            ))}
            {cards.length > 8 && (
              <View style={[styles.cardRow, styles.divider]}>
                <T variant="small" color={colors.textFaint}>+{cards.length - 8} more</T>
              </View>
            )}
          </Glass>
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', gap: space.sm },
  status: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { width: '47.5%', flexGrow: 1 },
  aIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
