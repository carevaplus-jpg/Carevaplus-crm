import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase, useSession } from '@/lib/supabase';
import { syncNow } from '@/lib/sync';
import { useStore } from '@/store';
import { colors, fonts, gradients, radius, space } from '@/theme/tokens';
import { Aurora, Button, Empty, Field, haptic, Header, Icon, Segmented, T } from '@/ui';

type Mode = 'signin' | 'signup';

export default function Auth() {
  const insets = useSafeAreaInsets();
  const session = useSession();
  const sync = useStore((s) => s.sync);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 8;

  const submit = async () => {
    if (!supabase || !valid) return;
    setBusy(true);
    setMsg(null);
    const fn = mode === 'signin' ? supabase.auth.signInWithPassword({ email: email.trim(), password }) : supabase.auth.signUp({ email: email.trim(), password });
    const { data, error } = await fn;
    setBusy(false);
    if (error) {
      haptic.warn();
      setMsg({ kind: 'error', text: error.message });
      return;
    }
    if (mode === 'signup' && !data.session) {
      setMsg({ kind: 'info', text: 'Check your inbox to confirm your email, then sign in.' });
      setMode('signin');
      return;
    }
    haptic.success();
    await syncNow();
    if (router.canGoBack()) router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora intensity={0.8} />
      <View style={{ paddingTop: Platform.OS === 'ios' ? space.md : insets.top }}>
        <Header title="Account" />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        {!supabase ? (
          <Empty icon="cloud-offline-outline" title="Cloud sync isn't set up" body="This build stores everything securely on your device. To enable accounts and sync, add your Supabase URL and anon key to the app's environment (see README)." />
        ) : session ? (
          <View style={{ gap: space.xl }}>
            <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.xxl }}>
              <LinearGradient colors={[...gradients.mint]} style={styles.badge}>
                <Icon name="cloud-done" size={32} color="#fff" />
              </LinearGradient>
              <T variant="h2" center>You&apos;re backed up</T>
              <T variant="body" color={colors.textDim} center>{session.user.email}</T>
              <T variant="small" color={colors.textFaint} center>{sync.status === 'syncing' ? 'Syncing…' : sync.status === 'error' ? `Last sync failed: ${sync.error}` : 'Notes, cards, progress and plans sync automatically across your devices.'}</T>
            </View>
            <Button label="Sync now" icon="sync" variant="secondary" loading={sync.status === 'syncing'} onPress={() => syncNow()} />
            <Button label="Sign out" variant="danger" icon="log-out-outline" onPress={async () => { await supabase!.auth.signOut(); haptic.tap(); }} />
          </View>
        ) : (
          <View style={{ gap: space.xl }}>
            <View style={{ gap: space.sm, paddingTop: space.xl }}>
              <T style={{ fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.text, letterSpacing: -1 }}>{mode === 'signin' ? 'Welcome back.' : 'Never lose\nyour progress.'}</T>
              <T variant="body" color={colors.textDim}>Sync notes, flashcards, streaks and plans across your phone, tablet and laptop.</T>
            </View>
            <Segmented<Mode> value={mode} onChange={(m) => { setMode(m); setMsg(null); }} options={[{ value: 'signin', label: 'Sign in' }, { value: 'signup', label: 'Create account' }]} />
            <Field icon="mail-outline" value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
            <Field icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="Password (min 8 characters)" secureTextEntry autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} textContentType={mode === 'signin' ? 'password' : 'newPassword'} onSubmitEditing={submit} />
            {msg && (
              <View style={[styles.msg, { borderColor: (msg.kind === 'error' ? colors.danger : colors.mint) + '66' }]}>
                <Icon name={msg.kind === 'error' ? 'alert-circle' : 'mail-unread'} size={18} color={msg.kind === 'error' ? colors.danger : colors.mint} />
                <T variant="small" color={colors.text} style={{ flex: 1 }}>{msg.text}</T>
              </View>
            )}
            <Button label={mode === 'signin' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} disabled={!valid} />
            <T variant="small" color={colors.textFaint} center>Vidya works fully offline. An account is optional and only used for backup & sync.</T>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl, gap: space.xl, maxWidth: 520, alignSelf: 'center', width: '100%' },
  badge: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  msg: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, borderWidth: 1, backgroundColor: colors.surface },
});
