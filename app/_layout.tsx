import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'nativewind';
import { I18nextProvider } from 'react-i18next';
import 'react-native-reanimated';
import '../app/globals.css';
import i18n from './i18n';

import { useColorScheme } from 'react-native';
import { useEffect } from 'react';
import { initializeBarbersBarConfig } from '../services/firebase';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Initialize business configuration on app startup
  useEffect(() => {
    const initBusinessConfig = async () => {
      try {
        await initializeBarbersBarConfig();
      } catch (error) {
        console.error('Failed to initialize business config:', error);
      }
    };

    if (loaded) {
      initBusinessConfig();
    }
  }, [loaded]);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="splash" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
          <Stack.Screen name="AuthChoiceScreen" options={{ headerShown: false }} />
          <Stack.Screen name="AuthPhoneScreen" options={{ headerShown: false }} />
          <Stack.Screen name="admin-home" options={{ headerShown: false }} />
          <Stack.Screen name="admin-appointments" options={{ headerShown: false }} />
          <Stack.Screen name="admin-team" options={{ headerShown: false }} />
          <Stack.Screen name="admin-treatments" options={{ headerShown: false }} />
          <Stack.Screen name="admin-gallery" options={{ headerShown: false }} />
          <Stack.Screen name="admin-availability" options={{ headerShown: false }} />
          <Stack.Screen name="admin-settings" options={{ headerShown: false }} />
          <Stack.Screen name="admin-statistics" options={{ headerShown: false }} />
          <Stack.Screen name="admin-notifications" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </I18nextProvider>
  );
}
