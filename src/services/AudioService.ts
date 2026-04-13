import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer, AudioStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const WAITING_ASSET = require('../../assets/waiting.mp3');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CHIME_ASSET = require('../../assets/chime.mp3');

/**
 * Single long-lived player reused for ALL audio.  Never removed — holds
 * Android AUDIOFOCUS_GAIN continuously.
 *
 * The "cuts after 1-2s" bug:
 *   ExoPlayer releases focus when setMediaItem() is called (inside replace()).
 *   It re-requests focus only AFTER reaching STATE_READY.  If we unmute right
 *   after replace(), audio plays from the pre-buffer for ~1-2s while Android
 *   is still processing the focus grant — then silence.
 *
 *   isLoaded=true fires at STATE_READY, but focus may not be granted yet.
 *   The reliable signal is status.playing=true — that fires only after
 *   ExoPlayer has focus AND has started producing audio.
 *
 * Fix: call play() while still MUTED.  Wait for the first status update with
 * playing=true — focus is now confirmed.  THEN set muted=false.  The very
 * first audible sample is guaranteed to have audio focus.
 */
let mainPlayer: AudioPlayer | null = null;

function getMain(): AudioPlayer {
  if (!mainPlayer) {
    mainPlayer = createAudioPlayer(WAITING_ASSET, { updateInterval: 100 });
    mainPlayer.loop = true;
    mainPlayer.muted = true;
    mainPlayer.play(); // silent — establishes audio focus immediately
    console.log('[AudioService] mainPlayer started (silent focus holder)');
  }
  return mainPlayer;
}

/**
 * Start playing (muted), then unmute only once status.playing=true.
 * This guarantees focus is held before any audible output.
 */
function playAndWaitForFocus(
  p: AudioPlayer,
  timeoutMs: number,
  onFocusConfirmed?: () => void,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      sub.remove();
      console.warn('[AudioService] focus-wait timed out — unmuting anyway');
      p.muted = false;
      onFocusConfirmed?.();
      resolve();
    }, timeoutMs);

    const sub = p.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.playing) {
        clearTimeout(timer);
        sub.remove();
        p.muted = false;
        onFocusConfirmed?.();
        resolve();
      }
    });

    p.play(); // trigger focus acquisition while muted
  });
}

export const AudioService = {
  async configure(): Promise<void> {
    await setAudioModeAsync({
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
    getMain();
    console.log('[AudioService] configured — audio focus claimed');
  },

  async startWaiting(): Promise<void> {
    console.log('[AudioService] startWaiting');
    const p = getMain();
    p.loop = true;
    p.muted = true;
    p.replace(WAITING_ASSET);
    await playAndWaitForFocus(p, 3000);
  },

  async stopWaiting(): Promise<void> {
    if (!mainPlayer) return;
    console.log('[AudioService] stopWaiting — muting, keeping focus');
    mainPlayer.muted = true;
  },

  async playChime(): Promise<void> {
    console.log('[AudioService] playChime called');
    const p = getMain();
    p.loop = false;
    p.muted = true;
    p.replace(CHIME_ASSET);

    // Play muted, wait for focus confirmed, then unmute
    await playAndWaitForFocus(p, 3000);

    // Wait for chime to finish
    const subRef = { current: null as { remove(): void } | null };
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        subRef.current?.remove();
        subRef.current = null;
        resolve();
      }, 10_000);
      subRef.current = p.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (status.didJustFinish) {
          clearTimeout(timer);
          subRef.current?.remove();
          subRef.current = null;
          resolve();
        }
      });
    });

    console.log('[AudioService] chime finished');
    // Return to silent focus-holding state
    p.muted = true;
    p.loop = true;
    p.replace(WAITING_ASSET);
    p.play();
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
    p.loop = false;
    p.muted = true; // STAY MUTED while ExoPlayer swaps source + re-acquires focus
    p.replace({ uri: playUri });

    const subRef = { current: null as { remove(): void } | null };

    try {
      await new Promise<void>((resolve) => {
        const safetyTimer = setTimeout(() => {
          console.warn('[AudioService] safety timeout fired');
          subRef.current?.remove();
          subRef.current = null;
          resolve();
        }, 10 * 60 * 1000);

        let focusConfirmed = false;

        subRef.current = p.addListener('playbackStatusUpdate', (status: AudioStatus) => {
          const posMs = Math.round(status.currentTime * 1000);

          // First status.playing=true → focus is confirmed → unmute for audible output
          if (!focusConfirmed && status.playing) {
            focusConfirmed = true;
            p.muted = false;
            onBeforePlay?.();
            console.log('[AudioService] focus confirmed — unmuting at', posMs, 'ms');
          }

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
          } else if (focusConfirmed && status.isLoaded && !status.playing && !status.didJustFinish && posMs > 0) {
            console.warn('[AudioService] paused at', posMs, 'ms — resuming');
            p.play();
          }
        });

        // play() while muted — triggers ExoPlayer to request audio focus
        p.play();
      });

      console.log('[AudioService] ✓ playback finished');
    } finally {
      subRef.current?.remove();
      p.muted = true;
      p.loop = true;
      p.replace(WAITING_ASSET);
      p.play();
      FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
    }
  },
};
