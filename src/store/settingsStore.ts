import { create } from 'zustand';
import { type Tool, type WebhookMode, type TranscriptionMode, type OrbDesignVariant, type RGBColor, getSettings, saveSettings } from '../utils/secureStorage';

interface SettingsState {
  testWebhook: string;
  productionWebhook: string;
  webhookMode: WebhookMode;
  tools: Tool[];
  transcriptionMode: TranscriptionMode;
  // Background Listening & Customization
  backgroundListening24_7: boolean;
  doubletapWhenLocked: boolean;
  keepScreenOnWhileListening: boolean;
  orbDesignVariant: OrbDesignVariant;
  orbColorRGB: RGBColor;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  setWebhookMode: (mode: WebhookMode) => Promise<void>;
  saveTestWebhook: (url: string) => Promise<void>;
  saveProductionWebhook: (url: string) => Promise<void>;
  addTool: (tool: Tool) => Promise<void>;
  removeTool: (id: string) => Promise<void>;
  setTranscriptionMode: (mode: TranscriptionMode) => Promise<void>;
  setBackgroundListening24_7: (enabled: boolean) => Promise<void>;
  setDoubletapWhenLocked: (enabled: boolean) => Promise<void>;
  setKeepScreenOnWhileListening: (enabled: boolean) => Promise<void>;
  setOrbDesignVariant: (variant: OrbDesignVariant) => Promise<void>;
  setOrbColorRGB: (rgb: RGBColor) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  testWebhook: '',
  productionWebhook: '',
  webhookMode: 'test',
  tools: [],
  transcriptionMode: 'assemblyai',
  backgroundListening24_7: false,
  doubletapWhenLocked: false,
  keepScreenOnWhileListening: false,
  orbDesignVariant: 'classic',
  orbColorRGB: { r: 0, g: 150, b: 255 },
  isLoaded: false,

  loadSettings: async () => {
    const settings = await getSettings();
    set({
      testWebhook: settings.testWebhook,
      productionWebhook: settings.productionWebhook,
      webhookMode: settings.webhookMode,
      tools: settings.tools,
      transcriptionMode: settings.transcriptionMode,
      backgroundListening24_7: settings.backgroundListening24_7,
      doubletapWhenLocked: settings.doubletapWhenLocked,
      keepScreenOnWhileListening: settings.keepScreenOnWhileListening,
      orbDesignVariant: settings.orbDesignVariant,
      orbColorRGB: settings.orbColorRGB,
      isLoaded: true,
    });
  },

  setWebhookMode: async (mode) => {
    set({ webhookMode: mode });
    const s = get();
    await saveSettings({
      testWebhook: s.testWebhook,
      productionWebhook: s.productionWebhook,
      webhookMode: mode,
      tools: s.tools,
      transcriptionMode: s.transcriptionMode,
      backgroundListening24_7: s.backgroundListening24_7,
      doubletapWhenLocked: s.doubletapWhenLocked,
      keepScreenOnWhileListening: s.keepScreenOnWhileListening,
      orbDesignVariant: s.orbDesignVariant,
      orbColorRGB: s.orbColorRGB,
    });
  },

  saveTestWebhook: async (url) => {
    set({ testWebhook: url });
    const s = get();
    await saveSettings({
      testWebhook: url,
      productionWebhook: s.productionWebhook,
      webhookMode: s.webhookMode,
      tools: s.tools,
      transcriptionMode: s.transcriptionMode,
      backgroundListening24_7: s.backgroundListening24_7,
      doubletapWhenLocked: s.doubletapWhenLocked,
      keepScreenOnWhileListening: s.keepScreenOnWhileListening,
      orbDesignVariant: s.orbDesignVariant,
      orbColorRGB: s.orbColorRGB,
    });
  },

  saveProductionWebhook: async (url) => {
    set({ productionWebhook: url });
    const s = get();
    await saveSettings({
      testWebhook: s.testWebhook,
      productionWebhook: url,
      webhookMode: s.webhookMode,
      tools: s.tools,
      transcriptionMode: s.transcriptionMode,
      backgroundListening24_7: s.backgroundListening24_7,
      doubletapWhenLocked: s.doubletapWhenLocked,
      keepScreenOnWhileListening: s.keepScreenOnWhileListening,
      orbDesignVariant: s.orbDesignVariant,
      orbColorRGB: s.orbColorRGB,
    });
  },

