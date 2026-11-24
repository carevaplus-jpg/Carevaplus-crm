import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { uid } from '@/lib/id';
import { useStore } from '@/store';
import { colors, space } from '@/theme/tokens';
import { Aurora, Button, Chip, Field, haptic, Header, Icon, Tap, T } from '@/ui';

const PRESETS = [
  { name: 'English', icon: 'chatbubbles-outline', color: '#5FD1FF' },
  { name: 'Social Science', icon: 'earth-outline', color: '#FFB84D' },
  { name: 'Hindi', icon: 'text-outline', color: '#FF8A5C' },
  { name: 'Computer Science', icon: 'code-slash-outline', color: '#7CF0A0' },
  { name: 'Sanskrit', icon: 'flower-outline', color: '#F7A8FF' },
];
const COLORS = ['#5FD1FF', '#FFB84D', '#FF8A5C', '#7CF0A0', '#F7A8FF', '#A07CFF', '#FF6B95'];
const ICONS = ['book-outline', 'chatbubbles-outline', 'earth-outline', 'code-slash-outline', 'calculator-outline', 'musical-notes-outline', 'brush-outline', 'globe-outline'];

export default function CustomSubject() {
  const insets = useSafeAreaInsets();
  const profile = useStore((s) => s.profile)!;
  const upsert = useStore((s) => s.upsert);
  const [name, setName] = useState('');
  const [book, setBook] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [chapters, setChapters] = useState('');

  const lines = chapters.split('\n').map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);
  const valid = name.trim().length > 0;

  const save = () => {
    if (!valid) return;
    haptic.success();
    const id = uid('custom_');
    upsert('subjects', {
      id,
      key: 'custom',
      classLevel: profile.classLevel,
      name: name.trim(),
      book: book.trim() || 'My syllabus',
      color,
      glow: color + '55',
      icon,
      chapters: (lines.length ? lines : ['Chapter 1']).map((t, i) => ({ id: `${id}-${i + 1}`, number: i + 1, title: t })),
      custom: true,
      deleted: false,
    });
    router.replace(`/subject/${id}`);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora palette={[color, colors.primaryDeep, colors.bgElevated]} intensity={0.5} />
      <View style={{ paddingTop: Platform.OS === 'ios' ? space.md : insets.top }}>
        <Header title="Add a subject" />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.wrap}>
          {PRESETS.map((p) => (
            <Chip key={p.name} small label={p.name} icon={p.icon} color={p.color} selected={name === p.name} onPress={() => { setName(p.name); setIcon(p.icon); setColor(p.color); }} />
          ))}
        </View>
        <Field label="Subject name" value={name} onChangeText={setName} placeholder="e.g. English Core" />
        <Field label="Textbook (optional)" value={book} onChangeText={setBook} placeholder="e.g. Flamingo & Vistas" />

        <View style={{ gap: space.sm }}>
          <T variant="micro" color={colors.textFaint}>Colour & icon</T>
          <View style={styles.wrap}>
            {COLORS.map((c) => (
              <Tap key={c} onPress={() => setColor(c)} style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]} accessibilityLabel={`Colour ${c}`} accessibilityState={{ selected: color === c }}>
                <View />
              </Tap>
            ))}
          </View>
          <View style={styles.wrap}>
            {ICONS.map((i) => (
              <Tap key={i} onPress={() => setIcon(i)} style={[styles.iconPick, icon === i && { borderColor: color, backgroundColor: color + '22' }]} accessibilityLabel={i} accessibilityState={{ selected: icon === i }}>
                <Icon name={i} size={20} color={icon === i ? color : colors.textDim} />
              </Tap>
            ))}
          </View>
        </View>

        <Field label={`Chapters · ${lines.length}`} value={chapters} onChangeText={setChapters} placeholder={'One chapter per line\n1. The Last Lesson\n2. Lost Spring\n3. Deep Water'} multiline />
        <Button label="Create subject" icon="checkmark" onPress={save} disabled={!valid} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl, gap: space.xl, maxWidth: 640, alignSelf: 'center', width: '100%' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  swatchOn: { borderWidth: 3, borderColor: '#fff' },
  iconPick: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
});
