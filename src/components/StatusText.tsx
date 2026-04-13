import React from 'react';
import { StyleSheet, Text } from 'react-native';
import type { AppStatus } from '../store/appStore';
import { Colors } from '../constants/colors';

const STATUS_LABELS: Record<AppStatus, string> = {
  idle: 'SAY  "HEY NOVA"',
  listening: 'LISTENING . . .',
  thinking: 'THINKING . . .',
  speaking: 'SPEAKING . . .',
  error: 'SOMETHING WENT WRONG',
};

const STATUS_COLORS: Record<AppStatus, string> = {
  idle: Colors.whiteDim,
  listening: Colors.purple,
  thinking: Colors.purpleLight,
  speaking: Colors.purpleLight,
  error: Colors.error,
};

export function StatusText({ status }: { status: AppStatus }) {
  return (
    <Text style={[styles.text, { color: STATUS_COLORS[status] }]}>
      {STATUS_LABELS[status]}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 3.5,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
