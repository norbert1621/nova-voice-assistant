import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer, AudioStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const WAITING_ASSET = require('../../assets/waiting.mp3');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CHIME_ASSET = require('../../assets/chime.mp3');

/**
 * Single long-lived player reused for ALL audio: waiting music, chime, and
 * response audio.  It is NEVER removed — keeping it alive holds Android audio
 * focus (AUDIOFOCUS_GAIN) continuously.
 *
 * Root cause of the "cuts after 1-2s" bug:
 *   ExoPlayer releases audio focus when setMediaItem() is called and briefly
 *   re-requests it once the new source is ready (STATE_READY).  If we call
 *   play() immediately after replace(), audio plays from the pre-buffer for
 *   ~1-2s while Android is still granting focus — then goes silent.
 *
 * Fix: stay MUTED during replace().  Poll isLoaded via playbackStatusUpdate.
 * Only unmute + play AFTER isLoaded=true, which means ExoPlayer is in
 * STATE_READY and has successfully re-acquired audio focus.
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
 * Wait until the player's isLoaded transitions to true, which means ExoPlayer
 * has reached STATE_READY and re-acquired audio focus after a replace() call.
 */
function waitForLoaded(p: AudioPlayer, timeoutMs: number): Promise<void> {
  if (p.isLoaded) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      sub.remove();
      console.warn('[AudioService] waitForLoaded timed out');
      resolve();
    }, timeoutMs);
    const sub = p.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.isLoaded) {
        clearTimeout(timer);
        sub.remove();
        resolve();
      }
    });
  });
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
    subRef.current = p.addListener('playbackStatusUpdate', (status: AudioStatus) => {
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
    p.muted = true;
    p.replace(WAITING_ASSET);
    await waitForLoaded(p, 3000);
    p.muted = false;
    p.play();
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
    p.muted = true; // stay muted while ExoPlayer swaps source + re-acquires focus
    p.replace(CHIME_ASSET);
    await waitForLoaded(p, 3000);
    p.muted = false;
    p.play();
    await awaitPlayback(p, 10_000);
    console.log('[AudioService] chime finished');
    // Return to silent focus-holding state so playUrl has a clean slate
    p.muted = true;
    p.loop = true;
    p.replace(WAITING_ASSET);
    p.play(); // explicitly re-assert playing state and focus
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

    // Stay MUTED while ExoPlayer swaps source and re-acquires audio focus.
    // Only unmute after isLoaded=true — at that point focus is firmly held.
    p.loop = false;
    p.muted = true;
    p.replace({ uri: playUri });
    await waitForLoaded(p, 5000);
    p.muted = false;

    const subRef = { current: null as { remove(): void } | null };

    try {
      await new Promise<void>((resolve) => {
        const safetyTimer = setTimeout(() => {
          console.warn('[AudioService] safety timeout fired');
          subRef.current?.remove();
          subRef.current = null;
          resolve();
        }, 10 * 60 * 1000);

        subRef.current = p.addListener('playbackStatusUpdate', (status: AudioStatus) => {
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
