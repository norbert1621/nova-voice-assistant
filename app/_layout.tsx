import { useEffect, useRef } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAssistantLoop } from '../src/hooks/useAssistantLoop';
import { useSettingsStore } from '../src/store/settingsStore';
import { AudioService } from '../src/services/AudioService';
import { ForegroundService } from '../src/services/ForegroundService';
import { WakeWordService } from '../src/services/WakeWordService';

export default function RootLayout() {
  const isInitialized = useRef(false);

  useAssistantLoop();

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    initializeApp();
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="#070711" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0D0D1A' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '300' },
          contentStyle: { backgroundColor: '#0D0D1A' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{
            title: 'SETTINGS',
            headerBackTitle: '',
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}

async function initializeApp() {
  // 1. Load stored settings
  await useSettingsStore.getState().loadSettings();

  // 2. Request microphone permission
  if (Platform.OS === 'android') {
    const micGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'Nova needs microphone access to hear your voice commands.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );

    if (micGranted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert(
        'Microphone Required',
        'Nova cannot function without microphone access. Please grant permission in Settings.',
      );
      return;
    }

    // Request notification permission for Android 13+ (foreground service notification)
    if (Platform.Version >= 33) {
      await PermissionsAndroid.request(
        'android.permission.POST_NOTIFICATIONS' as any,
      ).catch(() => {});
    }
  }

  // 3. Configure audio for background playback
  await AudioService.configure();

  // 4. Start the foreground service (keeps app alive)
  try {
    await ForegroundService.start();
  } catch (err) {
    console.error('[App] ForegroundService failed to start:', err);
  }

  // 5. Initialize Vosk wake word engine
  try {
    await WakeWordService.initialize();
    await WakeWordService.startListening();
  } catch (err) {
    console.error('[App] Vosk initialization failed:', err);
    Alert.alert(
      'Wake Word Setup Failed',
      'Could not load the voice model. Make sure you have placed the Vosk model in assets/model/ and rebuilt the app.',
    );
  }
}
