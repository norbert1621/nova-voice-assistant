import AudioRecord from 'react-native-audio-record';

const API_KEY = process.env.EXPO_PUBLIC_ASSEMBLYAI_API_KEY ?? '';
// u3-rt-pro = Universal-3 real-time pro model (v3 streaming)
// end_utterance_silence_threshold: ms of silence before finalising a turn (default 700ms — too short)
const WS_URL = 'wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&speech_model=u3-rt-pro&end_utterance_silence_threshold=2000';

export const AssemblyAIService = {
  transcribe(timeoutMs: number, onSessionReady?: () => Promise<void>): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!API_KEY) {
        reject(new Error('[AssemblyAI] API key not set'));
        return;
      }

      AudioRecord.init({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6, // VOICE_RECOGNITION
        wavFile: 'nova_cmd.wav',
      });

      // React Native WebSocket supports a 3rd options arg (not in TS types)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const WS = WebSocket as any;
      const ws: WebSocket = new WS(WS_URL, [], { headers: { Authorization: API_KEY } });
      let finalText = '';
      let resolved = false;
      let micStarted = false;

      const finish = (text: string) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutTimer);

        const doResolve = () => {
          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ terminate_session: true }));
              ws.close();
            }
          } catch {}
          resolve(text.trim());
        };

        if (micStarted) {
          // Await mic stop so Android's AEC is fully disabled before playback starts.
          // Previously this was fire-and-forget, which left the mic active during the
          // first response playback and caused AEC to suppress audio output.
          AudioRecord.stop().then(doResolve).catch(doResolve);
        } else {
          doResolve();
        }
      };

      const startMic = () => {
        if (micStarted) return;
        micStarted = true;
        console.log('[AssemblyAI] session ready — starting mic');

        // AssemblyAI v3 requires chunks between 50ms–1000ms
        // At 16kHz PCM16 mono: 32 bytes/ms → 100ms = 3200 bytes
        const MIN_SEND_BYTES = 3200; // 100ms worth of audio
        let audioBuffer = new Uint8Array(0);

        AudioRecord.on('data', (chunk: string) => {
          if (ws.readyState !== WebSocket.OPEN) return;

          const binaryStr = atob(chunk);
          const incoming = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            incoming[i] = binaryStr.charCodeAt(i);
          }

          // Accumulate until we have at least 100ms of audio
          const merged = new Uint8Array(audioBuffer.length + incoming.length);
          merged.set(audioBuffer);
          merged.set(incoming, audioBuffer.length);
          audioBuffer = merged;

          if (audioBuffer.length >= MIN_SEND_BYTES) {
            ws.send(audioBuffer.buffer);
            audioBuffer = new Uint8Array(0);
          }
        });

        AudioRecord.start();
      };

      const timeoutTimer = setTimeout(() => {
        console.log('[AssemblyAI] timeout — text so far:', JSON.stringify(finalText));
        finish(finalText);
      }, timeoutMs);

      ws.onopen = () => {
        // Don't start mic yet — wait for server's session-begin message
        console.log('[AssemblyAI] WebSocket open, waiting for session begin...');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as Record<string, unknown>;
          console.log('[AssemblyAI] message:', JSON.stringify(msg));

          const type = (msg.type ?? msg.message_type ?? '') as string;
          const text = (msg.transcript ?? msg.text ?? '') as string;
          const endOfTurn = msg.end_of_turn as boolean | undefined;

          // Server signals session is ready — play chime then start mic
          if (type.toLowerCase() === 'begin' || type === 'SessionBegins') {
            (async () => {
              if (onSessionReady) await onSessionReady().catch(() => {});
              startMic();
            })();
            return;
          }

          // Keep latest partial as fallback
          if (text && endOfTurn !== true && type !== 'FinalTranscript') {
            console.log('[AssemblyAI] partial:', text);
            finalText = text;
          }

          // Final transcript: v3 end_of_turn=true OR v2 FinalTranscript
          if ((endOfTurn === true || type === 'FinalTranscript') && text.trim()) {
            console.log('[AssemblyAI] final:', text);
            finish(text);
          }
        } catch (e) {
          console.warn('[AssemblyAI] parse error:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('[AssemblyAI] error:', e);
        clearTimeout(timeoutTimer);
        if (micStarted) AudioRecord.stop().catch(() => {});
        reject(new Error('[AssemblyAI] WebSocket error'));
      };

      ws.onclose = (event) => {
        console.log('[AssemblyAI] closed — code:', event.code, 'reason:', event.reason);
        if (!resolved) finish(finalText);
      };
    });
  },
};
