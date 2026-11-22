import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { questionsForChapter, type QuizQuestion } from '@/data/content';
import { XP } from '@/lib/progress';
import { useStore } from '@/store';
import { live, useChapter } from '@/store/selectors';
import { colors, fonts, radius, space } from '@/theme/tokens';
import { Aurora, Button, Empty, haptic, Icon, IconButton, Ring, Tap, T } from '@/ui';

const shuffle = <X,>(a: X[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

export default function Quiz() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const insets = useSafeAreaInsets();
  const found = useChapter(chapterId);
  const cards = useStore((s) => s.data.cards);
  const recordQuiz = useStore((s) => s.recordQuiz);

  const build = (): QuizQuestion[] => {
    if (!found) return [];
    const bank = questionsForChapter(chapterId).map((q) => {
      const order = shuffle(q.options.map((_, i) => i));
      return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
    });
    // Turn the student's own cards into MCQs, using other answers from the subject as distractors.
    const subjectCards = live(cards).filter((c) => c.subjectId === found.subject.id);
    const fromCards: QuizQuestion[] = subjectCards
      .filter((c) => c.chapterId === chapterId)
      .flatMap((c) => {
        const distractors = shuffle(subjectCards.filter((o) => o.id !== c.id && o.back !== c.back)).slice(0, 3).map((o) => o.back);
        if (distractors.length < 3) return [];
        const options = shuffle([c.back, ...distractors]);
        return [{ id: `card-${c.id}`, chapterId, q: c.front, options, answer: options.indexOf(c.back), explain: 'From your flashcards.' }];
      });
    return shuffle([...bank, ...fromCards]).slice(0, 10);
  };

  const [questions, setQuestions] = useState<QuizQuestion[]>(build);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(() => Date.now());

  const q = questions[i];
  const correct = useMemo(() => answers.filter((a, k) => a === questions[k]?.answer).length, [answers, questions]);
  const accent = found?.subject.color ?? colors.primary;

  const pick = (k: number) => {
    if (picked !== null || !q) return;
    setPicked(k);
    if (k === q.answer) haptic.success();
    else haptic.warn();
  };

  const next = () => {
    const nextAnswers = [...answers, picked];
    setAnswers(nextAnswers);
    setPicked(null);
    if (i + 1 >= questions.length) {
      const score = nextAnswers.filter((a, k) => a === questions[k].answer).length;
      recordQuiz({ chapterId, subjectId: found!.subject.id, total: questions.length, correct: score, seconds: Math.round((Date.now() - started) / 1000) });
      setFinished(true);
    } else {
      setI(i + 1);
    }
  };

  const retry = () => {
    setQuestions(build());
    setI(0);
    setAnswers([]);
    setPicked(null);
    setFinished(false);
    setStarted(Date.now());
  };

  const pct = questions.length ? correct / questions.length : 0;

  return (
    <View style={{ flex: 1 }}>
      <Aurora palette={[accent, colors.primaryDeep, '#1A0F2E']} intensity={0.75} />
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <IconButton icon="close" label="Close quiz" onPress={() => router.back()} />
        <View style={styles.progressRow}>
          {questions.map((qq, k) => {
            const a = k < answers.length ? answers[k] : k === i && picked !== null ? picked : undefined;
            const c = a === undefined ? (k === i ? colors.text : 'rgba(255,255,255,0.12)') : a === qq.answer ? colors.mint : colors.danger;
            return <View key={qq.id} style={[styles.seg, { backgroundColor: c }]} />;
          })}
        </View>
      </View>

      {!found || questions.length === 0 ? (
        <View style={[styles.center, { paddingBottom: insets.bottom + space.xxl }]}>
          <Empty icon="help-buoy-outline" title="No questions yet" body="Add at least 4 flashcards in this subject and Vidya will build a quiz from them. Or ask the AI tutor to quiz you.">
            <Button label="Add a flashcard" size="md" onPress={() => router.replace({ pathname: '/card/[id]', params: { id: 'new', chapterId, subjectId: found?.subject.id } })} style={{ marginTop: space.lg }} />
          </Empty>
        </View>
      ) : finished ? (
        <ScrollView contentContainerStyle={[styles.results, { paddingBottom: insets.bottom + space.xxl }]}>
          <Animated.View entering={ZoomIn.springify()} style={{ alignItems: 'center', gap: space.md }}>
            <Ring size={160} stroke={14} progress={pct} color={pct >= 0.8 ? colors.mint : pct >= 0.5 ? colors.amber : colors.rose} color2={colors.text}>
              <T style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 46, color: colors.text, letterSpacing: -1.5 }}>{correct}/{questions.length}</T>
            </Ring>
            <T variant="h1" center>{pct === 1 ? 'Flawless! 🏆' : pct >= 0.8 ? 'Excellent work!' : pct >= 0.5 ? 'Good effort, keep going' : 'Every mistake is a lesson'}</T>
            <T variant="body" color={colors.textDim} center>+{correct * XP.quizCorrect + XP.quizComplete} XP · {found.chapter.title}</T>
          </Animated.View>
          {questions.some((qq, k) => answers[k] !== qq.answer) && (
            <View style={{ gap: space.md }}>
              <T variant="h3">Review your mistakes</T>
              {questions.map((qq, k) =>
                answers[k] === qq.answer ? null : (
                  <Animated.View key={qq.id} entering={FadeInDown.delay(k * 60)} style={styles.mistake}>
                    <T variant="bodyStrong">{qq.q}</T>
                    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
                      <Icon name="checkmark-circle" size={18} color={colors.mint} />
                      <T variant="body" color={colors.mint} style={{ flex: 1 }}>{qq.options[qq.answer]}</T>
                    </View>
                    <T variant="small" color={colors.textDim}>{qq.explain}</T>
                  </Animated.View>
                ),
              )}
            </View>
          )}
          <Button label="Try again" icon="refresh" onPress={retry} colorsOverride={[accent, colors.primaryDeep]} />
          <Button label="Done" variant="secondary" onPress={() => router.back()} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 120 }]}>
          <Animated.View key={q.id} entering={FadeInRight.springify().damping(18)} style={{ gap: space.xl }}>
            <View style={{ gap: space.sm }}>
              <T variant="micro" color={accent}>Question {i + 1} of {questions.length}</T>
              <T style={styles.q}>{q.q}</T>
            </View>
            <View style={{ gap: space.md }}>
              {q.options.map((o, k) => {
                const isAns = k === q.answer;
                const isPick = k === picked;
                const state = picked === null ? 'idle' : isAns ? 'right' : isPick ? 'wrong' : 'dim';
                const border = state === 'right' ? colors.mint : state === 'wrong' ? colors.danger : colors.border;
                const bg = state === 'right' ? colors.mint + '1F' : state === 'wrong' ? colors.danger + '1F' : colors.surface;
                return (
                  <Tap key={k} onPress={() => pick(k)} feedback="none" style={[styles.opt, { borderColor: border, backgroundColor: bg, opacity: state === 'dim' ? 0.5 : 1 }]} accessibilityLabel={`Option ${'ABCD'[k]}: ${o}`}>
                    <View style={[styles.letter, state === 'right' && { backgroundColor: colors.mint }, state === 'wrong' && { backgroundColor: colors.danger }]}>
                      {state === 'right' ? <Icon name="checkmark" size={16} color={colors.textInverse} /> : state === 'wrong' ? <Icon name="close" size={16} color="#fff" /> : <T variant="bodyStrong" color={colors.textDim}>{'ABCD'[k]}</T>}
                    </View>
                    <T variant="body" style={{ flex: 1, fontSize: 16 }}>{o}</T>
                  </Tap>
                );
              })}
            </View>
            {picked !== null && (
              <Animated.View entering={FadeIn.duration(250)} style={[styles.explain, { borderColor: picked === q.answer ? colors.mint + '55' : colors.amber + '55' }]}>
                <T variant="bodyStrong" color={picked === q.answer ? colors.mint : colors.amber}>{picked === q.answer ? 'Correct!' : 'Not quite'}</T>
                <T variant="body" color={colors.textDim}>{q.explain}</T>
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>
      )}

      {!finished && q && picked !== null && (
        <Animated.View entering={FadeInDown.springify()} style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
          <Button label={i + 1 >= questions.length ? 'See results' : 'Next question'} iconRight="arrow-forward" onPress={next} colorsOverride={[accent, colors.primaryDeep]} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl },
  progressRow: { flex: 1, flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 5, borderRadius: 3 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: space.xxl },
  body: { padding: space.xl, paddingTop: space.xxxl, maxWidth: 620, alignSelf: 'center', width: '100%' },
  q: { fontFamily: fonts.displaySemi, fontSize: 23, lineHeight: 31, color: colors.text, letterSpacing: -0.4 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1.5 },
  letter: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  explain: { padding: space.lg, gap: 4, borderRadius: radius.lg, borderWidth: 1, backgroundColor: colors.surface },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, maxWidth: 620, alignSelf: 'center', width: '100%' },
  results: { padding: space.xl, paddingTop: space.xxxl, gap: space.xl, maxWidth: 620, alignSelf: 'center', width: '100%' },
  mistake: { padding: space.lg, gap: space.sm, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
