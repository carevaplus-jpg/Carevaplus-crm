import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { askTutor, TUTOR_STARTERS } from '@/lib/tutor';
import { useStore } from '@/store';
import { useChapter } from '@/store/selectors';
import { colors, fonts, gradients, noOutline, radius, space } from '@/theme/tokens';
import { Aurora, Chip, haptic, Icon, IconButton, Pill, Tap, T, TAB_BAR_SPACE } from '@/ui';
import { RichText } from '@/ui/RichText';

function Dot({ delay }: { delay: number }) {
  const v = useSharedValue(0.3);
  useEffect(() => {
    v.set(withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1)));
  }, [v, delay]);
  const s = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 3 }] }));
  return <Animated.View style={[styles.typingDot, s]} />;
}

export default function Tutor() {
  const params = useLocalSearchParams<{ chapterId?: string }>();
  const insets = useSafeAreaInsets();
  const profile = useStore((s) => s.profile)!;
  const chat = useStore((s) => s.chat);
  const pushChat = useStore((s) => s.pushChat);
  const clearChat = useStore((s) => s.clearChat);
  const mode = useStore((s) => s.settings.tutorMode);
  const [chapterId, setChapterId] = useState<string | undefined>(params.chapterId);
  const ctxChapter = useChapter(chapterId);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);

  const [seenParam, setSeenParam] = useState(params.chapterId);
  if (params.chapterId !== seenParam) {
    setSeenParam(params.chapterId);
    if (params.chapterId) setChapterId(params.chapterId);
  }

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [chat.length, thinking]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || thinking) return;
    haptic.soft();
    setInput('');
    pushChat({ role: 'user', text: msg, chapterId });
    setThinking(true);
    const history = [...useStore.getState().chat];
    const reply = await askTutor(history, {
      name: profile.name,
      classLevel: profile.classLevel,
      stream: profile.stream,
      subject: ctxChapter?.subject.name,
      chapter: ctxChapter?.chapter.title,
      chapterId,
      examName: profile.examName,
      examDate: profile.examDate,
    });
    setThinking(false);
    pushChat({ role: 'assistant', text: reply.text, chapterId });
    haptic.tap();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <Aurora palette={['#FF6B95', '#8B6CFF', '#2F6BFF']} intensity={0.7} />
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <LinearGradient colors={[...gradients.sunrise]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
          <Icon name="sparkles" size={20} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <T variant="h3">Vidya Tutor</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.status, { backgroundColor: mode === 'cloud' ? colors.mint : colors.amber }]} />
            <T variant="small" color={colors.textDim}>{mode === 'cloud' ? 'AI connected' : 'Demo mode · offline'}</T>
          </View>
        </View>
        {chat.length > 0 && <IconButton icon="refresh" label="New chat" onPress={() => { haptic.tap(); clearChat(); }} />}
        <IconButton icon="settings-outline" label="Tutor settings" onPress={() => router.push('/settings')} />
      </View>

      {ctxChapter && (
        <View style={styles.ctx}>
          <Pill label={`Context · ${ctxChapter.subject.name} Ch ${ctxChapter.chapter.number}`} color={ctxChapter.subject.color} />
          <Tap onPress={() => setChapterId(undefined)} accessibilityLabel="Remove chapter context">
            <Icon name="close-circle" size={18} color={colors.textFaint} />
          </Tap>
        </View>
      )}

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {chat.length === 0 && (
          <Animated.View entering={FadeInDown.springify()} style={styles.hello}>
            <T style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.text, letterSpacing: -1 }}>
              Namaste, {profile.name.split(' ')[0]}.{'\n'}
              <T style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.textDim }}>What shall we learn?</T>
            </T>
            <T variant="body" color={colors.textDim}>Ask about any NCERT topic, get quizzed, or plan your prep. I&apos;ll explain step by step, like a patient senior.</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
              {TUTOR_STARTERS.map((s) => (
                <Chip key={s} label={s} small onPress={() => send(ctxChapter && s.includes('chapter') ? `${s}: ${ctxChapter.chapter.title}` : s)} />
              ))}
            </View>
          </Animated.View>
        )}
        {chat.map((m) => (
          <Animated.View key={m.id} entering={FadeInUp.springify().damping(18)} style={[styles.bubbleRow, m.role === 'user' && { justifyContent: 'flex-end' }]}>
            {m.role === 'user' ? (
              <LinearGradient colors={[...gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.userBubble]}>
                <T variant="body" color="#fff">{m.text}</T>
              </LinearGradient>
            ) : (
              <View style={[styles.bubble, styles.botBubble]}>
                <RichText text={m.text} />
              </View>
            )}
          </Animated.View>
        ))}
        {thinking && (
          <Animated.View entering={FadeInUp} style={styles.bubbleRow}>
            <View style={[styles.bubble, styles.botBubble, { flexDirection: 'row', gap: 6, paddingVertical: 16 }]}>
              <Dot delay={0} />
              <Dot delay={150} />
              <Dot delay={300} />
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.composer, { marginBottom: TAB_BAR_SPACE + insets.bottom - 24 }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything…"
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
          style={styles.input}
          multiline
          maxLength={2000}
          onSubmitEditing={() => send(input)}
          blurOnSubmit={false}
          accessibilityLabel="Message the tutor"
        />
        <Tap onPress={() => send(input)} feedback="none" style={[styles.send, { opacity: input.trim() && !thinking ? 1 : 0.4 }]} accessibilityLabel="Send">
          <LinearGradient colors={[...gradients.primary]} style={StyleSheet.absoluteFill} />
          <Icon name="arrow-up" size={20} color="#fff" />
        </Tap>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingBottom: space.md, width: '100%', maxWidth: 760, alignSelf: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  status: { width: 7, height: 7, borderRadius: 4 },
  ctx: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xl, paddingBottom: space.sm, width: '100%', maxWidth: 760, alignSelf: 'center' },
  list: { padding: space.xl, gap: space.md, paddingBottom: space.xxl, width: '100%', maxWidth: 760, alignSelf: 'center' },
  hello: { gap: space.md, paddingTop: space.xxl },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '88%', paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.lg },
  userBubble: { borderBottomRightRadius: 6, overflow: 'hidden' },
  botBubble: { backgroundColor: 'rgba(22,22,40,0.85)', borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textDim },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginHorizontal: space.lg, padding: 6, paddingLeft: space.lg, borderRadius: radius.xl, backgroundColor: 'rgba(18,18,32,0.95)', borderWidth: 1, borderColor: colors.borderStrong, width: undefined, maxWidth: 760, alignSelf: 'stretch' },
  input: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 16, maxHeight: 120, paddingVertical: 10, ...noOutline },
  send: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
