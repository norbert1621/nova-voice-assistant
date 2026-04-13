import { NativeModules, Platform } from 'react-native';

const { AudioManager } = NativeModules;

export class AudioFocusService {
  private hasAudioFocus = false;

  /**
   * Request audio focus to pause other apps
   * Call before starting to listen for commands
   */
  async requestAudioFocus(): Promise<boolean> {
    if (Platform.OS !== 'android') return true; // iOS doesn't need this

    try {
      if (this.hasAudioFocus) return true; // Already have focus

      await AudioManager.requestAudioFocus('music', 'AUDIOFOCUS_GAIN');
      this.hasAudioFocus = true;
      console.log('AudioFocusService: Audio focus acquired');
      return true;
    } catch (error) {
      console.error('AudioFocusService: Failed to request audio focus', error);
      return false;
    }
  }

  /**
   * Release audio focus to let other apps resume
   * Call after command processing is complete
   */
  async releaseAudioFocus(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      if (!this.hasAudioFocus) return true; // Don't have focus, nothing to release

      await AudioManager.abandonAudioFocus('music');
      this.hasAudioFocus = false;
      console.log('AudioFocusService: Audio focus released');
      return true;
    } catch (error) {
      console.error('AudioFocusService: Failed to release audio focus', error);
      return false;
    }
  }

  /**
   * Check if we currently have audio focus
   */
  isAudioFocusHeld(): boolean {
    return this.hasAudioFocus;
  }
}

export const audioFocusService = new AudioFocusService();
