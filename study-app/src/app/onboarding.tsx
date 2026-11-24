import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CLASS_LEVELS, coreSubjectsFor, type ClassLevel } from '@/data/syllabus';
import { cloudEnabled } from '@/lib/supabase';
import { useStore } from '@/store';
import { colors, fonts, gradients, radius, space } from '@/theme/tokens';
import { Aurora, Button, Chip, DateStepper, Field, haptic, Icon, Tap, T } from '@/ui';

const STEPS = ['welcome', 'name', 'class', 'goal', 'ready'] as const;
type Step = (typeof STEPS)[number];

const BOOKS: Record<ClassLevel, string> = { 8: 'Curiosity · Ganita Prakash', 9: 'Exploration · Ganita Manjari' };

function defaultExam(level: ClassLevel) {
  // School annual exams are usually held around early March. Tentative, user-editable.
  const year = new Date().getMonth() >= 3 ? new Date().getFullYear() + 1 : new Date().getFullYear();
  return { name: `Class ${level} Annual Exams`, date: new Date(year, 2, 2) };
}

const FEATURES = [
  { icon: 'planet-outline', text: 'Every NCERT chapter for Class 8 & 9' },
  { icon: 'timer-outline', text: 'Immersive focus sessions' },
  { icon: 'layers-outline', text: 'Flashcards that remember for you' },
  { icon: 'sparkles-outline', text: 'A personal AI tutor' },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const complete = useStore((s) => s.completeOnboarding);
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [level, setLevel] = useState<ClassLevel>(9);
  const [goal, setGoal] = useState(60);
  const [examDate, setExamDate] = useState(defaultExam(9).date);

  const flow = STEPS;
  const idx = flow.indexOf(step);
  const go = (d: 1 | -1) => {
    haptic.soft();
    setStep(flow[Math.max(0, Math.min(flow.length - 1, idx + d))]);
  };

  const subjects = useMemo(() => coreSubjectsFor(level), [level]);

  const finish = () => {
    haptic.success();
    const exam = defaultExam(level);
    complete(
      {
        name: name.trim() || 'Scholar',
        classLevel: level,
        dailyGoalMin: goal,
        examName: exam.name,
        examDate: examDate.toISOString(),
        hue: Math.floor(Math.random() * 360),
      },
      subjects,
    );
    router.replace('/');
  };

  const canNext = step !== 'name' || name.trim().length > 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora intensity={step === 'welcome' ? 1.2 : 0.8} />
      <View style={[styles.top, { paddingTop: insets.top + space.md }]}>
        {step !== 'welcome' ? (
          <Tap onPress={() => go(-1)} accessibilityLabel="Back" style={styles.back}>
            <Icon name="chevron-back" size={20} />
          </Tap>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={styles.dots}>
          {flow.map((s, i) => (
            <View key={s} style={[styles.dot, i <= idx && { backgroundColor: colors.text, width: i === idx ? 22 : 8 }]} />
          ))}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled">
        <Animated.View key={step} entering={FadeInRight.springify().damping(18)} exiting={FadeOutLeft.duration(160)} style={{ gap: space.xxl }}>
          {step === 'welcome' && (
            <View style={{ gap: space.xxxl, paddingTop: space.huge }}>
              <Animated.View entering={FadeIn.duration(900)} style={styles.logoWrap}>
                <LinearGradient colors={[...gradients.aurora]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
                  <T style={{ fontFamily: fonts.display, fontSize: 44, lineHeight: 51, color: '#fff' }}>V</T>
                </LinearGradient>
              </Animated.View>
              <View style={{ gap: space.md }}>
                <T variant="micro" color={colors.textDim}>विद्या · knowledge</T>
                <T style={{ fontFamily: fonts.display, fontSize: 52, lineHeight: 56, letterSpacing: -2, color: colors.text }}>Study like{'\n'}it&apos;s an art.</T>
                <T variant="body" color={colors.textDim} style={{ maxWidth: 340 }}>
                  Your personal space for CBSE. Calm, focused and built around how memory really works.
                </T>
              </View>
              <View style={{ gap: space.md }}>
                {FEATURES.map((f, i) => (
                  <Animated.View key={f.text} entering={FadeInDown.delay(250 + i * 90).springify()} style={styles.feature}>
                    <View style={styles.featureIcon}>
                      <Icon name={f.icon} size={18} color={colors.primary} />
                    </View>
                    <T variant="bodyStrong">{f.text}</T>
                  </Animated.View>
                ))}
              </View>
            </View>
          )}

          {step === 'name' && (
            <>
              <Heading kicker="Let's make it yours" title="What should we call you?" />
              <Field value={name} onChangeText={setName} placeholder="Your first name" autoFocus big autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => canNext && go(1)} maxLength={30} />
            </>
          )}

          {step === 'class' && (
            <>
              <Heading kicker={`Hi ${name.trim() || 'there'} 👋`} title="Which class are you in?" body="We'll load the NCERT syllabus for your class." />
              <View style={styles.grid}>
                {CLASS_LEVELS.map((l) => {
                  const on = l === level;
                  return (
                    <Tap
                      key={l}
                      onPress={() => {
                        setLevel(l);
                        setExamDate(defaultExam(l).date);
                      }}
                      style={[styles.classTile, on && styles.classTileOn]}
                      accessibilityState={{ selected: on }}>
                      {on && <LinearGradient colors={[...gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius.lg, opacity: 0.9 }]} />}
                      <T variant="micro" color={on ? 'rgba(255,255,255,0.8)' : colors.textFaint}>Class</T>
                      <T style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 46, color: colors.text, letterSpacing: -1.5 }}>{l}</T>
                      <T variant="small" color={on ? 'rgba(255,255,255,0.85)' : colors.textFaint}>{BOOKS[l]}</T>
                    </Tap>
                  );
                })}
              </View>
            </>
          )}

          {step === 'goal' && (
            <>
              <Heading kicker="Set your rhythm" title="How much will you focus each day?" body="Consistency beats intensity. You can change this anytime." />
              <View style={styles.wrapRow}>
                {[30, 45, 60, 90, 120].map((m) => (
                  <Chip key={m} label={m < 60 ? `${m} min` : `${m / 60} hr${m > 60 ? 's' : ''}`} selected={goal === m} onPress={() => setGoal(m)} />
                ))}
              </View>
              <View style={{ gap: space.md }}>
                <T variant="h3">{defaultExam(level).name}</T>
                <T variant="small" color={colors.textDim}>Tentative date. Update it when your school or CBSE announces the schedule.</T>
                <DateStepper value={examDate} onChange={setExamDate} min={new Date()} />
              </View>
            </>
          )}

          {step === 'ready' && (
            <>
              <Heading kicker="All set" title={`Welcome to Vidya, ${name.trim() || 'Scholar'}.`} body="Here's your space for this year:" />
              <View style={{ gap: space.sm }}>
                {subjects.map((s, i) => (
                  <Animated.View key={s.id} entering={FadeInDown.delay(i * 80).springify()} style={styles.summaryRow}>
                    <View style={[styles.subjDot, { backgroundColor: s.color + '22', width: 40, height: 40 }]}>
                      <Icon name={s.icon} size={20} color={s.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T variant="bodyStrong">{s.name}</T>
                      <T variant="small" color={colors.textDim}>{s.book} · {s.chapters.length} chapters</T>
                    </View>
                  </Animated.View>
                ))}
              </View>
              <T variant="small" color={colors.textFaint}>You can add English, SST, Hindi, CS or any other subject later from Learn.</T>
            </>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        {step === 'welcome' ? (
          <View style={{ gap: space.md }}>
            <Button label="Begin" iconRight="arrow-forward" onPress={() => go(1)} />
            {cloudEnabled && <Button label="I already have an account" variant="ghost" size="md" onPress={() => router.push('/auth')} />}
          </View>
        ) : step === 'ready' ? (
          <Button label="Enter Vidya" iconRight="sparkles" onPress={finish} colorsOverride={gradients.aurora} />
        ) : (
          <Button label="Continue" iconRight="arrow-forward" onPress={() => go(1)} disabled={!canNext} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function Heading({ kicker, title, body }: { kicker: string; title: string; body?: string }) {
  return (
    <View style={{ gap: space.sm, paddingTop: space.xxl }}>
      <T variant="micro" color={colors.primary}>{kicker}</T>
      <T variant="h1">{title}</T>
      {body && <T variant="body" color={colors.textDim}>{body}</T>}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)' },
  body: { paddingHorizontal: space.xxl, width: '100%', maxWidth: 560, alignSelf: 'center' },
  logoWrap: { shadowColor: colors.primary, shadowOpacity: 0.7, shadowRadius: 40, shadowOffset: { width: 0, height: 12 }, alignSelf: 'flex-start' },
  logo: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  featureIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,108,255,0.14)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  classTile: { flex: 1, minWidth: 140, aspectRatio: 1, borderRadius: radius.lg, padding: space.md, justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  classTileOn: { borderColor: 'transparent', shadowColor: colors.primary, shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  subjDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xxl, paddingTop: space.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
});
