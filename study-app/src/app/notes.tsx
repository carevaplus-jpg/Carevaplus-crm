import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { timeAgo } from '@/lib/dates';
import { useStore } from '@/store';
import { live, useMySubjects } from '@/store/selectors';
import { colors, space } from '@/theme/tokens';
import { Button, Chip, Empty, Field, Glass, Header, Icon, IconButton, Screen, T } from '@/ui';

export default function Notes() {
  const notesRec = useStore((s) => s.data.notes);
  const subjects = useMySubjects();
  const [q, setQ] = useState('');
  const [subjectId, setSubjectId] = useState<string | undefined>();

  const notes = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return live(notesRec)
      .filter((n) => (subjectId ? n.subjectId === subjectId : true))
      .filter((n) => !needle || `${n.title} ${n.body}`.toLowerCase().includes(needle))
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt);
  }, [notesRec, q, subjectId]);

  return (
    <Screen palette={[colors.amber, colors.primaryDeep, '#0B1C3A']} header={<Header title="Notes" right={<IconButton icon="add" label="New note" onPress={() => router.push({ pathname: '/note/[id]', params: { id: 'new' } })} />} />}>
      <Field value={q} onChangeText={setQ} placeholder="Search your notes" icon="search" returnKeyType="search" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        <Chip small label="All" selected={!subjectId} onPress={() => setSubjectId(undefined)} />
        {subjects.map((s) => (
          <Chip key={s.id} small label={s.name} icon={s.icon} color={s.color} selected={subjectId === s.id} onPress={() => setSubjectId(s.id)} />
        ))}
      </ScrollView>
      {notes.length === 0 ? (
        <Empty icon="document-text-outline" title={q ? 'No matches' : 'No notes yet'} body={q ? 'Try a different word.' : 'Open any chapter and write a summary in your own words. It\'s one of the most powerful ways to learn.'}>
          {!q && <Button label="Write a note" size="md" icon="create-outline" onPress={() => router.push({ pathname: '/note/[id]', params: { id: 'new' } })} style={{ marginTop: space.lg }} />}
        </Empty>
      ) : (
        <View style={{ gap: space.md }}>
          {notes.map((n, i) => {
            const s = subjects.find((x) => x.id === n.subjectId);
            return (
              <Animated.View key={n.id} entering={FadeInDown.delay(Math.min(i, 10) * 40).springify()}>
                <Glass onPress={() => router.push(`/note/${n.id}`)} style={{ gap: 6 }} tint={s ? s.color + '14' : undefined}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {n.pinned && <Icon name="bookmark" size={14} color={colors.amber} />}
                    {s && <T variant="micro" color={s.color}>{s.name}</T>}
                    <T variant="small" color={colors.textFaint} style={{ marginLeft: 'auto' }}>{timeAgo(n.updatedAt)}</T>
                  </View>
                  <T variant="h3" numberOfLines={1}>{n.title || 'Untitled'}</T>
                  <T variant="small" color={colors.textDim} numberOfLines={3}>{n.body}</T>
                </Glass>
              </Animated.View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
