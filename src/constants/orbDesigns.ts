import { Easing } from 'react-native-reanimated';

export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
export type OrbVariant = 'classic' | 'geometric' | 'minimal';

interface OrbAnimationConfig {
  duration: number;
  easing: any;
}

export const ORB_ANIMATIONS: Record<OrbState, OrbAnimationConfig> = {
  idle: { duration: 2000, easing: Easing.sin },
  listening: { duration: 500, easing: Easing.sin },
  processing: { duration: 1000, easing: Easing.linear },
  speaking: { duration: 1500, easing: Easing.sin },
  error: { duration: 1000, easing: Easing.sin },
};

interface OrbDesign {
  baseSize: number;
  shape: string;
  borderRadius: number;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
}

export const ORB_DESIGN_SHAPES: Record<OrbVariant, OrbDesign> = {
  classic: {
    baseSize: 120,
    shape: 'sphere',
    borderRadius: 60,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  geometric: {
    baseSize: 120,
    shape: 'polygon',
    borderRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  minimal: {
    baseSize: 120,
    shape: 'ring',
    borderRadius: 60,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
};
