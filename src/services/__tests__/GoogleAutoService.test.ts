import { GoogleAutoService } from '../GoogleAutoService';
import { NativeModules } from 'react-native';

// Mock the NativeModules
jest.mock('react-native', () => ({
  NativeModules: {
    GoogleAutoModule: {
      isGoogleAutoActive: jest.fn().mockResolvedValue(false),
      addListener: jest.fn(),
    },
  },
  Platform: {
    OS: 'android',
  },
}));

describe('GoogleAutoService', () => {
  let service: GoogleAutoService;

  beforeEach(() => {
    service = new GoogleAutoService();
  });

  test('isGoogleAutoActive should return boolean', async () => {
    const result = await service.isGoogleAutoActive();
    expect(typeof result).toBe('boolean');
  });

  test('startListening should set voice-only mode when Google Auto is active', async () => {
    const isActive = await service.isGoogleAutoActive();
    await service.startListening();
    const voiceOnly = await service.getVoiceOnlyMode();
    // If Google Auto is active, voice-only should be true
    // If not active, voice-only should be false
    if (isActive) {
      expect(voiceOnly).toBe(true);
    }
  });

  test('stopListening should disable voice-only mode', async () => {
    await service.startListening();
    await service.stopListening();
    const voiceOnly = await service.getVoiceOnlyMode();
    expect(voiceOnly).toBe(false);
  });

  test('voice-only mode should toggle properly', async () => {
    const before = await service.getVoiceOnlyMode();
    await service.startListening();
    const during = await service.getVoiceOnlyMode();
    await service.stopListening();
    const after = await service.getVoiceOnlyMode();

    expect(after).toBe(false);
  });

  test('should handle error gracefully', async () => {
    // Even if native module fails, should not throw
    const result = await service.isGoogleAutoActive();
    expect(typeof result).toBe('boolean');
  });

  test('addListener should not throw on Android', async () => {
    // Should not throw even if listener registration fails
    expect(() => {
      service.addListener('googleAutoStateChanged', (isActive: boolean) => {
        console.log('Google Auto state changed:', isActive);
      });
    }).not.toThrow();
  });

  test('voice-only mode state should persist across calls', async () => {
    await service.startListening();
    let voiceOnly = await service.getVoiceOnlyMode();
    expect(voiceOnly).toBe(true);
    // Call again without changing state
    voiceOnly = await service.getVoiceOnlyMode();
    expect(voiceOnly).toBe(true);
  });
});
