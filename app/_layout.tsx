import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'nativewind';
import { I18nextProvider } from 'react-i18next';
import 'react-native-reanimated';
import '../app/globals.css';
import i18n from './i18n';
import ErrorBoundary from './components/ErrorBoundary';
import './utils/crashHandler'; // Initialize global error handlers

import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { initializeBarbersBarConfig } from '../services/firebase';
import { crashHandler } from './utils/crashHandler';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize business configuration on app startup with better error handling
  useEffect(() => {
    const initBusinessConfig = async () => {
      // Only initialize if fonts are loaded and we haven't initialized yet
      if (loaded && !isInitialized) {
        const result = await crashHandler.safeAsync(
          async () => {
            console.log('Initializing business configuration...');
            await initializeBarbersBarConfig();
            console.log('Business configuration initialized successfully');
            return true;
          },
          false,
          'Business Config Initialization'
        );
        
        if (!result) {
          setInitError('Failed to initialize business configuration');
        }
        
        // Always mark as initialized to prevent blocking the app
        setIsInitialized(true);
      }
    };

    initBusinessConfig();
  }, [loaded, isInitialized]);

  // Show loading screen while fonts are loading or during initialization
  if (!loaded || error) {
    console.log('Fonts loading...', { loaded, error });
    return null;
  }

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }}>
            <Stack.Screen name="splash" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" />
            <Stack.Screen name="AuthChoiceScreen" />
            <Stack.Screen name="AuthPhoneScreen" />
            <Stack.Screen name="admin-home" />
            <Stack.Screen name="admin-appointments" />
            <Stack.Screen name="admin-team" />
            <Stack.Screen name="admin-treatments" />
            <Stack.Screen name="admin-gallery" />
            <Stack.Screen name="admin-availability" />
            <Stack.Screen name="admin-settings" />
            <Stack.Screen name="admin-statistics" />
            <Stack.Screen name="admin-notifications" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="barber-dashboard" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}
