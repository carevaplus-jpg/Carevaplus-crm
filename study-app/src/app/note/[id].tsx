import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { timeAgo } from '@/lib/dates';
import { uid } from '@/lib/id';
import { XP } from '@/lib/progress';
import { useStore } from '@/store';
import { useChapter, useSubject } from '@/store/selectors';
import { colors, fonts, noOutline, space } from '@/theme/tokens';
import { Aurora, haptic, Header, IconButton, Pill, T } from '@/ui';

export default function NoteEditor() {
  const params = useLocalSearchParams<{ id: string; chapterId?: string; subjectId?: string }>();
  const insets = useSafeAreaInsets();
  const [id] = useState(() => (params.id === 'new' ? uid('note_') : params.id));
  const existing = useStore((s) => s.data.notes[id]);
  const upsert = useStore((s) => s.upsert);
  const remove = useStore((s) => s.remove);
  const award = useStore((s) => s.award);
  const chapterId = existing?.chapterId ?? params.chapterId;
  const subjectId = existing?.subjectId ?? params.subjectId;
  const ctx = useChapter(chapterId);
  const subject = useSubject(subjectId);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const created = useRef(!!existing);

  // Autosave (debounced) — notes never need a Save button.
  useEffect(() => {
    if (!title.trim() && !body.trim()) return;
    const t = setTimeout(() => {
      const now = Date.now();
      upsert('notes', {
        id,
        title: title.trim(),
        body,
        chapterId,
        subjectId,
        pinned: existing?.pinned ?? false,
        createdAt: existing?.createdAt ?? now,
        deleted: false,
      });
      if (!created.current) {
        created.current = true;
        award({ xp: XP.noteCreated }, 'New note');
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body]);

  const pinned = !!existing?.pinned;
  const accent = ctx?.subject.color ?? subject?.color ?? colors.amber;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora palette={[accent, colors.bgElevated, colors.primaryDeep]} intensity={0.45} />
      <View style={{ paddingTop: Platform.OS === 'ios' ? space.md : insets.top }}>
        <Header
          title={existing ? 'Note' : 'New note'}
          subtitle={existing ? `Edited ${timeAgo(existing.updatedAt)}` : 'Autosaves as you type'}
          right={
            existing ? (
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <IconButton icon={pinned ? 'bookmark' : 'bookmark-outline'} label={pinned ? 'Unpin' : 'Pin'} color={pinned ? colors.amber : colors.text} onPress={() => { haptic.tap(); upsert('notes', { ...existing, pinned: !pinned }); }} />
                <IconButton icon="trash-outline" label="Delete note" color={colors.danger} onPress={() => { haptic.warn(); remove('notes', id); router.back(); }} />
              </View>
            ) : undefined
          }
        />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.huge }]} keyboardShouldPersistTaps="handled">
        {(ctx || subject) && (
          <Pill label={ctx ? `${ctx.subject.name} · Ch ${ctx.chapter.number} · ${ctx.chapter.title}` : subject!.name} color={accent} />
        )}
        <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={colors.textFaint} style={styles.title} multiline selectionColor={accent} accessibilityLabel="Note title" />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={'Write it in your own words…\n\nTip: explain it like you’re teaching a friend. Gaps in the explanation are gaps in understanding.'}
          placeholderTextColor={colors.textFaint}
          style={styles.text}
          multiline
          autoFocus={!existing}
          selectionColor={accent}
          textAlignVertical="top"
          accessibilityLabel="Note body"
        />
        {body.length > 0 && <T variant="small" color={colors.textFaint}>{body.trim().split(/\s+/).filter(Boolean).length} words</T>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl, gap: space.lg, maxWidth: 720, alignSelf: 'center', width: '100%' },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.text, letterSpacing: -0.6, padding: 0, ...noOutline },
  text: { fontFamily: fonts.body, fontSize: 17, lineHeight: 27, color: colors.text, minHeight: 320, padding: 0, ...noOutline },
});
