import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';

interface MuteToggleProps {
  isMuted: boolean;
  onToggle: () => void;
}

export function MuteToggle({ isMuted, onToggle }: MuteToggleProps) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityLabel={isMuted ? 'Unmute Nova' : 'Mute Nova'}
      accessibilityRole="button"
    >
      <View style={[styles.iconContainer, isMuted && styles.mutedContainer]}>
        {/* Simple mic icon using text/emoji — replace with vector icon if desired */}
        <Text style={[styles.icon, isMuted && styles.mutedIcon]}>
          {isMuted ? '🔇' : '🎙️'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedContainer: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  icon: {
    fontSize: 18,
  },
  mutedIcon: {
    opacity: 0.8,
  },
});
