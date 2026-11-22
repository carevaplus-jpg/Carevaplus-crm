import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMinutes } from '@/lib/dates';
import { XP } from '@/lib/progress';
import { useStore } from '@/store';
import { useMySubjects, useStats } from '@/store/selectors';
import type { Ambient } from '@/store/types';
import { useUi } from '@/store/ui';
import { colors, fonts, gradients, radius, space } from '@/theme/tokens';
import { Aurora, Button, Chip, haptic, Icon, IconButton, Ring, Tap, T, TAB_BAR_SPACE } from '@/ui';

const SOUNDS: Record<Exclude<Ambient, 'none'>, number> = {
  rain: require('@/assets/sounds/rain.wav'),
  brown: require('@/assets/sounds/brown.wav'),
  ocean: require('@/assets/sounds/ocean.wav'),
  night: require('@/assets/sounds/night.wav'),
};
const AMBIENTS: { value: Ambient; label: string; icon: string }[] = [
  { value: 'none', label: 'Silence', icon: 'volume-mute-outline' },
  { value: 'rain', label: 'Rain', icon: 'rainy-outline' },
  { value: 'brown', label: 'Brown noise', icon: 'radio-outline' },
  { value: 'ocean', label: 'Ocean', icon: 'water-outline' },
  { value: 'night', label: 'Night', icon: 'moon-outline' },
];
const PRESETS = [
  { focus: 25, rest: 5, name: 'Pomodoro' },
  { focus: 50, rest: 10, name: 'Deep work' },
  { focus: 90, rest: 15, name: 'Flow state' },
];

/** Native player is an imperative object; keep its mutation outside render code. */
function configurePlayer(player: AudioPlayer, volume: number, playing: boolean) {
  try {
    player.loop = true;
    player.volume = volume;
    if (playing) player.play();
    else player.pause();
  } catch {
    // player can be released during fast unmounts
  }
}

