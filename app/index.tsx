import React, { useRef } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '../src/store/appStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { AudioService } from '../src/services/AudioService';
import { Orb } from '../src/components/Orb';
import { StatusText } from '../src/components/StatusText';
import { CommandDisplay } from '../src/components/CommandDisplay';
import { MuteToggle } from '../src/components/MuteToggle';
import { Colors } from '../src/constants/colors';

const ORB_SIZE = 220;
const REPLAY_BTN = 60;

export default function HomeScreen() {
  const status = useAppStore((s) => s.status);
  const lastCommand = useAppStore((s) => s.lastCommand);
  const lastResponse = useAppStore((s) => s.lastResponse);
  const lastAudioUrl = useAppStore((s) => s.lastAudioUrl);
  const isMuted = useAppStore((s) => s.isMuted);
  const voskPartial = useAppStore((s) => s.voskPartial);
  const toggleMute = useAppStore((s) => s.toggleMute);
  const webhookMode = useSettingsStore((s) => s.webhookMode);

  const replayLock = useRef(false);

  async function handleReplay() {
    if (replayLock.current || !lastAudioUrl) return;
    replayLock.current = true;
    useAppStore.getState().setStatus('speaking');
    try {
      await AudioService.replay(lastAudioUrl);
    } finally {
      replayLock.current = false;
      useAppStore.getState().setStatus('idle');
    }
  }

  const showReplay = status === 'idle' && !!lastAudioUrl;

  return (
    <SafeAreaView style={styles.root}>
      {/* Background glow that subtly reacts to orb state */}
      <View style={styles.bgGlow} pointerEvents="none" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <MuteToggle isMuted={isMuted} onToggle={toggleMute} />

        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>NOVA</Text>
          <View style={[styles.modeBadge, webhookMode === 'production' && styles.modeBadgeProd]}>
            <Text style={styles.modeBadgeText}>
              {webhookMode === 'test' ? 'TEST' : 'PROD'}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.5 }]}
          accessibilityLabel="Open settings"
          accessibilityRole="button"
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      </View>

      {/* Orb + status — vertical center of the screen */}
      <View style={styles.orbSection}>
        {/* Orb with replay button overlaid in its center */}
        <View style={styles.orbContainer}>
          <Orb status={status} />

          {showReplay && (
            <Pressable
              onPress={handleReplay}
              style={({ pressed }) => [styles.replayBtn, pressed && styles.replayBtnPressed]}
              accessibilityLabel="Replay last response"
              accessibilityRole="button"
            >
              <Text style={styles.replayIcon}>↺</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.statusGap} />
        <StatusText status={status} />
      </View>

      {/* Command + response text */}
      <View style={styles.textSection}>
        <CommandDisplay command={lastCommand} response={lastResponse} />
      </View>

      {/* Debug: live Vosk transcript */}
      {status === 'idle' && (
        <View style={styles.debugBar}>
          <Text style={styles.debugLabel}>MIC: </Text>
          <Text style={styles.debugText} numberOfLines={1}>
            {voskPartial || '— silence —'}
          </Text>
        </View>
      )}

      {/* Muted banner */}
      {isMuted && (
        <View style={styles.mutedBanner}>
          <Text style={styles.mutedBannerText}>MUTED</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070711',
  },
  bgGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
    top: '15%',
    left: '15%',
    right: '15%',
    bottom: '20%',
    backgroundColor: 'rgba(88, 28, 135, 0.04)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  wordmarkRow: {
    alignItems: 'center',
    gap: 6,
  },
  wordmark: {
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 8,
    color: Colors.whiteDim,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(109, 40, 217, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  modeBadgeProd: {
    backgroundColor: 'rgba(6, 95, 70, 0.5)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  modeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.whiteDim,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 22,
    color: Colors.whiteDim,
  },
  orbSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  orbContainer: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayBtn: {
    position: 'absolute',
    top: (ORB_SIZE - REPLAY_BTN) / 2,   // vertically centered within orbContainer
    alignSelf: 'center',                  // horizontally centered
    width: REPLAY_BTN,
    height: REPLAY_BTN,
    borderRadius: REPLAY_BTN / 2,
    backgroundColor: 'rgba(7, 7, 17, 0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 10,
  },
  replayBtnPressed: {
    backgroundColor: 'rgba(109, 40, 217, 0.45)',
    borderColor: 'rgba(168, 85, 247, 1)',
  },
  replayIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 32,
  },
  statusGap: {
    height: 32,
  },
  textSection: {
    minHeight: 160,
    justifyContent: 'flex-start',
    paddingBottom: 80,
  },
  debugBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  debugLabel: {
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '600',
  },
  debugText: {
    flex: 1,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
  mutedBanner: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  mutedBannerText: {
    fontSize: 11,
    letterSpacing: 4,
    color: Colors.error,
    fontWeight: '500',
  },
});
