import ReactNativeForegroundService from '@supersami/rn-foreground-service';

const NOTIFICATION_ID = 1;
const BACKGROUND_LISTENING_NOTIFICATION_ID = 888;

const baseConfig = {
  id: NOTIFICATION_ID,
  title: 'Nova',
  icon: 'ic_launcher_round',
  importance: 'min' as const, // Non-intrusive, stays collapsed
  ServiceType: 'microphone', // Required for Android 14+ (API 34+)
};

const backgroundListeningConfig = {
  id: BACKGROUND_LISTENING_NOTIFICATION_ID,
  title: 'Nova Listening',
  icon: 'ic_launcher_round',
  importance: 'min' as const,
  ServiceType: 'microphone',
};

export const ForegroundService = {
  async start(): Promise<void> {
    await ReactNativeForegroundService.start({
      ...baseConfig,
      message: 'Say "Hey Nova" to start...',
    });
  },

  async stop(): Promise<void> {
    await ReactNativeForegroundService.stop();
  },

  async updateText(text: string): Promise<void> {
    await ReactNativeForegroundService.update({
      ...baseConfig,
      message: text,
    });
  },

  /**
   * Start background listening foreground notification
   * Shows persistent notification that Nova is listening in background
   */
  async startBackgroundListeningNotification(): Promise<void> {
    try {
      await ReactNativeForegroundService.start({
        ...backgroundListeningConfig,
        message: 'Nova is listening in the background',
      });
      console.log(
        'ForegroundService: Background listening notification started'
      );
    } catch (error) {
      console.error(
        'ForegroundService: Failed to start background notification',
        error
      );
    }
  },

  /**
   * Update background listening notification message
   */
  async updateBackgroundListeningMessage(message: string): Promise<void> {
    try {
      await ReactNativeForegroundService.update({
        ...backgroundListeningConfig,
        message,
      });
    } catch (error) {
      console.error('ForegroundService: Failed to update notification', error);
    }
  },

  /**
   * Stop background listening notification
   */
  async stopBackgroundListeningNotification(): Promise<void> {
    try {
      await ReactNativeForegroundService.stop();
      console.log(
        'ForegroundService: Background listening notification stopped'
      );
    } catch (error) {
      console.error(
        'ForegroundService: Failed to stop notification',
        error
      );
    }
  },
};
