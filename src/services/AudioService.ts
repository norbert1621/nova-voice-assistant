import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const WAITING_ASSET = require('../../assets/waiting.mp3');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CHIME_ASSET = require('../../assets/chime.mp3');

/**
 * Single long-lived player reused for ALL audio: waiting music, chime, and
 * response audio.  It is NEVER removed — keeping it alive (even when muted)
 * holds Android audio focus continuously and prevents the focus-loss gap that
 * silences playback.
 *
 * Previously, a separate chimePlayer was used for the chime.  That caused
 * Android to grant AUDIOFOCUS_GAIN to the chime player and send
 * AUDIOFOCUS_LOSS to mainPlayer, which ExoPlayer auto-pauses.  After the
 * chime released focus no player held it, so the first playUrl() had to
 * re-acquire focus from scratch — unreliable on a fresh session.
 */
let mainPlayer: AudioPlayer | null = null;

function getMain(): AudioPlayer {
  if (!mainPlayer) {
    mainPlayer = createAudioPlayer(WAITING_ASSET, { updateInterval: 500 });
    mainPlayer.loop = true;
    mainPlayer.muted = true;
    mainPlayer.play(); // silent — establishes audio focus immediately
    console.log('[AudioService] mainPlayer started (silent focus holder)');
  }
  return mainPlayer;
}

/** Await a single playback on mainPlayer from the current source. */
async function awaitPlayback(p: AudioPlayer, timeoutMs: number): Promise<void> {
  const subRef = { current: null as { remove(): void } | null };
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      subRef.current?.remove();
      subRef.current = null;
      resolve();
    }, timeoutMs);
    subRef.current = p.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        clearTimeout(timer);
        subRef.current?.remove();
        subRef.current = null;
        resolve();
      }
    });
  });
}

export const AudioService = {
  async configure(): Promise<void> {
    await setAudioModeAsync({
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix', // exclusive focus — nothing can interrupt us
    });
    // Create player NOW so audio focus is claimed at startup, not on first use
    getMain();
    console.log('[AudioService] configured — audio focus claimed');
  },

  async startWaiting(): Promise<void> {
    console.log('[AudioService] startWaiting');
    const p = getMain();
    p.loop = true;
    p.replace(WAITING_ASSET); // swap source while still holding focus
    p.muted = false;          // unmute — waiting music becomes audible
    p.play();
  },

  async stopWaiting(): Promise<void> {
    if (!mainPlayer) return;
    console.log('[AudioService] stopWaiting — muting, keeping focus');
    // Do NOT pause or remove. Just mute so audio focus stays held.
    mainPlayer.muted = true;
  },

  async playChime(): Promise<void> {
    console.log('[AudioService] playChime called');
    const p = getMain();
    p.loop = false;
    p.muted = false;
    p.replace(CHIME_ASSET);
    p.play();
    await awaitPlayback(p, 10_000);
    console.log('[AudioService] chime finished');
    // Return to silent focus-holding state so playUrl has a clean slate
    p.muted = true;
    p.loop = true;
    p.replace(WAITING_ASSET);
    p.play(); // explicitly re-assert playing state (and focus) on mainPlayer
  },

  async replay(url: string): Promise<void> {
    console.log('[AudioService] replay:', url);
    await AudioService.playUrl(url);
  },

  async playUrl(url: string, onBeforePlay?: () => void): Promise<void> {
    console.log('[AudioService] playUrl — downloading:', url);

    const urlExt = url.match(/\.(mp3|wav|aac|m4a|ogg|opus|webm)(\?|$)/i)?.[1] ?? 'mp3';
    const localPath = FileSystem.cacheDirectory + 'nova_response_' + Date.now() + '.' + urlExt;
    let playUri = url;
    try {
      const t0 = Date.now();
      const result = await FileSystem.downloadAsync(url, localPath);
      const info = await FileSystem.getInfoAsync(localPath);
      const sizeKB = (info.exists && 'size' in info && info.size) ? (info.size / 1024).toFixed(1) : '?';
      console.log('[AudioService] downloaded in', Date.now() - t0, 'ms | size:', sizeKB, 'KB | ext:', urlExt);
      playUri = result.uri;
    } catch (e) {
      console.warn('[AudioService] download failed, using URL directly:', e);
    }

    const p = getMain();
    // Swap source on the SAME player (still holding focus — no gap)
    p.loop = false;
    p.muted = false;
    p.replace({ uri: playUri });

    // Use an object ref so TypeScript doesn't narrow the captured variable to `never`
    const subRef = { current: null as { remove(): void } | null };

    try {
      await new Promise<void>((resolve) => {
        const safetyTimer = setTimeout(() => {
          console.warn('[AudioService] safety timeout fired');
          subRef.current?.remove();
          subRef.current = null;
          resolve();
        }, 10 * 60 * 1000);

        subRef.current = p.addListener('playbackStatusUpdate', (status) => {
          const posMs = Math.round(status.currentTime * 1000);
          console.log(
            '[AudioService] pos:', posMs, 'ms',
            '| playing:', status.playing,
            '| muted:', status.mute,
            '| finished:', status.didJustFinish,
          );

          if (status.didJustFinish) {
            clearTimeout(safetyTimer);
            subRef.current?.remove();
            subRef.current = null;
            resolve();
          } else if (status.isLoaded && !status.playing && !status.didJustFinish && posMs > 0) {
            console.warn('[AudioService] paused at', posMs, 'ms — resuming');
            p.play();
          }
        });

        onBeforePlay?.();
        p.play();
      });

      console.log('[AudioService] ✓ playback finished');
    } finally {
      subRef.current?.remove();
      // Return to silent focus-holding state — ready for next interaction
      p.muted = true;
      p.loop = true;
      p.replace(WAITING_ASSET);
      p.play(); // explicitly re-assert playing state and audio focus
      FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
    }
  },
};
