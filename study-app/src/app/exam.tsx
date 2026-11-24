import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addDays, daysUntil, fullDate } from '@/lib/dates';
import { uid } from '@/lib/id';
import { useStore } from '@/store';
import { live } from '@/store/selectors';
import { colors, space } from '@/theme/tokens';
import { Aurora, Button, DateStepper, Field, Glass, haptic, Header, IconButton, Section, T } from '@/ui';

export default function ExamModal() {
  const insets = useSafeAreaInsets();
  const profile = useStore((s) => s.profile)!;
  const updateProfile = useStore((s) => s.updateProfile);
  const examsRec = useStore((s) => s.data.exams);
  const upsert = useStore((s) => s.upsert);
  const remove = useStore((s) => s.remove);

  const [name, setName] = useState(profile.examName);
  const [date, setDate] = useState(new Date(profile.examDate));
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState(addDays(new Date(), 14));
  const exams = useMemo(() => live(examsRec).sort((a, b) => +new Date(a.date) - +new Date(b.date)), [examsRec]);

  const saveMain = () => {
    haptic.success();
    updateProfile({ examName: name.trim() || profile.examName, examDate: date.toISOString() });
  };
  const addExam = () => {
    if (!newName.trim()) return;
    haptic.success();
    upsert('exams', { id: uid('exam_'), name: newName.trim(), date: newDate.toISOString(), deleted: false });
    setNewName('');
  };
  const mainDirty = name !== profile.examName || date.toISOString() !== profile.examDate;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora palette={[colors.rose, colors.primaryDeep, colors.bgElevated]} intensity={0.5} />
      <View style={{ paddingTop: Platform.OS === 'ios' ? space.md : insets.top }}>
        <Header title="Exams & countdowns" />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        <Section title="Main exam">
          <Field value={name} onChangeText={setName} placeholder="e.g. Class 9 Annual Exam" icon="school-outline" />
          <DateStepper value={date} onChange={setDate} />
          <T variant="small" color={colors.textFaint}>Your school announces the exam timetable. Update this when it&apos;s out.</T>
          <Button label="Save main exam" icon="checkmark" onPress={saveMain} disabled={!mainDirty} />
        </Section>

        <Section title="Other tests">
          {exams.map((e) => (
            <Glass key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{e.name}</T>
                <T variant="small" color={colors.textDim}>{fullDate(new Date(e.date))} · {daysUntil(e.date) >= 0 ? `in ${daysUntil(e.date)} days` : 'done'}</T>
              </View>
              <IconButton icon="trash-outline" label={`Delete ${e.name}`} color={colors.danger} size={36} onPress={() => remove('exams', e.id)} />
            </Glass>
          ))}
          <Field value={newName} onChangeText={setNewName} placeholder="Unit test, pre-board, JEE Main…" icon="add-circle-outline" />
          <DateStepper value={newDate} onChange={setNewDate} min={new Date()} />
          <Button label="Add countdown" variant="secondary" icon="add" onPress={addExam} disabled={!newName.trim()} />
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl, gap: space.xxl, maxWidth: 640, alignSelf: 'center', width: '100%' },
});
