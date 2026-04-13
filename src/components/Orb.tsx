import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { OrbState, OrbVariant, ORB_ANIMATIONS, ORB_DESIGN_SHAPES } from '../constants/orbDesigns';
import { useSettingsStore } from '../store/settingsStore';

interface OrbProps {
  state?: OrbState;
  size?: number;
}

const DEFAULT_SIZE = 220;

export function Orb({ state = 'idle', size = DEFAULT_SIZE }: OrbProps) {
  const { orbDesignVariant, orbColorRGB } = useSettingsStore();

  const designShape = ORB_DESIGN_SHAPES[orbDesignVariant as OrbVariant];
  const animation = ORB_ANIMATIONS[state];

  // Shared animation progress value
  const progress = useSharedValue(0);

  // Convert RGB to hex color string
  const orbColor = useMemo(() => {
    const errorColor = '#F87171';
    if (state === 'error') return errorColor;

    const { r, g, b } = orbColorRGB;
    return `rgb(${r}, ${g}, ${b})`;
  }, [state, orbColorRGB]);

  // Start animation when state changes
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: animation.duration,
        easing: animation.easing,
      }),
      -1,
      true
    );
  }, [state, progress, animation]);

  // Create state-specific animation styles
  const animatedStyle = useAnimatedStyle(() => {
    const progressValue = progress.value;

    switch (state) {
      case 'idle': {
        // Subtle breathing pulse (scale 0.8-1.2)
        const scale = interpolate(progressValue, [0, 1], [0.8, 1.2], Extrapolate.CLAMP);
        return {
          transform: [{ scale }],
        };
      }
      case 'listening': {
        // Bouncy pulse (larger amplitude, faster)
        const scale = interpolate(progressValue, [0, 0.5, 1], [0.9, 1.3, 0.9], Extrapolate.CLAMP);
        return {
          transform: [{ scale }],
        };
      }
      case 'processing': {
        // Rotation animation
        const rotation = interpolate(progressValue, [0, 1], [0, 360], Extrapolate.CLAMP);
        return {
          transform: [{ rotate: `${rotation}deg` }],
        };
      }
      case 'speaking': {
        // Wave animation - combination of scale and vertical movement
        const scale = interpolate(progressValue, [0, 0.5, 1], [0.95, 1.15, 0.95], Extrapolate.CLAMP);
        const translateY = interpolate(progressValue, [0, 0.5, 1], [0, -10, 0], Extrapolate.CLAMP);
        return {
          transform: [{ scale }, { translateY }],
        };
      }
      case 'error': {
        // Pulsing animation (not flash, to avoid seizure triggers)
        const scale = interpolate(progressValue, [0, 0.5, 1], [1, 1.1, 1], Extrapolate.CLAMP);
        const opacity = interpolate(progressValue, [0, 0.5, 1], [1, 0.7, 1], Extrapolate.CLAMP);
        return {
          transform: [{ scale }],
          opacity,
        };
      }
      default:
        return {};
    }
  });

  const orbRadiusValue = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Main orb */}
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: designShape.borderRadius === 9999 ? orbRadiusValue : designShape.borderRadius,
            backgroundColor: orbColor,
            overflow: 'hidden',
            shadowColor: state === 'error' ? '#F87171' : orbColor,
            shadowOffset: designShape.shadowOffset,
            shadowOpacity: designShape.shadowOpacity,
            shadowRadius: designShape.shadowRadius,
            elevation: designShape.shadowOpacity > 0 ? 20 : 0,
          },
          animatedStyle,
        ]}
      >
        {/* Inner highlight layer (for classic variant) */}
        {orbDesignVariant === 'classic' && (
          <>
            <View
              style={{
                width: size * 0.65,
                height: size * 0.65,
                borderRadius: size,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.12,
                left: size * 0.22,
                width: size * 0.22,
                height: size * 0.14,
                borderRadius: size,
                backgroundColor: 'rgba(255, 255, 255, 0.35)',
                transform: [{ rotate: '-20deg' }],
              }}
            />
          </>
        )}

        {/* Geometric variant - add border for polygon effect */}
        {orbDesignVariant === 'geometric' && (
          <View
            style={{
              flex: 1,
              borderWidth: 2,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
          />
        )}

        {/* Minimal variant - just the ring, no fill */}
        {orbDesignVariant === 'minimal' && (
          <View
            style={{
              flex: 1,
              borderWidth: 2,
              borderColor: orbColor,
              backgroundColor: 'transparent',
            }}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
