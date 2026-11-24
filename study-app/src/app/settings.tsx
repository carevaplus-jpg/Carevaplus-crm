import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, StyleSheet, Switch, View } from 'react-native';

import { CLASS_LEVELS, coreSubjectsFor, type ClassLevel } from '@/data/syllabus';
import { cloudEnabled, supabase, useSession } from '@/lib/supabase';
import { syncNow } from '@/lib/sync';
import { useStore } from '@/store';
import { colors, space } from '@/theme/tokens';
import { Button, Chip, Field, Glass, haptic, Header, Icon, Screen, Section, Segmented, Tap, T } from '@/ui';

function Row({ icon, label, children }: { icon: string; label: string; children?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={18} color={colors.textDim} />
      <T variant="bodyStrong" style={{ flex: 1 }}>{label}</T>
      {children}
    </View>
  );
}

export default function Settings() {
  const profile = useStore((s) => s.profile)!;
  const settings = useStore((s) => s.settings);
  const updateProfile = useStore((s) => s.updateProfile);
  const updateSettings = useStore((s) => s.updateSettings);
  const seedCards = useStore((s) => s.seedCards);
  const resetAll = useStore((s) => s.resetAll);
  const session = useSession();
  const [name, setName] = useState(profile.name);
  const [endpoint, setEndpoint] = useState(settings.tutorEndpoint ?? '');
  const [confirmReset, setConfirmReset] = useState(false);

  const changeClass = (level: ClassLevel) => {
    updateProfile({ classLevel: level });
    seedCards(coreSubjectsFor(level));
  };

  const exportData = async () => {
    const st = useStore.getState();
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), profile: st.profile, settings: st.settings, data: st.data }, null, 2);
    try {
      await Share.share({ title: 'Vidya backup', message: json });
    } catch {
      // user cancelled
    }
  };

  return (
    <Screen header={<Header title="Settings" />}>
      <Section title="Profile">
        <Field value={name} onChangeText={setName} onBlur={() => name.trim() && updateProfile({ name: name.trim() })} placeholder="Your name" icon="person-outline" />
        <Glass style={{ gap: space.lg }}>
          <View style={{ gap: space.sm }}>
            <T variant="micro" color={colors.textFaint}>Class</T>
            <View style={styles.wrap}>
              {CLASS_LEVELS.map((l) => (
                <Chip key={l} small label={`Class ${l}`} selected={profile.classLevel === l} onPress={() => changeClass(l)} />
              ))}
            </View>
          </View>
          <View style={{ gap: space.sm }}>
            <T variant="micro" color={colors.textFaint}>Daily focus goal</T>
            <View style={styles.wrap}>
              {[30, 60, 90, 120, 180, 240].map((m) => (
                <Chip key={m} small label={m < 60 ? `${m}m` : `${m / 60}h`} selected={profile.dailyGoalMin === m} onPress={() => updateProfile({ dailyGoalMin: m })} />
              ))}
            </View>
          </View>
          <Tap onPress={() => router.push('/exam')} style={styles.linkRow}>
            <Icon name="calendar-outline" size={18} color={colors.textDim} />
            <T variant="bodyStrong" style={{ flex: 1 }}>Exam dates & countdowns</T>
            <Icon name="chevron-forward" size={16} color={colors.textFaint} />
          </Tap>
        </Glass>
      </Section>

      <Section title="Focus">
        <Glass style={{ gap: space.lg }}>
          {([
            ['Focus length', 'focusMin', [25, 30, 45, 50, 60, 90]],
            ['Short break', 'breakMin', [5, 10, 15]],
            ['Long break (every 4th)', 'longBreakMin', [15, 20, 30]],
          ] as const).map(([label, key, opts]) => (
            <View key={key} style={{ gap: space.sm }}>
              <T variant="micro" color={colors.textFaint}>{label}</T>
              <View style={styles.wrap}>
                {opts.map((m) => (
                  <Chip key={m} small label={`${m}m`} selected={settings[key] === m} onPress={() => updateSettings({ [key]: m })} />
                ))}
              </View>
            </View>
          ))}
          <View style={{ gap: space.sm }}>
            <T variant="micro" color={colors.textFaint}>Soundscape volume</T>
            <View style={styles.wrap}>
              {[0.25, 0.5, 0.75, 1].map((v) => (
                <Chip key={v} small label={`${v * 100}%`} selected={Math.abs(settings.ambientVolume - v) < 0.01} onPress={() => updateSettings({ ambientVolume: v })} />
              ))}
            </View>
          </View>
          {Platform.OS !== 'web' && (
            <Row icon="phone-portrait-outline" label="Haptic feedback">
              <Switch value={settings.haptics} onValueChange={(v) => updateSettings({ haptics: v })} trackColor={{ true: colors.primary, false: colors.surfaceStrong }} thumbColor="#fff" />
            </Row>
          )}
        </Glass>
      </Section>

      <Section title="AI Tutor">
        <Glass style={{ gap: space.lg }}>
          <Segmented<'demo' | 'cloud'>
            value={settings.tutorMode}
            onChange={(v) => { haptic.tap(); updateSettings({ tutorMode: v }); }}
            options={[{ value: 'demo', label: 'Demo (offline)' }, { value: 'cloud', label: 'Cloud AI' }]}
          />
          {settings.tutorMode === 'demo' ? (
            <T variant="small" color={colors.textDim}>Demo mode answers from Vidya&apos;s built-in NCERT formula bank, quizzes you from the question bank, and coaches study habits. It works offline and costs nothing.</T>
          ) : (
            <View style={{ gap: space.md }}>
              <T variant="small" color={colors.textDim}>
                Cloud AI calls the <T variant="small" color={colors.text}>tutor</T> Supabase Edge Function{cloudEnabled ? '' : ' (needs Supabase configured)'}. Your AI key stays on the server, never in the app. Optionally point to your own endpoint:
              </T>
              <Field value={endpoint} onChangeText={setEndpoint} onBlur={() => updateSettings({ tutorEndpoint: endpoint.trim() || undefined })} placeholder="https://… (optional custom endpoint)" autoCapitalize="none" keyboardType="url" icon="link-outline" />
            </View>
          )}
        </Glass>
      </Section>

      <Section title="Account & sync">
        <Glass style={{ gap: space.md }}>
          {!cloudEnabled ? (
            <T variant="small" color={colors.textDim}>Everything is saved on this device. Cloud sync turns on when the app is built with Supabase credentials.</T>
          ) : session ? (
            <>
              <Row icon="person-circle-outline" label={session.user.email ?? 'Signed in'} />
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button label="Sync now" icon="sync" size="md" variant="secondary" style={{ flex: 1 }} onPress={() => syncNow()} />
                <Button label="Sign out" size="md" variant="danger" style={{ flex: 1 }} onPress={() => supabase?.auth.signOut()} />
              </View>
            </>
          ) : (
            <Button label="Sign in to back up & sync" icon="cloud-upload-outline" size="md" onPress={() => router.push('/auth')} />
          )}
        </Glass>
      </Section>

      <Section title="Your data">
        <Glass style={{ gap: space.md }}>
          <Button label="Export a backup (JSON)" icon="share-outline" size="md" variant="secondary" onPress={exportData} />
          <Button
            label={confirmReset ? 'Tap again to erase everything' : 'Reset Vidya on this device'}
            icon="trash-outline"
            size="md"
            variant="danger"
            onPress={() => {
              if (!confirmReset) {
                haptic.warn();
                setConfirmReset(true);
                setTimeout(() => setConfirmReset(false), 4000);
                return;
              }
              resetAll();
            }}
          />
        </Glass>
      </Section>

      <View style={{ alignItems: 'center', gap: 4, paddingVertical: space.lg }}>
        <T variant="bodyStrong" color={colors.textDim}>Vidya {Constants.expoConfig?.version ?? ''}</T>
        <T variant="small" color={colors.textFaint} center>Syllabus: new NCERT (NCF-2023) textbooks for Class 8 (Curiosity, Ganita Prakash) and Class 9 (Exploration, Ganita Manjari). Always confirm with your school.</T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 36 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
