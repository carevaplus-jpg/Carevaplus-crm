import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, interpolate, useAnimatedStyle, useSharedValue, withSpring, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { XP } from '@/lib/progress';
import { previewLabel, type Grade } from '@/lib/srs';
import { useStore } from '@/store';
import { live, useMySubjects } from '@/store/selectors';
import { colors, fonts, gradients, motion, radius, space } from '@/theme/tokens';
import { Aurora, Button, Empty, haptic, IconButton, Tap, T } from '@/ui';

const GRADES: { g: Grade; label: string; color: string }[] = [
  { g: 0, label: 'Again', color: colors.danger },
  { g: 1, label: 'Hard', color: colors.amber },
  { g: 2, label: 'Good', color: colors.secondary },
  { g: 3, label: 'Easy', color: colors.mint },
];

export default function Review() {
  const params = useLocalSearchParams<{ subjectId?: string; chapterId?: string; all?: string }>();
  const insets = useSafeAreaInsets();
  const cards = useStore((s) => s.data.cards);
  const reviewCard = useStore((s) => s.reviewCard);
  const subjects = useMySubjects();

  // Snapshot the queue once so grading doesn't reshuffle mid-session.
  const [queue, setQueue] = useState<string[]>(() => {
    const now = Date.now();
    const mine = new Set(subjects.map((s) => s.id));
    return live(cards)
      .filter((c) => (params.chapterId ? c.chapterId === params.chapterId : mine.has(c.subjectId)))
      .filter((c) => (params.subjectId ? c.subjectId === params.subjectId : true))
      .filter((c) => params.all === '1' || c.srs.due <= now)
      .sort((a, b) => a.srs.due - b.srs.due)
      .slice(0, 60)
      .map((c) => c.id);
  });
  const [initial] = useState(queue.length);
  const [done, setDone] = useState(0);
  const [tally, setTally] = useState<number[]>([0, 0, 0, 0]);
  const [revealed, setRevealed] = useState(false);

  const card = queue[0] ? cards[queue[0]] : undefined;
  const subject = useMemo(() => subjects.find((s) => s.id === card?.subjectId), [subjects, card]);
  const chapter = subject?.chapters.find((c) => c.id === card?.chapterId);

  const flip = useSharedValue(0);
  const front = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }],
    opacity: flip.value < 0.5 ? 1 : 0,
  }));
  const back = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` }],
    opacity: flip.value >= 0.5 ? 1 : 0,
  }));

  const reveal = () => {
    if (revealed) return;
    haptic.soft();
    flip.set(withSpring(1, motion.gentle));
    setRevealed(true);
  };

  const grade = (g: Grade) => {
    if (!card) return;
    reviewCard(card.id, g);
    setTally((t) => t.map((n, i) => (i === g ? n + 1 : n)));
    flip.set(0);
    setRevealed(false);
    setQueue((q) => {
      const [head, ...rest] = q;
      // "Again" cards come back once at the end of this session
      return g === 0 && !rest.includes(head) ? [...rest, head] : rest;
    });
    if (g !== 0) setDone((d) => d + 1);
  };

  const total = Math.max(initial, 1);
  const pct = Math.min(1, done / total);
  const accent = subject?.color ?? colors.primary;

  return (
    <View style={{ flex: 1 }}>
      <Aurora palette={[accent, colors.primaryDeep, '#0B1C3A']} intensity={0.8} />
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <IconButton icon="close" label="Close review" onPress={() => router.back()} />
        <View style={styles.progress}>
          <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: accent }]} />
        </View>
        <T variant="bodyStrong" color={colors.textDim} style={{ minWidth: 48, textAlign: 'right' }}>{Math.min(done, initial)}/{initial}</T>
      </View>

      {!card ? (
        <Animated.View entering={FadeIn} style={[styles.center, { paddingBottom: insets.bottom + space.xxl }]}>
          {initial === 0 ? (
            <Empty icon="checkmark-done-outline" title="Nothing due. You're all caught up" body="Vidya schedules each card right before you'd forget it. Come back tomorrow, or practise a chapter's full deck from its page.">
              <Button label="Back" variant="secondary" size="md" onPress={() => router.back()} style={{ marginTop: space.lg }} />
            </Empty>
          ) : (
            <View style={{ alignItems: 'center', gap: space.lg, width: '100%' }}>
              <Animated.View entering={ZoomIn.springify()}>
                <T style={{ fontSize: 64 }}>🧠</T>
              </Animated.View>
              <T variant="h1" center>Session complete</T>
              <T variant="body" color={colors.textDim} center>{initial} cards reviewed · +{initial * XP.cardReview} XP</T>
              <View style={styles.tally}>
                {GRADES.map((g) => (
                  <View key={g.g} style={{ alignItems: 'center', gap: 2, flex: 1 }}>
                    <T style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: g.color }}>{tally[g.g]}</T>
                    <T variant="micro" color={colors.textFaint}>{g.label}</T>
                  </View>
                ))}
              </View>
              <Button label="Done" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} colorsOverride={gradients.mint} />
            </View>
          )}
        </Animated.View>
      ) : (
        <>
          <View style={styles.meta}>
            <T variant="micro" color={accent}>{subject?.name ?? 'Card'}{chapter ? ` · Ch ${chapter.number}` : ''}</T>
            {chapter && <T variant="small" color={colors.textFaint} numberOfLines={1}>{chapter.title}</T>}
          </View>
          <Tap onPress={reveal} feedback="none" scaleTo={0.985} style={styles.cardArea} accessibilityLabel={revealed ? 'Answer shown' : 'Tap to reveal answer'}>
            <Animated.View key={card.id} entering={FadeInDown.springify().damping(16)} style={{ flex: 1 }}>
              <Animated.View style={[styles.face, { borderColor: accent + '55' }, front]}>
                <T variant="micro" color={colors.textFaint}>Question</T>
                <T style={styles.prompt}>{card.front}</T>
                <T variant="small" color={colors.textFaint}>Tap to reveal</T>
              </Animated.View>
              <Animated.View style={[styles.face, styles.backFace, { borderColor: accent }, back]}>
                <T variant="micro" color={accent}>Answer</T>
                <T style={[styles.prompt, { fontSize: 20, lineHeight: 30 }]}>{card.back}</T>
                <T variant="small" color={colors.textFaint} numberOfLines={2}>{card.front}</T>
              </Animated.View>
            </Animated.View>
          </Tap>
          <View style={[styles.bottom, { paddingBottom: insets.bottom + space.lg }]}>
            {revealed ? (
              <Animated.View entering={FadeInDown.springify()} style={styles.grades}>
                {GRADES.map((g) => (
                  <Tap key={g.g} onPress={() => grade(g.g)} feedback={g.g === 0 ? 'firm' : 'soft'} style={[styles.grade, { borderColor: g.color + '66', backgroundColor: g.color + '1A' }]} accessibilityLabel={`${g.label}, next review in ${previewLabel(card.srs, g.g)}`}>
                    <T variant="bodyStrong" color={g.color}>{g.label}</T>
                    <T variant="small" color={colors.textFaint}>{previewLabel(card.srs, g.g)}</T>
                  </Tap>
                ))}
              </Animated.View>
            ) : (
              <Button label="Show answer" onPress={reveal} colorsOverride={[accent, colors.primaryDeep]} />
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl },
  progress: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: space.xxl, maxWidth: 520, alignSelf: 'center', width: '100%' },
  meta: { paddingHorizontal: space.xxl, paddingTop: space.xl, gap: 2, maxWidth: 620, alignSelf: 'center', width: '100%' },
  cardArea: { flex: 1, padding: space.xl, maxWidth: 620, alignSelf: 'center', width: '100%' },
  face: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: radius.xl, borderWidth: 1.5, padding: space.xxl, justifyContent: 'space-between',
    backgroundColor: 'rgba(18,18,34,0.88)', backfaceVisibility: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 12,
  },
  backFace: { backgroundColor: 'rgba(22,22,42,0.94)' },
  prompt: { fontFamily: fonts.displaySemi, fontSize: 24, lineHeight: 33, color: colors.text, letterSpacing: -0.4 },
  bottom: { paddingHorizontal: space.xl, maxWidth: 620, alignSelf: 'center', width: '100%' },
  grades: { flexDirection: 'row', gap: space.sm },
  grade: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.md, borderWidth: 1 },
  tally: { flexDirection: 'row', width: '100%', padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
