import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addDays, dayKey, parseDayKey, weekdayShort } from '@/lib/dates';
import { uid } from '@/lib/id';
import { KINDS } from '@/lib/planner';
import { useStore } from '@/store';
import { useMySubjects } from '@/store/selectors';
import type { TaskKind } from '@/store/types';
import { colors, space } from '@/theme/tokens';
import { Aurora, Button, Chip, Field, haptic, Header, IconButton, T } from '@/ui';

export default function TaskModal() {
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const insets = useSafeAreaInsets();
  const existing = useStore((s) => (params.id ? s.data.tasks[params.id] : undefined));
  const upsert = useStore((s) => s.upsert);
  const remove = useStore((s) => s.remove);
  const subjects = useMySubjects();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? params.date ?? dayKey());
  const [kind, setKind] = useState<TaskKind>(existing?.kind ?? 'study');
  const [subjectId, setSubjectId] = useState<string | undefined>(existing?.subjectId);
  const [estMin, setEstMin] = useState(existing?.estMin ?? 30);

  const days = useMemo(() => Array.from({ length: 10 }, (_, i) => addDays(new Date(), i)), []);
  const label = (d: Date, i: number) => (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${weekdayShort(d)} ${d.getDate()}`);

  const save = () => {
    if (!title.trim()) return;
    haptic.success();
    upsert('tasks', {
      id: existing?.id ?? uid('task_'),
      title: title.trim(),
      date,
      kind,
      subjectId,
      chapterId: existing?.chapterId,
      estMin,
      done: existing?.done ?? false,
      createdAt: existing?.createdAt ?? Date.now(),
      deleted: false,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora palette={[colors.rose, colors.primaryDeep, colors.bgElevated]} intensity={0.5} />
      <View style={{ paddingTop: Platform.OS === 'ios' ? space.md : insets.top }}>
        <Header title={existing ? 'Edit task' : 'New task'} right={existing ? <IconButton icon="trash-outline" label="Delete task" color={colors.danger} onPress={() => { remove('tasks', existing.id); router.back(); }} /> : undefined} />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        <Field value={title} onChangeText={setTitle} placeholder="What will you do?" big autoFocus={!existing} returnKeyType="done" onSubmitEditing={save} />

        <View style={styles.group}>
          <T variant="micro" color={colors.textFaint}>When</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {date < dayKey() || !days.some((d) => dayKey(d) === date) ? <Chip small selected label={`${weekdayShort(parseDayKey(date))} ${parseDayKey(date).getDate()}`} /> : null}
            {days.map((d, i) => (
              <Chip key={i} small label={label(d, i)} selected={dayKey(d) === date} onPress={() => setDate(dayKey(d))} />
            ))}
          </ScrollView>
        </View>

        <View style={styles.group}>
          <T variant="micro" color={colors.textFaint}>Type</T>
          <View style={styles.wrap}>
            {KINDS.map((k) => (
              <Chip key={k.value} small icon={k.icon} label={k.label} selected={kind === k.value} onPress={() => setKind(k.value)} />
            ))}
          </View>
        </View>

        <View style={styles.group}>
          <T variant="micro" color={colors.textFaint}>Subject</T>
          <View style={styles.wrap}>
            <Chip small label="None" selected={!subjectId} onPress={() => setSubjectId(undefined)} />
            {subjects.map((s) => (
              <Chip key={s.id} small label={s.name} icon={s.icon} color={s.color} selected={subjectId === s.id} onPress={() => setSubjectId(s.id)} />
            ))}
          </View>
        </View>

        <View style={styles.group}>
          <T variant="micro" color={colors.textFaint}>Time needed</T>
          <View style={styles.wrap}>
            {[15, 25, 30, 45, 60, 90, 120].map((m) => (
              <Chip key={m} small label={m < 60 ? `${m}m` : `${m / 60}h`} selected={estMin === m} onPress={() => setEstMin(m)} />
            ))}
          </View>
        </View>

        <Button label={existing ? 'Save task' : 'Add to plan'} icon="checkmark" onPress={save} disabled={!title.trim()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl, gap: space.xl, maxWidth: 640, alignSelf: 'center', width: '100%' },
  group: { gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
