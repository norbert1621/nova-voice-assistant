import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { AppStatus } from '../store/appStore';
import { useOrbAnimation } from '../hooks/useOrbAnimation';
import { Colors } from '../constants/colors';

interface OrbProps {
  status: AppStatus;
}

const ORB_SIZE = 220;

export function Orb({ status }: OrbProps) {
  const { orbStyle, glowStyle, ring1Style, ring2Style } = useOrbAnimation(status);

  const orbColor = status === 'error' ? '#F87171' : Colors.purple;

  return (
    <View style={styles.container}>
      {/* Outer glow — large, very diffuse */}
      <Animated.View
        style={[
          styles.glow,
          { backgroundColor: orbColor, width: ORB_SIZE * 2, height: ORB_SIZE * 2 },
          glowStyle,
        ]}
      />

      {/* Ripple ring 1 */}
      <Animated.View
        style={[
          styles.ring,
          { width: ORB_SIZE, height: ORB_SIZE, borderColor: orbColor },
          ring1Style,
        ]}
      />

      {/* Ripple ring 2 */}
      <Animated.View
        style={[
          styles.ring,
          { width: ORB_SIZE, height: ORB_SIZE, borderColor: orbColor },
          ring2Style,
        ]}
      />

      {/* Main orb */}
      <Animated.View style={[styles.orbWrapper, orbStyle]}>
        {/* Outer shell */}
        <View style={[styles.orbOuter, { backgroundColor: orbColor }]}>
          {/* Inner highlight layer */}
          <View style={styles.orbInner} />
          {/* Core highlight spot */}
          <View style={styles.orbCore} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    borderRadius: 9999,
    // Soft diffuse glow using shadow
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
    elevation: 0,
  },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  orbWrapper: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
    // Strong orb glow
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 20,
  },
  orbOuter: {
    flex: 1,
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: ORB_SIZE * 0.15,
  },
  // Lighter inner zone — creates a sense of depth
  orbInner: {
    width: ORB_SIZE * 0.65,
    height: ORB_SIZE * 0.65,
    borderRadius: ORB_SIZE,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  // Small bright highlight spot — like light catching a sphere
  orbCore: {
    position: 'absolute',
    top: ORB_SIZE * 0.12,
    left: ORB_SIZE * 0.22,
    width: ORB_SIZE * 0.22,
    height: ORB_SIZE * 0.14,
    borderRadius: ORB_SIZE,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    transform: [{ rotate: '-20deg' }],
  },
});
