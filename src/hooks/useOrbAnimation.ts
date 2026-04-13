import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import type { AppStatus } from '../store/appStore';

export function useOrbAnimation(status: AppStatus) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.45);
  const glowOpacity = useSharedValue(0.15);

  // Ripple rings (for listening state)
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(opacity);
    cancelAnimation(glowOpacity);
    cancelAnimation(ring1Scale);
    cancelAnimation(ring1Opacity);
    cancelAnimation(ring2Scale);
    cancelAnimation(ring2Opacity);

    if (status === 'idle') {
      // Slow, gentle breathing — the orb is dormant
      scale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.96, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.35, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.18, { duration: 2800 }),
          withTiming(0.08, { duration: 2800 }),
        ),
        -1,
        false,
      );
      ring1Opacity.value = withTiming(0, { duration: 300 });
      ring2Opacity.value = withTiming(0, { duration: 300 });
    } else if (status === 'listening') {
      // Active pulse + expanding ripple rings
      scale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 700, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.96, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
      opacity.value = withTiming(0.95, { duration: 400 });
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 700 }),
          withTiming(0.25, { duration: 700 }),
        ),
        -1,
        false,
      );

      // Ring 1 — expands outward and fades
      ring1Scale.value = withRepeat(
        withTiming(2.2, { duration: 1600, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      );
      ring1Opacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 200 }),
          withTiming(0, { duration: 1400 }),
        ),
        -1,
        false,
      );

      // Ring 2 — offset by half cycle
      setTimeout(() => {
        ring2Scale.value = withRepeat(
          withTiming(2.2, { duration: 1600, easing: Easing.out(Easing.quad) }),
          -1,
          false,
        );
        ring2Opacity.value = withRepeat(
          withSequence(
            withTiming(0.5, { duration: 200 }),
            withTiming(0, { duration: 1400 }),
          ),
          -1,
          false,
        );
      }, 800);
    } else if (status === 'thinking') {
      // Slow shimmer — orb is "processing"
      scale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.98, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 600 }),
          withTiming(0.55, { duration: 600 }),
        ),
        -1,
        false,
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 600 }),
          withTiming(0.1, { duration: 600 }),
        ),
        -1,
        false,
      );
      ring1Opacity.value = withTiming(0, { duration: 300 });
      ring2Opacity.value = withTiming(0, { duration: 300 });
    } else if (status === 'speaking') {
      // Rapid irregular oscillation — simulating voice waveform
      scale.value = withRepeat(
        withSequence(
          withTiming(1.14, { duration: 180, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.97, { duration: 220, easing: Easing.inOut(Easing.quad) }),
          withTiming(1.08, { duration: 160, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.99, { duration: 200, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      opacity.value = withTiming(0.9, { duration: 200 });
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 180 }),
          withTiming(0.2, { duration: 220 }),
        ),
        -1,
        false,
      );
      ring1Opacity.value = withTiming(0, { duration: 200 });
      ring2Opacity.value = withTiming(0, { duration: 200 });
    } else if (status === 'error') {
      scale.value = withSequence(
        withTiming(0.9, { duration: 100 }),
        withTiming(1.05, { duration: 100 }),
        withTiming(0.95, { duration: 100 }),
        withTiming(1, { duration: 200 }),
      );
      opacity.value = withTiming(0.4, { duration: 300 });
      glowOpacity.value = withTiming(0.05, { duration: 300 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  return { orbStyle, glowStyle, ring1Style, ring2Style };
}
