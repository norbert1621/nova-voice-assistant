import { AssemblyAIService } from './AssemblyAIService';
import { WakeWordService } from './WakeWordService';
import { useSettingsStore } from '../store/settingsStore';
import { Config } from '../constants/config';

export const CommandService = {
  async startListening(
    timeoutMs: number = Config.commandTimeoutMs,
    onSessionReady?: () => Promise<void>,
  ): Promise<string> {
    const { transcriptionMode } = useSettingsStore.getState();
    if (transcriptionMode === 'vosk') {
      // Vosk is ready immediately — play chime then capture
      if (onSessionReady) await onSessionReady().catch(() => {});
      return WakeWordService.captureCommand(timeoutMs);
    }
    return AssemblyAIService.transcribe(timeoutMs, onSessionReady);
  },
};
