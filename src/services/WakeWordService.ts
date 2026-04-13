import * as Vosk from 'react-native-vosk';
import { Config } from '../constants/config';
import { eventBus, Events } from '../utils/eventBus';
import { useAppStore } from '../store/appStore';

let isInitialized = false;
let isListening = false;
let lastTriggerTime = 0;
let resultSub: ReturnType<typeof Vosk.onResult> | null = null;
let partialSub: ReturnType<typeof Vosk.onPartialResult> | null = null;
let errorSub: ReturnType<typeof Vosk.onError> | null = null;
let lastPartial = '';
let partialHadWakeWord = false; // true once partials contain "hey nova"

// Command capture state
let isCommandMode = false;
let commandResolve: ((text: string) => void) | null = null;
let commandReject: ((err: Error) => void) | null = null;
let commandTimeoutId: ReturnType<typeof setTimeout> | null = null;

export const WakeWordService = {
  async initialize(): Promise<void> {
    if (isInitialized) return;

    console.log('[WakeWordService] Loading Vosk model:', Config.voskModelPath);
    await Vosk.loadModel(Config.voskModelPath);
    console.log('[WakeWordService] Vosk model loaded');
    isInitialized = true;

    // onResult fires after each utterance in continuous recognition.
    resultSub = Vosk.onResult((text: string) => {
      // --- Command capture mode ---
      if (isCommandMode) {
        const resolve = commandResolve;
        commandResolve = null;
        commandReject = null;
        isCommandMode = false;
        if (commandTimeoutId) { clearTimeout(commandTimeoutId); commandTimeoutId = null; }
        Vosk.stop();
        isListening = false;
        lastPartial = '';
        console.log('[WakeWordService] command result:', text);
        resolve?.(text);
        return;
      }

      // --- Wake word detection mode ---
      console.log('[Vosk] result:', text);
      const normalized = text.toLowerCase().trim();
      const isWakeWord = Config.wakeWordVariants.some((v) => normalized === v);

      // Double-confirmation: partial results must have shown wake word too.
      if (isWakeWord && partialHadWakeWord) {
        const now = Date.now();
        if (now - lastTriggerTime < Config.wakeWordCooldownMs) {
          partialHadWakeWord = false;
          return;
        }
        lastTriggerTime = now;
        partialHadWakeWord = false;
        console.log('[WakeWordService] WAKE WORD TRIGGERED');
        eventBus.emit(Events.WAKE_WORD);
      }

      // Reset for next utterance
      useAppStore.getState().setVoskPartial('');
      lastPartial = '';
      partialHadWakeWord = false;
    });

    partialSub = Vosk.onPartialResult((text: string) => {
      if (isCommandMode) return; // Ignore partials during command capture
      if (text !== lastPartial) {
        lastPartial = text;
        console.log('[Vosk] partial:', text || '(silence)');
        useAppStore.getState().setVoskPartial(text);
        const lower = text.toLowerCase();
        if (Config.wakeWordVariants.some((v) => lower.includes(v))) {
          partialHadWakeWord = true;
        }
      }
    });

    errorSub = Vosk.onError((error: unknown) => {
      console.warn('[WakeWordService] Vosk error:', error);
      if (isCommandMode) {
        const reject = commandReject;
        commandResolve = null;
        commandReject = null;
        isCommandMode = false;
        if (commandTimeoutId) { clearTimeout(commandTimeoutId); commandTimeoutId = null; }
        isListening = false;
        reject?.(new Error(`Vosk error: ${error}`));
      }
    });
  },

  async startListening(): Promise<void> {
    if (!isInitialized) {
      console.warn('[WakeWordService] Not initialized — call initialize() first');
      return;
    }
    if (isListening) return;

    await Vosk.start({
      grammar: [...Config.wakeWordGrammar],
    });
    isListening = true;
    console.log('[WakeWordService] Listening for wake word, grammar:', Config.wakeWordGrammar);
  },

  // Capture a single spoken command using full Vosk vocabulary.
  // Resolves with the transcript, rejects on timeout or error.
  captureCommand(timeoutMs: number): Promise<string> {
    if (!isInitialized) {
      return Promise.reject(new Error('[WakeWordService] Not initialized'));
    }

    return new Promise((resolve, reject) => {
      isCommandMode = true;
      commandResolve = resolve;
      commandReject = reject;

      commandTimeoutId = setTimeout(() => {
        isCommandMode = false;
        commandResolve = null;
        commandReject = null;
        commandTimeoutId = null;
        Vosk.stop();
        isListening = false;
        reject(new Error('Command timeout — no speech detected'));
      }, timeoutMs);

      // Start Vosk without grammar = full vocabulary recognition
      Vosk.start().then(() => {
        isListening = true;
        console.log('[WakeWordService] Capturing command (full vocabulary)...');
      }).catch((err) => {
        isCommandMode = false;
        commandResolve = null;
        commandReject = null;
        if (commandTimeoutId) { clearTimeout(commandTimeoutId); commandTimeoutId = null; }
        reject(err);
      });
    });
  },

  stop(): void {
    if (!isListening) return;
    Vosk.stop();
    isListening = false;
    lastPartial = '';
    partialHadWakeWord = false;
  },

  cleanup(): void {
    resultSub?.remove();
    partialSub?.remove();
    errorSub?.remove();
    resultSub = null;
    partialSub = null;
    errorSub = null;
    lastPartial = '';
    partialHadWakeWord = false;
    isInitialized = false;
    isListening = false;
    isCommandMode = false;
    commandResolve = null;
    commandReject = null;
    if (commandTimeoutId) { clearTimeout(commandTimeoutId); commandTimeoutId = null; }
  },

  get ready(): boolean {
    return isInitialized;
  },
};
