import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { useSettingsStore } from '../store/settingsStore';
import { eventBus, Events } from '../utils/eventBus';
import { WakeWordService } from '../services/WakeWordService';
import { CommandService } from '../services/CommandService';
import { AudioService } from '../services/AudioService';
import { ForegroundService } from '../services/ForegroundService';
import { resolveWebhook } from '../services/RouterService';
import { sendCommand } from '../services/WebhookService';
import { Config } from '../constants/config';

export function useAssistantLoop() {
  const isProcessing = useRef(false);

  useEffect(() => {
    const unsubscribe = eventBus.on(Events.WAKE_WORD, handleWakeWord);
    return unsubscribe;
  }, []);

  async function handleWakeWord() {
    if (isProcessing.current) return;

    const { isMuted, setStatus, setLastCommand, setLastResponse } =
      useAppStore.getState();

    if (isMuted) return;

    isProcessing.current = true;

    try {
      setStatus('listening');

      // Release mic so Vosk can switch to command mode
      WakeWordService.stop();

      await delay(Config.micHandoffDelayMs);

      // Listen for the initial command — chime plays when session is ready
      let command: string;
      try {
        console.log('[AssistantLoop] CommandService.startListening...');
        command = await CommandService.startListening(
          Config.commandTimeoutMs,
          () => AudioService.playChime(),
        );
        console.log('[AssistantLoop] command captured:', JSON.stringify(command));
      } catch (e) {
        console.warn('[AssistantLoop] CommandService failed / no speech:', e);
        return;
      }

      if (!command.trim()) {
        console.warn('[AssistantLoop] command was empty after trim — aborting');
        return;
      }

      // Conversation loop — keeps going until user stops replying
      while (true) {
        setLastCommand(command);
        setStatus('thinking');
        ForegroundService.updateText('Thinking...').catch(() => {});

        const { testWebhook, productionWebhook, webhookMode, tools } = useSettingsStore.getState();
        const mainWebhook = webhookMode === 'test' ? testWebhook : productionWebhook;
        console.log('[AssistantLoop] mode:', webhookMode, 'url:', mainWebhook);
        if (!mainWebhook) {
          console.warn('[AssistantLoop] No webhook URL configured — set one in Settings');
          setStatus('error');
          return;
        }

        const webhookUrl = resolveWebhook(command, tools, mainWebhook);
        console.log('[AssistantLoop] resolved webhookUrl:', webhookUrl);

        console.log('[AssistantLoop] calling sendCommand...');
        await AudioService.startWaiting().catch((e) => console.warn('[Waiting] failed to start:', e));
        const { audio_url } = await sendCommand(webhookUrl, command);
        console.log('[AssistantLoop] got audio_url:', audio_url);

        await AudioService.stopWaiting();

        if (!audio_url) {
          console.warn('[AssistantLoop] blank audio_url — skipping playback, returning to idle');
          break;
        }

        setStatus('speaking');
        ForegroundService.updateText('Speaking...').catch(() => {});
        useAppStore.getState().setLastAudioUrl(audio_url);
        await AudioService.playUrl(audio_url);
        setLastResponse('Response played');

        // Wait for a follow-up — chime plays when session is ready
        setStatus('listening');
        ForegroundService.updateText('Listening...').catch(() => {});

        let followUp: string;
        try {
          followUp = await CommandService.startListening(
            Config.followUpTimeoutMs,
            () => AudioService.playChime(),
          );
          console.log('[AssistantLoop] follow-up captured:', JSON.stringify(followUp));
        } catch {
          // Error — end the conversation
          console.log('[AssistantLoop] No follow-up — returning to idle');
          break;
        }

        if (!followUp.trim()) {
          console.log('[AssistantLoop] Follow-up was empty — returning to idle');
          break;
        }

        command = followUp;
      }
    } catch (err) {
      console.error('[AssistantLoop] Error:', err);
      AudioService.stopWaiting().catch(() => {}); // ensure waiting music stops on any error
      setStatus('error');
      await delay(1500);
    } finally {
      isProcessing.current = false;
      useAppStore.getState().setStatus('idle');
      ForegroundService.updateText('Say "Hey Nova" to start...').catch(() => {});

      // Re-acquire mic for wake word detection
      WakeWordService.startListening().catch((e) => {
        console.error('[AssistantLoop] Failed to restart Vosk:', e);
      });
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
