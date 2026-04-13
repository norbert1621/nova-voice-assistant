import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';

interface CommandDisplayProps {
  command: string;
  response: string;
}

export function CommandDisplay({ command, response }: CommandDisplayProps) {
  if (!command && !response) return null;

  return (
    <View style={styles.container}>
      {!!command && (
        <Text style={styles.command} numberOfLines={3}>
          {command}
        </Text>
      )}
      {!!response && (
        <View style={styles.divider} />
      )}
      {!!response && response !== 'Response played' && (
        <Text style={styles.response} numberOfLines={4}>
          {response}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
    paddingVertical: 20,
    width: '100%',
    alignItems: 'center',
  },
  command: {
    fontSize: 26,
    fontWeight: '300',
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: 0.3,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  response: {
    fontSize: 20,
    fontWeight: '300',
    color: Colors.purpleLight,
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: 0.2,
  },
});
