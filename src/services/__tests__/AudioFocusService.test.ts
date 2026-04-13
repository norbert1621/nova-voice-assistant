import { AudioFocusService } from '../AudioFocusService';

describe('AudioFocusService', () => {
  let service: AudioFocusService;

  beforeEach(() => {
    service = new AudioFocusService();
  });

  test('requestAudioFocus should return true on success', async () => {
    const result = await service.requestAudioFocus();
    expect(result).toBe(true);
  });

  test('releaseAudioFocus should return true on success', async () => {
    await service.requestAudioFocus();
    const result = await service.releaseAudioFocus();
    expect(result).toBe(true);
  });

  test('should handle multiple consecutive requests', async () => {
    const result1 = await service.requestAudioFocus();
    const result2 = await service.requestAudioFocus();
    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });

  test('should handle error gracefully', async () => {
    // Even if native module fails, should not throw
    const result = await service.requestAudioFocus();
    expect(typeof result).toBe('boolean');
  });

  test('isAudioFocusHeld should track focus state', async () => {
    expect(service.isAudioFocusHeld()).toBe(false);
    await service.requestAudioFocus();
    expect(service.isAudioFocusHeld()).toBe(true);
    await service.releaseAudioFocus();
    expect(service.isAudioFocusHeld()).toBe(false);
  });

  test('releaseAudioFocus should be idempotent', async () => {
    const result1 = await service.releaseAudioFocus();
    const result2 = await service.releaseAudioFocus();
    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });
});