type Phase = 'idle' | 'focus' | 'paused' | 'done' | 'break';

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function Focus() {
  const params = useLocalSearchParams<{ subjectId?: string; chapterId?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const logFocus = useStore((s) => s.logFocus);
  const subjects = useMySubjects();
  const stats = useStats();
  const setImmersive = useUi((s) => s.setImmersive);

  const [subjectId, setSubjectId] = useState<string | undefined>(params.subjectId);
  const [chapterId, setChapterId] = useState<string | undefined>(params.chapterId);
  const [phase, setPhase] = useState<Phase>('idle');
  const [duration, setDuration] = useState(settings.focusMin * 60000);
  const [remaining, setRemaining] = useState(settings.focusMin * 60000);
  const [total, setTotal] = useState(settings.focusMin * 60000);
  const [lastMinutes, setLastMinutes] = useState(0);
  const [round, setRound] = useState(1);
  const endAt = useRef(0);

  // Deep links from chapter/subject screens re-target the session
  const paramKey = `${params.subjectId ?? ''}|${params.chapterId ?? ''}`;
  const [seenParams, setSeenParams] = useState(paramKey);
  if (paramKey !== seenParams) {
    setSeenParams(paramKey);
    if (params.subjectId) setSubjectId(params.subjectId);
    if (params.chapterId) setChapterId(params.chapterId);
  }

  const subject = subjects.find((s) => s.id === subjectId);
  const chapter = subject?.chapters.find((c) => c.id === chapterId);
  const accent = subject?.color ?? colors.primary;

  // ── Ambient audio ──
  const player = useAudioPlayer(settings.ambient === 'none' ? null : SOUNDS[settings.ambient]);
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
  }, []);
  const running = phase === 'focus' || phase === 'break';
  useEffect(() => {
    if (player) configurePlayer(player, settings.ambientVolume, running && settings.ambient !== 'none');
  }, [player, running, settings.ambient, settings.ambientVolume]);

  // ── Immersion: hide tab bar + keep the screen awake while a session is live ──
  const live = phase !== 'idle';
  useEffect(() => {
    setImmersive(live);
    if (live) activateKeepAwakeAsync('focus').catch(() => {});
    else deactivateKeepAwake('focus').catch(() => {});
  }, [live, setImmersive]);
  useFocusEffect(
    useCallback(() => () => {
      setImmersive(false);
      deactivateKeepAwake('focus').catch(() => {});
    }, [setImmersive]),
  );

  // ── Clock (timestamp-based, survives backgrounding) ──
  const complete = useCallback(() => {
    if (phase === 'focus') {
      const minutes = Math.round(duration / 60000);
      logFocus(minutes, subjectId, chapterId);
      setLastMinutes(minutes);
      haptic.success();
      setPhase('done');
    } else if (phase === 'break') {
      haptic.firm();
      setPhase('idle');
      setRemaining(settings.focusMin * 60000);
      setDuration(settings.focusMin * 60000);
    }
  }, [phase, duration, logFocus, subjectId, chapterId, settings.focusMin]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = endAt.current - Date.now();
      setRemaining(left);
      if (left <= 0) complete();
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [running, complete]);

  const start = (ms = duration, next: Phase = 'focus') => {
    endAt.current = Date.now() + ms;
    setTotal(ms);
    if (next === 'focus') setDuration(ms);
    setRemaining(ms);
    setPhase(next);
    haptic.firm();
  };
  const pause = () => {
    setRemaining(endAt.current - Date.now());
    setPhase('paused');
    haptic.tap();
  };
  const resume = () => {
    endAt.current = Date.now() + remaining;
    setPhase('focus');
    haptic.tap();
  };
  const end = () => {
    const elapsed = Math.floor((duration - remaining) / 60000);
    if (phase === 'focus' || phase === 'paused') {
      if (elapsed >= 1) {
        logFocus(elapsed, subjectId, chapterId);
        setLastMinutes(elapsed);
        setPhase('done');
        return;
      }
    }
    setPhase('idle');
    setRemaining(duration);
  };
  const setPreset = (focusMin: number, restMin: number) => {
    updateSettings({ focusMin, breakMin: restMin });
    setDuration(focusMin * 60000);
    setRemaining(focusMin * 60000);
  };
  const nudge = (d: number) => setPreset(Math.min(180, Math.max(5, settings.focusMin + d)), settings.breakMin);

  // ── Breathing orb ──
  const breath = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(breath);
    if (running) {
      breath.set(
        withRepeat(
          withSequence(
            withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
        ),
      );
    } else {
      breath.set(withTiming(0.3, { duration: 600 }));
    }
  }, [running, breath]);
  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.94 + breath.value * 0.08 }], opacity: 0.75 + breath.value * 0.25 }));
  const haloStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.18 }], opacity: 0.25 + breath.value * 0.35 }));

  const orbSize = Math.min(width - 80, 300);
  const progress = phase === 'idle' || phase === 'done' ? (phase === 'done' ? 1 : 0) : 1 - remaining / total;
  const palette = useMemo(() => [accent, phase === 'break' ? colors.mint : colors.primaryDeep, '#0B1C3A'], [accent, phase]);

  const restMin = round % 4 === 0 ? settings.longBreakMin : settings.breakMin;

  return (
    <View style={{ flex: 1 }}>
      <Aurora palette={palette} intensity={running ? 1.25 : 0.9} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg, paddingBottom: (live ? space.xxxl : TAB_BAR_SPACE) + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!running}>
        {/* Top bar */}
        <View style={styles.topRow}>
          <View>
            <T variant="micro" color={colors.textDim}>{phase === 'break' ? 'Recharge' : phase === 'done' ? 'Well done' : live ? `Round ${round}` : 'Focus'}</T>
            <T variant="h2">{phase === 'break' ? 'Breathe. Stretch. Water.' : subject ? subject.name : 'Deep focus'}</T>
          </View>
          {!live ? (
            <View style={styles.todayPill}>
              <Icon name="time-outline" size={14} color={colors.textDim} />
              <T variant="small" color={colors.textDim}>{formatMinutes(stats.todayMin)} today</T>
            </View>
          ) : (
            <IconButton icon="close" label="End session" onPress={end} />
          )}
        </View>
        {chapter && <T variant="small" color={colors.textDim} numberOfLines={1} style={{ marginTop: -space.md }}>Ch {chapter.number} · {chapter.title}</T>}

        {/* Orb */}
        <View style={[styles.orbWrap, { height: orbSize + 40 }]}>
          <Animated.View style={[styles.halo, { width: orbSize, height: orbSize, borderRadius: orbSize / 2, backgroundColor: accent }, haloStyle]} />
          <Ring size={orbSize} stroke={4} progress={progress} color={phase === 'break' ? colors.mint : accent} color2={colors.text} track="rgba(255,255,255,0.06)">
            <Animated.View style={[{ width: orbSize - 40, height: orbSize - 40, borderRadius: orbSize, overflow: 'hidden' }, orbStyle]}>
              <LinearGradient colors={phase === 'break' ? [...gradients.mint] : [accent, colors.primaryDeep]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={styles.orbInner} />
            </Animated.View>
            <View style={styles.timeWrap} pointerEvents="none">
              {phase === 'done' ? (
                <Animated.View entering={FadeIn} style={{ alignItems: 'center' }}>
                  <Icon name="checkmark-circle" size={44} color="#fff" />
                  <T style={styles.doneText}>{lastMinutes} min</T>
                </Animated.View>
              ) : (
                <>
                  <T style={[styles.time, { fontSize: orbSize * 0.22, lineHeight: orbSize * 0.26 }]}>{mmss(phase === 'idle' ? settings.focusMin * 60000 : remaining)}</T>
                  <T variant="micro" color="rgba(255,255,255,0.75)">{phase === 'paused' ? 'Paused' : phase === 'break' ? 'Break' : running ? 'Breathe with the orb' : `${settings.focusMin} min session`}</T>
                </>
              )}
            </View>
          </Ring>
        </View>

        {/* Controls */}
        {phase === 'idle' && (
          <Animated.View entering={FadeInDown.springify()} exiting={FadeOut} style={{ gap: space.xl }}>
            <View style={styles.stepper}>
              <IconButton icon="remove" label="Shorter" onPress={() => nudge(-5)} />
              <View style={{ flexDirection: 'row', gap: space.sm, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                {PRESETS.map((p) => (
                  <Chip key={p.name} small label={`${p.focus}′ ${p.name}`} selected={settings.focusMin === p.focus} onPress={() => setPreset(p.focus, p.rest)} color={accent} />
                ))}
              </View>
              <IconButton icon="add" label="Longer" onPress={() => nudge(5)} />
            </View>

            <View style={{ gap: space.sm }}>
              <T variant="micro" color={colors.textFaint}>Studying</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                <Chip label="Anything" small selected={!subjectId} onPress={() => { setSubjectId(undefined); setChapterId(undefined); }} />
                {subjects.map((s) => (
                  <Chip key={s.id} small label={s.name} icon={s.icon} color={s.color} selected={subjectId === s.id} onPress={() => { setSubjectId(s.id); setChapterId(undefined); }} />
                ))}
              </ScrollView>
            </View>

            <View style={{ gap: space.sm }}>
              <T variant="micro" color={colors.textFaint}>Soundscape</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                {AMBIENTS.map((a) => (
                  <Chip key={a.value} small label={a.label} icon={a.icon} selected={settings.ambient === a.value} onPress={() => updateSettings({ ambient: a.value })} color={colors.mint} />
                ))}
              </ScrollView>
            </View>

            <Button label="Begin focus" icon="play" onPress={() => start(settings.focusMin * 60000)} colorsOverride={[accent, colors.primaryDeep]} />
            <T variant="small" color={colors.textFaint} center>
              Earn {settings.focusMin * XP.focusMinute} XP · {Platform.OS === 'web' ? 'keep this tab open' : 'screen stays awake'} · phone face down 📵
            </T>
          </Animated.View>
        )}

        {(phase === 'focus' || phase === 'paused' || phase === 'break') && (
          <Animated.View entering={FadeInDown.springify()} style={styles.liveControls}>
            {phase === 'break' ? (
              <Button label="Skip break" icon="play-skip-forward" variant="secondary" onPress={() => { setPhase('idle'); setRemaining(duration); }} style={{ flex: 1 }} />
            ) : (
              <>
                <Tap onPress={phase === 'paused' ? resume : pause} style={styles.bigCtl} feedback="soft" accessibilityLabel={phase === 'paused' ? 'Resume' : 'Pause'}>
                  <Icon name={phase === 'paused' ? 'play' : 'pause'} size={30} color={colors.text} />
                </Tap>
                <Button label="Finish early" variant="secondary" size="md" onPress={end} />
              </>
            )}
          </Animated.View>
        )}

        {phase === 'done' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: space.md }}>
            <View style={styles.doneCard}>
              <T variant="h3" center>+{lastMinutes * XP.focusMinute} XP earned</T>
              <T variant="small" color={colors.textDim} center>Your brain consolidates memory during rest. Take the break; it counts.</T>
            </View>
            <Button label={`Take a ${restMin}-min break`} icon="cafe-outline" colorsOverride={gradients.mint} onPress={() => { setRound((r) => r + 1); start(restMin * 60000, 'break'); }} />
            <Button label="Another round" icon="refresh" variant="secondary" onPress={() => { setRound((r) => r + 1); start(settings.focusMin * 60000); }} />
            <Button label="I'm done for now" variant="ghost" size="md" onPress={() => { setPhase('idle'); setRemaining(duration); if (chapterId) router.push(`/chapter/${chapterId}`); }} />
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, gap: space.xl, width: '100%', maxWidth: 560, alignSelf: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, height: 32, borderRadius: radius.pill, backgroundColor: colors.surface },
  orbWrap: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', opacity: 0.3 },
  orbInner: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.04)' },
  timeWrap: { position: 'absolute', alignItems: 'center', gap: 4 },
  time: { fontFamily: fonts.displayLight, color: '#fff', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  doneText: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: '#fff', marginTop: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  liveControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xl },
  bigCtl: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.borderStrong },
  doneCard: { padding: space.xl, gap: 6, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
