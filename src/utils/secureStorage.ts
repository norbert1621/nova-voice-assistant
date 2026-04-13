import * as SecureStore from 'expo-secure-store';

export interface Tool {
  id: string;
  keyword: string;
  webhookUrl: string;
}

export type WebhookMode = 'test' | 'production';
export type TranscriptionMode = 'assemblyai' | 'vosk';

export interface NovaSettings {
  testWebhook: string;
  productionWebhook: string;
  webhookMode: WebhookMode;
  tools: Tool[];
  transcriptionMode: TranscriptionMode;
}

const SETTINGS_KEY = 'nova_settings';

const defaultSettings: NovaSettings = {
  testWebhook: process.env.EXPO_PUBLIC_TEST_WEBHOOK_URL ?? '',
  productionWebhook: process.env.EXPO_PUBLIC_PRODUCTION_WEBHOOK_URL ?? '',
  webhookMode: 'test',
  tools: [],
  transcriptionMode: 'assemblyai',
};

export async function getSettings(): Promise<NovaSettings> {
  try {
    const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: NovaSettings): Promise<void> {
  await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(settings));
}
