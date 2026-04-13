import { create } from 'zustand';
import { type Tool, type WebhookMode, type TranscriptionMode, getSettings, saveSettings } from '../utils/secureStorage';

interface SettingsState {
  testWebhook: string;
  productionWebhook: string;
  webhookMode: WebhookMode;
  tools: Tool[];
  transcriptionMode: TranscriptionMode;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  setWebhookMode: (mode: WebhookMode) => Promise<void>;
  saveTestWebhook: (url: string) => Promise<void>;
  saveProductionWebhook: (url: string) => Promise<void>;
  addTool: (tool: Tool) => Promise<void>;
  removeTool: (id: string) => Promise<void>;
  setTranscriptionMode: (mode: TranscriptionMode) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  testWebhook: '',
  productionWebhook: '',
  webhookMode: 'test',
  tools: [],
  transcriptionMode: 'assemblyai',
  isLoaded: false,

  loadSettings: async () => {
    const settings = await getSettings();
    set({
      testWebhook: settings.testWebhook,
      productionWebhook: settings.productionWebhook,
      webhookMode: settings.webhookMode,
      tools: settings.tools,
      transcriptionMode: settings.transcriptionMode,
      isLoaded: true,
    });
  },

  setWebhookMode: async (mode) => {
    set({ webhookMode: mode });
    const s = get();
    await saveSettings({ testWebhook: s.testWebhook, productionWebhook: s.productionWebhook, webhookMode: mode, tools: s.tools, transcriptionMode: s.transcriptionMode });
  },

  saveTestWebhook: async (url) => {
    set({ testWebhook: url });
    const s = get();
    await saveSettings({ testWebhook: url, productionWebhook: s.productionWebhook, webhookMode: s.webhookMode, tools: s.tools, transcriptionMode: s.transcriptionMode });
  },

  saveProductionWebhook: async (url) => {
    set({ productionWebhook: url });
    const s = get();
    await saveSettings({ testWebhook: s.testWebhook, productionWebhook: url, webhookMode: s.webhookMode, tools: s.tools, transcriptionMode: s.transcriptionMode });
  },

  addTool: async (tool) => {
    const tools = [...get().tools, tool];
    set({ tools });
    const s = get();
    await saveSettings({ testWebhook: s.testWebhook, productionWebhook: s.productionWebhook, webhookMode: s.webhookMode, tools, transcriptionMode: s.transcriptionMode });
  },

  removeTool: async (id) => {
    const tools = get().tools.filter((t) => t.id !== id);
    set({ tools });
    const s = get();
    await saveSettings({
      testWebhook: s.testWebhook,
      productionWebhook: s.productionWebhook,
      webhookMode: s.webhookMode,
      tools,
      transcriptionMode: s.transcriptionMode,
    });
  },

  setTranscriptionMode: async (mode) => {
    set({ transcriptionMode: mode });
    const s = get();
    await saveSettings({
      testWebhook: s.testWebhook,
      productionWebhook: s.productionWebhook,
      webhookMode: s.webhookMode,
      tools: s.tools,
      transcriptionMode: mode,
    });
  },
}));