  addTool: async (tool) => {
    const tools = [...get().tools, tool];
    set({ tools });
    const s = get();
    await saveSettings({
      testWebhook: s.testWebhook,
      productionWebhook: s.productionWebhook,
      webhookMode: s.webhookMode,
      tools,
      transcriptionMode: s.transcriptionMode,
      backgroundListening24_7: s.backgroundListening24_7,
      doubletapWhenLocked: s.doubletapWhenLocked,
      keepScreenOnWhileListening: s.keepScreenOnWhileListening,
      orbDesignVariant: s.orbDesignVariant,
      orbColorRGB: s.orbColorRGB,
    });
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
      backgroundListening24_7: s.backgroundListening24_7,
      doubletapWhenLocked: s.doubletapWhenLocked,
      keepScreenOnWhileListening: s.keepScreenOnWhileListening,
      orbDesignVariant: s.orbDesignVariant,
      orbColorRGB: s.orbColorRGB,
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
      backgroundListening24_7: s.backgroundListening24_7,
      doubletapWhenLocked: s.doubletapWhenLocked,
      keepScreenOnWhileListening: s.keepScreenOnWhileListening,
      orbDesignVariant: s.orbDesignVariant,
      orbColorRGB: s.orbColorRGB,
    });
  },

  setBackgroundListening24_7: async (enabled) => {
    set({ backgroundListening24_7: enabled });
    const s = get();
    await saveSettings({
      testWebhook: s.testWebhook,
      productionWebhook: s.productionWebhook,
      webhookMode: s.webhookMode,
      tools: s.tools,
      transcriptionMode: s.transcriptionMode,
      backgroundListening24_7: enabled,
      doubletapWhenLocked: s.doubletapWhenLocked,
      keepScreenOnWhileListening: s.keepScreenOnWhileListening,
      orbDesignVariant: s.orbDesignVariant,
      orbColorRGB: s.orbColorRGB,
    });
  },

  setDoubletapWhenLocked: async (enabled) => {
    set({ doubletapWhenLocked: enabled });
    const s = get();
    await saveSettings({
      testWebhook: s.testWebhook,
      productionWebhook: s.productionWebhook,
      webhookMode: s.webhookMode,
      tools: s.tools,
      transcriptionMode: s.transcriptionMode,
      backgroundListening24_7: s.backgroundListening24_7,
      doubletapWhenLocked: enabled,
      keepScreenOnWhileListening: s.keepScreenOnWhileListening,
      orbDesignVariant: s.orbDesignVariant,
      orbColorRGB: s.orbColorRGB,
    });
  },

  setKeepScreenOnWhileListening: async (enabled) => {
    set({ keepScreenOnWhileListening: enabled });
    const s = get();
    await saveSettings({
      testWebhook: s.testWebhook,
      productionWebhook: s.productionWebhook,
      webhookMode: s.webhookMode,
      tools: s.tools,
      transcriptionMode: s.transcriptionMode,
      backgroundListening24_7: s.backgroundListening24_7,
      doubletapWhenLocked: s.doubletapWhenLocked,
      keepScreenOnWhileListening: enabled,
      orbDesignVariant: s.orbDesignVariant,
      orbColorRGB: s.orbColorRGB,
    });
  },

  setOrbDesignVariant: async (variant) => {
    set({ orbDesignVariant: variant });
    const s = get();
    await saveSettings({
      testWebhook: s.testWebhook,
      productionWebhook: s.productionWebhook,
      webhookMode: s.webhookMode,
      tools: s.tools,
      transcriptionMode: s.transcriptionMode,
      backgroundListening24_7: s.backgroundListening24_7,
      doubletapWhenLocked: s.doubletapWhenLocked,
      keepScreenOnWhileListening: s.keepScreenOnWhileListening,
      orbDesignVariant: variant,
      orbColorRGB: s.orbColorRGB,
    });
  },

  setOrbColorRGB: async (rgb) => {
    set({ orbColorRGB: rgb });
    const s = get();
    await saveSettings({
      testWebhook: s.testWebhook,
      productionWebhook: s.productionWebhook,
      webhookMode: s.webhookMode,
      tools: s.tools,
      transcriptionMode: s.transcriptionMode,
      backgroundListening24_7: s.backgroundListening24_7,
      doubletapWhenLocked: s.doubletapWhenLocked,
      keepScreenOnWhileListening: s.keepScreenOnWhileListening,
      orbDesignVariant: s.orbDesignVariant,
      orbColorRGB: rgb,
    });
  },
}));
