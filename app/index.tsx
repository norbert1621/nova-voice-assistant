import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
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

export default function HomeScreen() {
  const status = useAppStore((s) => s.status);
  const lastCommand = useAppStore((s) => s.lastCommand);
  const lastResponse = useAppStore((s) => s.lastResponse);
  const lastAudioUrl = useAppStore((s) => s.lastAudioUrl);
  const isMuted = useAppStore((s) => s.isMuted);
  const voskPartial = useAppStore((s) => s.voskPartial);
  const toggleMute = useAppStore((s) => s.toggleMute);
  const webhookMode = useSettingsStore((s) => s.webhookMode);

  const [replaying, setReplaying] = useState(false);
  const replayLock = useRef(false);

  async function handleReplay() {
    if (replayLock.current || !lastAudioUrl) return;
    replayLock.current = true;
    setReplaying(true);
    try {
      await AudioService.replay(lastAudioUrl);
    } finally {
      setReplaying(false);
      replayLock.current = false;
    }
  }

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
        <Orb status={status} />
        <View style={styles.statusGap} />
        <StatusText status={status} />
      </View>

      {/* Command + response text */}
      <View style={styles.textSection}>
        <CommandDisplay command={lastCommand} response={lastResponse} />
      </View>

      {/* Replay button — only when idle and a previous response exists */}
      {status === 'idle' && !!lastAudioUrl && (
        <Pressable
          onPress={handleReplay}
          disabled={replaying}
          style={({ pressed }) => [styles.replayBtn, (pressed || replaying) && styles.replayBtnActive]}
          accessibilityLabel="Replay last response"
          accessibilityRole="button"
        >
          {replaying
            ? <ActivityIndicator size="small" color={Colors.purpleLight} />
            : <Text style={styles.replayText}>↺  REPLAY</Text>
          }
        </Pressable>
      )}

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
    // Subtle radial-ish gradient effect via a centered semi-transparent ellipse
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
  statusGap: {
    height: 32,
  },
  textSection: {
    minHeight: 160,
    justifyContent: 'flex-start',
    paddingBottom: 24,
  },
  replayBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    backgroundColor: 'rgba(109, 40, 217, 0.12)',
    marginBottom: 16,
    minWidth: 100,
    justifyContent: 'center',
  },
  replayBtnActive: {
    backgroundColor: 'rgba(109, 40, 217, 0.25)',
    borderColor: 'rgba(168, 85, 247, 0.6)',
  },
  replayText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    color: Colors.purpleLight,
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
