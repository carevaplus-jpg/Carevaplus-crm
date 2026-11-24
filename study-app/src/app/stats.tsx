import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { addDays, dayKey, formatMinutes, startOfWeek, weekdayShort } from '@/lib/dates';
import { useStore } from '@/store';
import { live, useMySubjects } from '@/store/selectors';
import { colors, fonts, radius, space } from '@/theme/tokens';
import { Bars, Glass, Header, Screen, Section, T } from '@/ui';

const WEEKS = 15;
const heat = (m: number) => (m <= 0 ? 'rgba(255,255,255,0.05)' : m < 15 ? '#8B6CFF40' : m < 45 ? '#8B6CFF80' : m < 90 ? '#8B6CFFC0' : '#B39BFF');

export default function Stats() {
  const data = useStore((s) => s.data);
  const subjects = useMySubjects();

  const grid = useMemo(() => {
    const start = addDays(startOfWeek(), -(WEEKS - 1) * 7);
    return Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const date = addDays(start, w * 7 + d);
        const rec = data.days[dayKey(date)];
        return { key: dayKey(date), future: date > new Date(), min: rec && !rec.deleted ? rec.focusMin : 0 };
      }),
    );
  }, [data.days]);

  const sessions = useMemo(() => live(data.sessions), [data.sessions]);
  const bySubject = useMemo(() => {
    const m = new Map<string, number>();
    sessions.forEach((s) => m.set(s.subjectId ?? 'general', (m.get(s.subjectId ?? 'general') ?? 0) + s.minutes));
    return [...m.entries()]
      .map(([id, min]) => {
        const s = subjects.find((x) => x.id === id);
        return { id, min, name: s?.name ?? 'General', color: s?.color ?? colors.textDim };
      })
      .sort((a, b) => b.min - a.min);
  }, [sessions, subjects]);
  const maxSub = Math.max(1, ...bySubject.map((b) => b.min));

  const accuracy = useMemo(() => {
    const attempts = live(data.attempts);
    return subjects
      .map((s) => {
        const mine = attempts.filter((a) => a.subjectId === s.id);
        const total = mine.reduce((n, a) => n + a.total, 0);
        const right = mine.reduce((n, a) => n + a.correct, 0);
        return { s, total, pct: total ? right / total : 0 };
      })
      .filter((x) => x.total > 0);
  }, [data.attempts, subjects]);

  const forecast = useMemo(() => {
    const cards = live(data.cards);
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const end = addDays(new Date(today.getFullYear(), today.getMonth(), today.getDate()), i + 1).getTime();
      const startMs = i === 0 ? -Infinity : addDays(new Date(today.getFullYear(), today.getMonth(), today.getDate()), i).getTime();
      return { label: i === 0 ? 'Now' : weekdayShort(addDays(today, i)).slice(0, 2), value: cards.filter((c) => c.srs.due >= startMs && c.srs.due < end).length };
    });
  }, [data.cards]);

  const totalMin = sessions.reduce((n, s) => n + s.minutes, 0);
  const avg = sessions.length ? Math.round(totalMin / sessions.length) : 0;
  const activeDays = grid.flat().filter((c) => c.min > 0).length;

  return (
    <Screen header={<Header title="Statistics" />}>
      <View style={styles.row}>
        {[
          { v: formatMinutes(totalMin), l: 'Total focus' },
          { v: `${sessions.length}`, l: 'Sessions' },
          { v: avg ? `${avg}m` : '—', l: 'Avg session' },
        ].map((x) => (
          <Glass key={x.l} style={{ flex: 1, gap: 4 }}>
            <T style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 25, color: colors.text, letterSpacing: -0.6 }}>{x.v}</T>
            <T variant="small" color={colors.textFaint}>{x.l}</T>
          </Glass>
        ))}
      </View>

      <Animated.View entering={FadeInDown.springify()}>
        <Section title="Consistency">
          <Glass style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', gap: 4, alignSelf: 'center' }}>
              {grid.map((week, w) => (
                <View key={w} style={{ gap: 4 }}>
                  {week.map((c) => (
                    <View key={c.key} style={[styles.cell, { backgroundColor: c.future ? 'transparent' : heat(c.min) }]} accessibilityLabel={`${c.key}: ${c.min} minutes`} />
                  ))}
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T variant="small" color={colors.textDim}>{activeDays} active days in {WEEKS} weeks</T>
              <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
                <T variant="micro" color={colors.textFaint}>Less</T>
                {[0, 10, 30, 60, 120].map((m) => (
                  <View key={m} style={[styles.cell, { width: 10, height: 10, backgroundColor: heat(m) }]} />
                ))}
                <T variant="micro" color={colors.textFaint}>More</T>
              </View>
            </View>
          </Glass>
        </Section>
      </Animated.View>

      <Section title="Flashcards due · next 7 days">
        <Glass>
          <Bars data={forecast} highlight={0} color={colors.mint} unit="cards" height={90} />
        </Glass>
      </Section>

      <Section title="Where your time goes">
        <Glass style={{ gap: space.md }}>
          {bySubject.length === 0 && <T variant="small" color={colors.textDim}>Complete a focus session to see your subject split.</T>}
          {bySubject.map((b) => (
            <View key={b.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T variant="bodyStrong">{b.name}</T>
                <T variant="small" color={colors.textDim}>{formatMinutes(b.min)}</T>
              </View>
              <View style={styles.track}>
                <View style={{ width: `${(b.min / maxSub) * 100}%`, height: '100%', borderRadius: 4, backgroundColor: b.color }} />
              </View>
            </View>
          ))}
        </Glass>
      </Section>

      <Section title="Quiz accuracy">
        <Glass style={{ gap: space.md }}>
          {accuracy.length === 0 && <T variant="small" color={colors.textDim}>Take a chapter quiz to start tracking accuracy.</T>}
          {accuracy.map(({ s, pct, total }) => (
            <View key={s.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T variant="bodyStrong">{s.name}</T>
                <T variant="small" color={colors.textDim}>{Math.round(pct * 100)}% · {total} Qs</T>
              </View>
              <View style={styles.track}>
                <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 4, backgroundColor: pct >= 0.8 ? colors.mint : pct >= 0.5 ? colors.amber : colors.rose }} />
              </View>
            </View>
          ))}
        </Glass>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  cell: { width: 16, height: 16, borderRadius: 4 },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
});
