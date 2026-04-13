import ReactNativeForegroundService from '@supersami/rn-foreground-service';

const NOTIFICATION_ID = 1;

const baseConfig = {
  id: NOTIFICATION_ID,
  title: 'Nova',
  icon: 'ic_launcher_round',
  importance: 'min' as const, // Non-intrusive, stays collapsed
  ServiceType: 'microphone', // Required for Android 14+ (API 34+)
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
};
