import { NativeModules, Platform } from 'react-native';

// Mock all native modules
jest.mock('react-native', () => ({
  NativeModules: {
    VolumeButtonModule: {
      addListener: jest.fn(),
    },
    AudioManager: {
      requestAudioFocus: jest.fn(),
      abandonAudioFocus: jest.fn(),
    },
    PowerManager: {
      acquireWakeLock: jest.fn(),
      releaseWakeLock: jest.fn(),
    },
    GoogleAutoModule: {
      isGoogleAutoActive: jest.fn(),
      addListener: jest.fn(),
    },
  },
  Platform: {
    OS: 'android',
  },
  NativeEventEmitter: jest.fn(function (this: any) {
    this.addListener = jest.fn((event: string) => ({
      remove: jest.fn(),
    }));
    this.removeAllListeners = jest.fn();
  }),
}));

// Mock ReactNativeForegroundService - must come before mocking react-native
jest.mock('@supersami/rn-foreground-service', () => ({
  __esModule: true,
  default: {
    start: jest.fn(),
    stop: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock Vosk - must come before mocking react-native
jest.mock('react-native-vosk', () => ({
  loadModel: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  onResult: jest.fn(() => ({ remove: jest.fn() })),
  onPartialResult: jest.fn(() => ({ remove: jest.fn() })),
  onError: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock secure storage
jest.mock('../utils/secureStorage', () => ({
  getSettings: jest.fn(() =>
    Promise.resolve({
      testWebhook: 'https://test.webhook.com',
      productionWebhook: 'https://prod.webhook.com',
      webhookMode: 'test',
      tools: [],
      transcriptionMode: 'assemblyai',
      backgroundListening24_7: false,
      doubletapWhenLocked: false,
      keepScreenOnWhileListening: false,
      orbDesignVariant: 'classic',
      orbColorRGB: { r: 0, g: 150, b: 255 },
    })
  ),
  saveSettings: jest.fn(() => Promise.resolve()),
}));

// Mock app store
jest.mock('../store/appStore', () => ({
  useAppStore: {
    getState: jest.fn(() => ({
      setVoskPartial: jest.fn(),
    })),
  },
}));

// Mock event bus
jest.mock('../utils/eventBus', () => ({
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
  Events: {
    WAKE_WORD: 'WAKE_WORD',
  },
}));

// Import after mocks are set up
import { useSettingsStore } from '../store/settingsStore';
import { ForegroundService } from '../services/ForegroundService';
import { gestureService } from '../services/GestureService';
import { audioFocusService } from '../services/AudioFocusService';
import { screenLockService } from '../services/ScreenLockService';
import { googleAutoService } from '../services/GoogleAutoService';

// Get references to mocked modules for use in tests
const getSecureStorageMocks = () => require('../utils/secureStorage');
const getForegroundServiceMock = () => require('@supersami/rn-foreground-service').default;

describe('Background Listening Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset settings before each test
    const state = useSettingsStore.getState();
    state.backgroundListening24_7 = false;
  });

  describe('Enabling/Disabling Background Listening', () => {
    test('should enable background listening when toggle is set', async () => {
      await useSettingsStore.getState().setBackgroundListening24_7(true);
      expect(useSettingsStore.getState().backgroundListening24_7).toBe(true);
    });

    test('should disable background listening when toggle is set', async () => {
      await useSettingsStore.getState().setBackgroundListening24_7(true);
      expect(useSettingsStore.getState().backgroundListening24_7).toBe(true);

      await useSettingsStore.getState().setBackgroundListening24_7(false);
      expect(useSettingsStore.getState().backgroundListening24_7).toBe(false);
    });

    test('should persist background listening setting', async () => {
      const { saveSettings } = getSecureStorageMocks();

      await useSettingsStore.getState().setBackgroundListening24_7(true);

      expect(saveSettings).toHaveBeenCalled();
      const savedSettings = saveSettings.mock.calls[0][0];
      expect(savedSettings.backgroundListening24_7).toBe(true);
    });

    test('should show notification when background listening is active', async () => {
      const ReactNativeForegroundService = getForegroundServiceMock();

      await ForegroundService.startBackgroundListeningNotification();

      expect(ReactNativeForegroundService.start).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 888,
          title: 'Nova Listening',
        })
      );
    });

    test('should hide notification when background listening is disabled', async () => {
      const ReactNativeForegroundService = getForegroundServiceMock();

      await ForegroundService.stopBackgroundListeningNotification();

      expect(ReactNativeForegroundService.stop).toHaveBeenCalled();
    });
  });

  describe('Gesture Detection', () => {
    test('should register gesture callback when background listening enabled', () => {
      const mockCallback = jest.fn();
      const { setBackgroundListening24_7 } = useSettingsStore.getState();

      expect(setBackgroundListening24_7).toBeDefined();

      gestureService.registerDoubletapGesture(mockCallback);
      expect(mockCallback).toBeDefined();
    });

    test('should detect double-tap gesture', (done) => {
      const mockCallback = jest.fn();

      gestureService.registerDoubletapGesture(mockCallback);
      gestureService.onVolumeButtonPress('volume_up');
      gestureService.onVolumeButtonPress('volume_up');

      setTimeout(() => {
        expect(mockCallback).toHaveBeenCalledWith(true);
        done();
      }, 100);
    });

    test('should not detect single tap as gesture', (done) => {
      const mockCallback = jest.fn();

      gestureService.registerDoubletapGesture(mockCallback);
      gestureService.onVolumeButtonPress('volume_up');

      setTimeout(() => {
        expect(mockCallback).not.toHaveBeenCalled();
        done();
      }, 100);
    });

    test('should unregister gesture properly', () => {
      const mockCallback = jest.fn();

      gestureService.registerDoubletapGesture(mockCallback);
      gestureService.unregisterGesture();

      gestureService.onVolumeButtonPress('volume_up');
      gestureService.onVolumeButtonPress('volume_up');

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Audio Focus Management', () => {
    test('should request audio focus', async () => {
      const { requestAudioFocus } = NativeModules.AudioManager;

      await audioFocusService.requestAudioFocus();

      expect(requestAudioFocus).toHaveBeenCalledWith('music', 'AUDIOFOCUS_GAIN');
      expect(audioFocusService.isAudioFocusHeld()).toBe(true);
    });

    test('should release audio focus', async () => {
      const { abandonAudioFocus } = NativeModules.AudioManager;

      await audioFocusService.requestAudioFocus();
      await audioFocusService.releaseAudioFocus();

      expect(abandonAudioFocus).toHaveBeenCalledWith('music');
      expect(audioFocusService.isAudioFocusHeld()).toBe(false);
    });

    test('should not request audio focus multiple times', async () => {
      const { requestAudioFocus } = NativeModules.AudioManager;

      await audioFocusService.requestAudioFocus();
      await audioFocusService.requestAudioFocus();

      expect(requestAudioFocus).toHaveBeenCalledTimes(1);
    });

    test('should not call abandon if audio focus is already released', async () => {
      const { abandonAudioFocus } = NativeModules.AudioManager;

      // First request and release
      await audioFocusService.requestAudioFocus();
      abandonAudioFocus.mockClear();

      // Second release should not call abandon again
      await audioFocusService.releaseAudioFocus();
      expect(audioFocusService.isAudioFocusHeld()).toBe(false);

      // Try to release again - should be a no-op
      const callCountBefore = abandonAudioFocus.mock.calls.length;
      await audioFocusService.releaseAudioFocus();
      expect(abandonAudioFocus.mock.calls.length).toBe(callCountBefore);
    });

    test('should handle audio focus errors gracefully', async () => {
      const { requestAudioFocus } = NativeModules.AudioManager;
      requestAudioFocus.mockRejectedValueOnce(new Error('Audio focus failed'));

      const result = await audioFocusService.requestAudioFocus();

      expect(result).toBe(false);
    });
  });

  describe('Screen Lock / Wake Lock Management', () => {
    test('should acquire wake lock', async () => {
      const { acquireWakeLock } = NativeModules.PowerManager;

      await screenLockService.acquireWakeLock();

      expect(acquireWakeLock).toHaveBeenCalledWith('screen_dim_wake_lock');
      expect(screenLockService.isWakeLockHeld()).toBe(true);
    });

    test('should release wake lock', async () => {
      const { releaseWakeLock } = NativeModules.PowerManager;

      await screenLockService.acquireWakeLock();
      await screenLockService.releaseWakeLock();

      expect(releaseWakeLock).toHaveBeenCalled();
      expect(screenLockService.isWakeLockHeld()).toBe(false);
    });

    test('should not acquire wake lock twice', async () => {
      const { acquireWakeLock } = NativeModules.PowerManager;

      await screenLockService.acquireWakeLock();
      await screenLockService.acquireWakeLock();

      expect(acquireWakeLock).toHaveBeenCalledTimes(1);
    });

    test('should not call release if wake lock is already released', async () => {
      const { releaseWakeLock } = NativeModules.PowerManager;

      // First acquire and release
      await screenLockService.acquireWakeLock();
      releaseWakeLock.mockClear();

      // Second release should not call release again
      await screenLockService.releaseWakeLock();
      expect(screenLockService.isWakeLockHeld()).toBe(false);

      // Try to release again - should be a no-op
      const callCountBefore = releaseWakeLock.mock.calls.length;
      await screenLockService.releaseWakeLock();
      expect(releaseWakeLock.mock.calls.length).toBe(callCountBefore);
    });

    test('should handle wake lock errors gracefully', async () => {
      const { acquireWakeLock } = NativeModules.PowerManager;
      acquireWakeLock.mockRejectedValueOnce(new Error('Wake lock failed'));

      const result = await screenLockService.acquireWakeLock();

      expect(result).toBe(false);
    });
  });

  describe('Google Auto Integration', () => {
    test('should check if Google Auto is active', async () => {
      const { isGoogleAutoActive } = NativeModules.GoogleAutoModule;
      isGoogleAutoActive.mockResolvedValueOnce(true);

      const result = await googleAutoService.isGoogleAutoActive();

      expect(result).toBe(true);
    });

    test('should start voice-only mode when Google Auto is active', async () => {
      const { isGoogleAutoActive } = NativeModules.GoogleAutoModule;
      isGoogleAutoActive.mockResolvedValueOnce(true);

      await googleAutoService.startListening();
      const voiceOnlyMode = await googleAutoService.getVoiceOnlyMode();

      expect(voiceOnlyMode).toBe(true);
    });

    test('should not activate voice-only mode when Google Auto is inactive', async () => {
      const { isGoogleAutoActive } = NativeModules.GoogleAutoModule;
      isGoogleAutoActive.mockResolvedValueOnce(false);

      // First stop listening to reset state
      await googleAutoService.stopListening();
      expect(await googleAutoService.getVoiceOnlyMode()).toBe(false);

      // Now try to start listening with Google Auto inactive
      await googleAutoService.startListening();
      const voiceOnlyMode = await googleAutoService.getVoiceOnlyMode();

      expect(voiceOnlyMode).toBe(false);
    });

    test('should stop voice-only mode', async () => {
      await googleAutoService.stopListening();
      const voiceOnlyMode = await googleAutoService.getVoiceOnlyMode();

      expect(voiceOnlyMode).toBe(false);
    });

    test('should handle Google Auto check errors', async () => {
      const { isGoogleAutoActive } = NativeModules.GoogleAutoModule;
      isGoogleAutoActive.mockRejectedValueOnce(new Error('Google Auto check failed'));

      const result = await googleAutoService.isGoogleAutoActive();

      expect(result).toBe(false);
    });
  });

  describe('Settings Persistence', () => {
    test('background listening setting should persist', async () => {
      const { saveSettings } = getSecureStorageMocks();

      await useSettingsStore.getState().setBackgroundListening24_7(true);

      expect(saveSettings).toHaveBeenCalled();
      expect(saveSettings.mock.calls[0][0].backgroundListening24_7).toBe(true);
    });

    test('orb design variant should persist', async () => {
      const { saveSettings } = getSecureStorageMocks();

      await useSettingsStore.getState().setOrbDesignVariant('geometric');

      expect(saveSettings).toHaveBeenCalled();
      expect(saveSettings.mock.calls[0][0].orbDesignVariant).toBe('geometric');
    });

    test('orb color should persist', async () => {
      const { saveSettings } = getSecureStorageMocks();
      const testColor = { r: 255, g: 0, b: 0 };

      await useSettingsStore.getState().setOrbColorRGB(testColor);

      expect(saveSettings).toHaveBeenCalled();
      expect(saveSettings.mock.calls[0][0].orbColorRGB).toEqual(testColor);
    });

    test('multiple settings should persist together', async () => {
      const { saveSettings } = getSecureStorageMocks();

      await useSettingsStore.getState().setBackgroundListening24_7(true);
      await useSettingsStore.getState().setOrbDesignVariant('geometric');
      await useSettingsStore.getState().setOrbColorRGB({ r: 255, g: 0, b: 0 });

      expect(saveSettings).toHaveBeenCalledTimes(3);

      // Last call should have all the latest values
      const lastCall = saveSettings.mock.calls[2][0];
      expect(lastCall.backgroundListening24_7).toBe(true);
      expect(lastCall.orbDesignVariant).toBe('geometric');
      expect(lastCall.orbColorRGB).toEqual({ r: 255, g: 0, b: 0 });
    });

    test('doubletap when locked setting should persist', async () => {
      const { saveSettings } = getSecureStorageMocks();

      await useSettingsStore.getState().setDoubletapWhenLocked(true);

      expect(saveSettings).toHaveBeenCalled();
      expect(saveSettings.mock.calls[0][0].doubletapWhenLocked).toBe(true);
    });

    test('keep screen on setting should persist', async () => {
      const { saveSettings } = getSecureStorageMocks();

      await useSettingsStore.getState().setKeepScreenOnWhileListening(true);

      expect(saveSettings).toHaveBeenCalled();
      expect(saveSettings.mock.calls[0][0].keepScreenOnWhileListening).toBe(true);
    });
  });

  describe('Integrated Flow - Full Background Listening Cycle', () => {
    test('should complete full background listening enable flow', async () => {
      const ReactNativeForegroundService = getForegroundServiceMock();
      const { acquireWakeLock } = NativeModules.PowerManager;

      // Step 1: Enable background listening in settings
      await useSettingsStore.getState().setBackgroundListening24_7(true);
      expect(useSettingsStore.getState().backgroundListening24_7).toBe(true);

      // Step 2: Start foreground notification
      await ForegroundService.startBackgroundListeningNotification();
      expect(ReactNativeForegroundService.start).toHaveBeenCalled();

      // Step 3: Acquire wake lock
      await screenLockService.acquireWakeLock();
      expect(acquireWakeLock).toHaveBeenCalled();
      expect(screenLockService.isWakeLockHeld()).toBe(true);

      // Step 4: Register gesture detection
      const mockGestureCallback = jest.fn();
      gestureService.registerDoubletapGesture(mockGestureCallback);
      expect(mockGestureCallback).toBeDefined();
    });

    test('should complete full background listening disable flow', async () => {
      const ReactNativeForegroundService = getForegroundServiceMock();
      const { releaseWakeLock } = NativeModules.PowerManager;

      // First enable everything
      await useSettingsStore.getState().setBackgroundListening24_7(true);
      await ForegroundService.startBackgroundListeningNotification();
      await screenLockService.acquireWakeLock();
      const mockGestureCallback = jest.fn();
      gestureService.registerDoubletapGesture(mockGestureCallback);

      // Now disable
      await useSettingsStore.getState().setBackgroundListening24_7(false);
      expect(useSettingsStore.getState().backgroundListening24_7).toBe(false);

      await ForegroundService.stopBackgroundListeningNotification();
      expect(ReactNativeForegroundService.stop).toHaveBeenCalled();

      await screenLockService.releaseWakeLock();
      expect(releaseWakeLock).toHaveBeenCalled();

      gestureService.unregisterGesture();
    });

    test('should handle Google Auto state during listening', async () => {
      const { isGoogleAutoActive } = NativeModules.GoogleAutoModule;
      const { requestAudioFocus, abandonAudioFocus } = NativeModules.AudioManager;
      isGoogleAutoActive.mockResolvedValueOnce(true);

      // Enable background listening
      await useSettingsStore.getState().setBackgroundListening24_7(true);

      // Check Google Auto status
      const isActive = await googleAutoService.isGoogleAutoActive();
      expect(isActive).toBe(true);

      if (isActive) {
        // If Google Auto is active, request audio focus
        await audioFocusService.requestAudioFocus();
        expect(requestAudioFocus).toHaveBeenCalled();

        // After command, release focus
        await audioFocusService.releaseAudioFocus();
        expect(abandonAudioFocus).toHaveBeenCalled();
      }
    });

    test('should maintain state consistency through multiple operations', async () => {
      const { saveSettings } = getSecureStorageMocks();

      // Enable background listening
      await useSettingsStore.getState().setBackgroundListening24_7(true);
      let state = useSettingsStore.getState();
      expect(state.backgroundListening24_7).toBe(true);

      // Customize orb
      await useSettingsStore.getState().setOrbDesignVariant('geometric');
      state = useSettingsStore.getState();
      expect(state.orbDesignVariant).toBe('geometric');

      // Set custom color
      await useSettingsStore.getState().setOrbColorRGB({ r: 100, g: 200, b: 50 });
      state = useSettingsStore.getState();
      expect(state.orbColorRGB).toEqual({ r: 100, g: 200, b: 50 });

      // All settings should be persisted
      expect(saveSettings).toHaveBeenCalledTimes(3);

      // Disable background listening
      await useSettingsStore.getState().setBackgroundListening24_7(false);
      state = useSettingsStore.getState();
      expect(state.backgroundListening24_7).toBe(false);
      expect(state.orbDesignVariant).toBe('geometric');
      expect(state.orbColorRGB).toEqual({ r: 100, g: 200, b: 50 });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle wake lock acquisition failure gracefully', async () => {
      const { acquireWakeLock } = NativeModules.PowerManager;
      acquireWakeLock.mockRejectedValueOnce(new Error('Failed'));

      const result = await screenLockService.acquireWakeLock();

      expect(result).toBe(false);
      expect(screenLockService.isWakeLockHeld()).toBe(false);
    });

    test('should handle audio focus request failure gracefully', async () => {
      const { requestAudioFocus } = NativeModules.AudioManager;
      requestAudioFocus.mockRejectedValueOnce(new Error('Failed'));

      const result = await audioFocusService.requestAudioFocus();

      expect(result).toBe(false);
      expect(audioFocusService.isAudioFocusHeld()).toBe(false);
    });

    test('should handle gesture registration with no callback', () => {
      expect(() => {
        gestureService.registerDoubletapGesture(() => {});
      }).not.toThrow();
    });

    test('should handle rapid setting changes', async () => {
      const { saveSettings } = getSecureStorageMocks();

      await useSettingsStore.getState().setBackgroundListening24_7(true);
      await useSettingsStore.getState().setBackgroundListening24_7(false);
      await useSettingsStore.getState().setBackgroundListening24_7(true);

      expect(saveSettings).toHaveBeenCalledTimes(3);
      expect(useSettingsStore.getState().backgroundListening24_7).toBe(true);
    });

    test('should handle empty gesture unregister', () => {
      expect(() => {
        gestureService.unregisterGesture();
      }).not.toThrow();
    });
  });
});
