import { NativeModules, Platform } from 'react-native';

const { PowerManager } = NativeModules;

export class ScreenLockService {
  private wakeLockHeld = false;

  /**
   * Acquire wake lock to keep screen on
   * Call when Nova starts listening
   */
  async acquireWakeLock(): Promise<boolean> {
    if (Platform.OS !== 'android') return true; // iOS manages power differently
    if (this.wakeLockHeld) return true; // Already held

    try {
      await PowerManager.acquireWakeLock('screen_dim_wake_lock');
      this.wakeLockHeld = true;
      console.log('ScreenLockService: Wake lock acquired');
      return true;
    } catch (error) {
      console.error('ScreenLockService: Failed to acquire wake lock', error);
      return false;
    }
  }

  /**
   * Release wake lock to allow screen to lock
   * Call when response playback finishes
   */
  async releaseWakeLock(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    if (!this.wakeLockHeld) return true; // Not held, nothing to release

    try {
      await PowerManager.releaseWakeLock();
      this.wakeLockHeld = false;
      console.log('ScreenLockService: Wake lock released');
      return true;
    } catch (error) {
      console.error('ScreenLockService: Failed to release wake lock', error);
      return false;
    }
  }

  /**
   * Check if wake lock is currently held
   */
  isWakeLockHeld(): boolean {
    return this.wakeLockHeld;
  }
}

export const screenLockService = new ScreenLockService();
