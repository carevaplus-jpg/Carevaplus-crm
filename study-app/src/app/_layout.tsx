import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Sora_300Light } from '@expo-google-fonts/sora/300Light';
import { Sora_600SemiBold } from '@expo-google-fonts/sora/600SemiBold';
import { Sora_700Bold } from '@expo-google-fonts/sora/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAutoSync } from '@/lib/sync';
import { useStore } from '@/store';
import { colors } from '@/theme/tokens';
import { Celebrations } from '@/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.primary, text: colors.text, border: colors.border },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Sora_300Light,
    Sora_600SemiBold,
    Sora_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const hydrated = useStore((s) => s.hydrated);
  const onboarded = useStore((s) => !!s.profile);
  const ready = fontsLoaded && hydrated;

  useAutoSync();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <ThemeProvider value={theme}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade_from_bottom' }}>
            <Stack.Protected guard={!onboarded} redirectTo="/">
              <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            </Stack.Protected>
            <Stack.Protected guard={onboarded} redirectTo="/onboarding">
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen name="subject/[id]" />
              <Stack.Screen name="chapter/[id]" />
              <Stack.Screen name="review" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="quiz/[chapterId]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="note/[id]" options={{ presentation: 'modal' }} />
              <Stack.Screen name="card/[id]" options={{ presentation: 'modal' }} />
              <Stack.Screen name="task" options={{ presentation: 'modal' }} />
              <Stack.Screen name="exam" options={{ presentation: 'modal' }} />
              <Stack.Screen name="custom-subject" options={{ presentation: 'modal' }} />
              <Stack.Screen name="planner" />
              <Stack.Screen name="notes" />
              <Stack.Screen name="stats" />
              <Stack.Screen name="achievements" />
              <Stack.Screen name="settings" />
            </Stack.Protected>
            <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
          </Stack>
          <Celebrations />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
