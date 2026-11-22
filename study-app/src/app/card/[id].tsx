import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/store';
import { useChapter } from '@/store/selectors';
import { colors, space } from '@/theme/tokens';
import { Aurora, Button, Field, haptic, Header, IconButton, Pill, T } from '@/ui';

export default function CardEditor() {
  const params = useLocalSearchParams<{ id: string; chapterId?: string; subjectId?: string }>();
  const insets = useSafeAreaInsets();
  const existing = useStore((s) => (params.id !== 'new' ? s.data.cards[params.id] : undefined));
  const addCard = useStore((s) => s.addCard);
  const upsert = useStore((s) => s.upsert);
  const remove = useStore((s) => s.remove);
  const chapterId = existing?.chapterId ?? params.chapterId;
  const ctx = useChapter(chapterId);

  const [front, setFront] = useState(existing?.front ?? '');
  const [back, setBack] = useState(existing?.back ?? '');
  const [added, setAdded] = useState(0);
  const valid = front.trim().length > 0 && back.trim().length > 0 && !!ctx;

  const save = (another: boolean) => {
    if (!valid || !ctx) return;
    haptic.success();
    if (existing) {
      upsert('cards', { ...existing, front: front.trim(), back: back.trim() });
      router.back();
      return;
    }
    addCard({ chapterId: ctx.chapter.id, subjectId: ctx.subject.id, front: front.trim(), back: back.trim() });
    if (another) {
      setFront('');
      setBack('');
      setAdded((n) => n + 1);
    } else router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora palette={[ctx?.subject.color ?? colors.mint, colors.bgElevated, colors.primaryDeep]} intensity={0.5} />
      <View style={{ paddingTop: Platform.OS === 'ios' ? space.md : insets.top }}>
        <Header
          title={existing ? 'Edit card' : 'New flashcard'}
          subtitle={added ? `${added} added this session` : undefined}
          right={existing ? <IconButton icon="trash-outline" label="Delete card" color={colors.danger} onPress={() => { remove('cards', existing.id); router.back(); }} /> : undefined}
        />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        {ctx && <Pill label={`${ctx.subject.name} · Ch ${ctx.chapter.number} · ${ctx.chapter.title}`} color={ctx.subject.color} />}
        <Field label="Front: question or prompt" value={front} onChangeText={setFront} placeholder="e.g. State Ohm's law" multiline autoFocus={!existing} />
        <Field label="Back: answer" value={back} onChangeText={setBack} placeholder="e.g. V = IR at constant temperature" multiline />
        <T variant="small" color={colors.textFaint}>Great cards are atomic: one fact per card, phrased as a question you could be asked in the exam.</T>
        <Button label={existing ? 'Save changes' : 'Save card'} icon="checkmark" onPress={() => save(false)} disabled={!valid} />
        {!existing && <Button label="Save & add another" variant="secondary" onPress={() => save(true)} disabled={!valid} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl, gap: space.lg, maxWidth: 640, alignSelf: 'center', width: '100%' },
});
