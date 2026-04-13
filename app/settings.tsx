import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { useSettingsStore } from '../src/store/settingsStore';
import type { Tool, WebhookMode, TranscriptionMode } from '../src/utils/secureStorage';
import { Colors } from '../src/constants/colors';

export default function SettingsScreen() {
  const testWebhook = useSettingsStore((s) => s.testWebhook);
  const productionWebhook = useSettingsStore((s) => s.productionWebhook);
  const webhookMode = useSettingsStore((s) => s.webhookMode);
  const tools = useSettingsStore((s) => s.tools);
  const setWebhookMode = useSettingsStore((s) => s.setWebhookMode);
  const saveTestWebhook = useSettingsStore((s) => s.saveTestWebhook);
  const saveProductionWebhook = useSettingsStore((s) => s.saveProductionWebhook);
  const transcriptionMode = useSettingsStore((s) => s.transcriptionMode);
  const setTranscriptionMode = useSettingsStore((s) => s.setTranscriptionMode);
  const addTool = useSettingsStore((s) => s.addTool);
  const removeTool = useSettingsStore((s) => s.removeTool);

  const [testInput, setTestInput] = useState(testWebhook);
  const [prodInput, setProdInput] = useState(productionWebhook);
  const [newKeyword, setNewKeyword] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleAddTool = async () => {
    const keyword = newKeyword.trim();
    const url = newUrl.trim();

    if (!keyword || !url) {
      Alert.alert('Missing Fields', 'Both keyword and webhook URL are required.');
      return;
    }

    const tool: Tool = {
      id: Crypto.randomUUID(),
      keyword,
      webhookUrl: url,
    };

    await addTool(tool);
    setNewKeyword('');
    setNewUrl('');
  };

  const handleDeleteTool = (tool: Tool) => {
    Alert.alert('Delete Tool', `Remove "${tool.keyword}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeTool(tool.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={tools}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              {/* Webhook Mode Toggle */}
              <Section label="WEBHOOK MODE">
                <ModeToggle mode={webhookMode} onChange={setWebhookMode} />
              </Section>

              {/* Transcription Mode */}
              <Section label="TRANSCRIPTION">
                <TranscriptionToggle mode={transcriptionMode} onChange={setTranscriptionMode} />
                <Text style={styles.hint}>
                  AssemblyAI uses cloud speech recognition (more accurate). Vosk runs offline on-device.
                </Text>
              </Section>

              {/* Test Webhook URL */}
              <Section label="TEST URL">
                <TextInput
                  style={[styles.input, webhookMode === 'test' && styles.inputActive]}
                  value={testInput}
                  onChangeText={setTestInput}
                  onBlur={() => saveTestWebhook(testInput.trim())}
                  placeholder="https://n8n.example.com/webhook-test/..."
                  placeholderTextColor={Colors.whiteDim}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="done"
                  onSubmitEditing={() => saveTestWebhook(testInput.trim())}
                />
              </Section>

              {/* Production Webhook URL */}
              <Section label="PRODUCTION URL">
                <TextInput
                  style={[styles.input, webhookMode === 'production' && styles.inputActive]}
                  value={prodInput}
                  onChangeText={setProdInput}
                  onBlur={() => saveProductionWebhook(prodInput.trim())}
                  placeholder="https://n8n.example.com/webhook/..."
                  placeholderTextColor={Colors.whiteDim}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="done"
                  onSubmitEditing={() => saveProductionWebhook(prodInput.trim())}
                />
              </Section>

              {/* Custom Tools */}
              <Section label="CUSTOM TOOLS">
                <Text style={styles.hint}>
                  If your command contains a keyword, it routes to that webhook instead.
                </Text>
              </Section>
            </>
          }
          renderItem={({ item }) => <ToolRow tool={item} onDelete={handleDeleteTool} />}
          ListFooterComponent={
            <Section label="ADD TOOL">
              <TextInput
                style={[styles.input, styles.inputSmall]}
                value={newKeyword}
                onChangeText={setNewKeyword}
                placeholder='Trigger keyword (e.g. "music")'
                placeholderTextColor={Colors.whiteDim}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
              <TextInput
                style={[styles.input, styles.inputSmall, { marginTop: 10 }]}
                value={newUrl}
                onChangeText={setNewUrl}
                placeholder="Webhook URL"
                placeholderTextColor={Colors.whiteDim}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={handleAddTool}
              />
              <Pressable
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
                onPress={handleAddTool}
              >
                <Text style={styles.addBtnText}>+ ADD TOOL</Text>
              </Pressable>
            </Section>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No custom tools yet.</Text>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TranscriptionToggle({
  mode,
  onChange,
}: {
  mode: TranscriptionMode;
  onChange: (m: TranscriptionMode) => void;
}) {
  return (
    <View style={toggleStyles.container}>
      <Pressable
        style={[toggleStyles.option, mode === 'assemblyai' && toggleStyles.optionActive]}
        onPress={() => onChange('assemblyai')}
        accessibilityRole="button"
      >
        <Text style={[toggleStyles.optionText, mode === 'assemblyai' && toggleStyles.optionTextActive]}>
          ASSEMBLYAI
        </Text>
      </Pressable>
      <Pressable
        style={[toggleStyles.option, mode === 'vosk' && toggleStyles.optionActive]}
        onPress={() => onChange('vosk')}
        accessibilityRole="button"
      >
        <Text style={[toggleStyles.optionText, mode === 'vosk' && toggleStyles.optionTextActive]}>
          VOSK
        </Text>
      </Pressable>
    </View>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: WebhookMode;
  onChange: (m: WebhookMode) => void;
}) {
  return (
    <View style={toggleStyles.container}>
      <Pressable
        style={[toggleStyles.option, mode === 'test' && toggleStyles.optionActive]}
        onPress={() => onChange('test')}
        accessibilityRole="button"
        accessibilityLabel="Switch to test mode"
      >
        <Text style={[toggleStyles.optionText, mode === 'test' && toggleStyles.optionTextActive]}>
          TEST
        </Text>
      </Pressable>
      <Pressable
        style={[toggleStyles.option, mode === 'production' && toggleStyles.optionActiveProd]}
        onPress={() => onChange('production')}
        accessibilityRole="button"
        accessibilityLabel="Switch to production mode"
      >
        <Text style={[toggleStyles.optionText, mode === 'production' && toggleStyles.optionTextActive]}>
          PRODUCTION
        </Text>
      </Pressable>
    </View>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ToolRow({
  tool,
  onDelete,
}: {
  tool: Tool;
  onDelete: (t: Tool) => void;
}) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.info}>
        <Text style={rowStyles.keyword}>{tool.keyword}</Text>
        <Text style={rowStyles.url} numberOfLines={1}>
          {tool.webhookUrl}
        </Text>
      </View>
      <Pressable
        onPress={() => onDelete(tool)}
        style={({ pressed }) => [rowStyles.deleteBtn, pressed && { opacity: 0.5 }]}
        accessibilityLabel={`Delete ${tool.keyword} tool`}
      >
        <Text style={rowStyles.deleteIcon}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070711',
  },
  flex: { flex: 1 },
  listContent: {
    paddingBottom: 40,
  },
  input: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.white,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  inputActive: {
    borderColor: Colors.purple,
  },
  inputSmall: {
    paddingVertical: 12,
    fontSize: 14,
  },
  hint: {
    fontSize: 13,
    color: Colors.whiteDim,
    lineHeight: 20,
    marginBottom: 4,
  },
  addBtn: {
    marginTop: 14,
    backgroundColor: Colors.purple,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
  },
  emptyText: {
    color: Colors.whiteDim,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    letterSpacing: 0.5,
  },
});

const toggleStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  option: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: Colors.purpleDim,
  },
  optionActiveProd: {
    backgroundColor: '#065f46', // emerald-900 — visually distinct for prod
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 3,
    color: Colors.whiteDim,
  },
  optionTextActive: {
    color: Colors.white,
  },
});

const sectionStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3.5,
    color: Colors.purple,
    marginBottom: 14,
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 10,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 10,
  },
  info: { flex: 1 },
  keyword: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.white,
    marginBottom: 3,
  },
  url: {
    fontSize: 12,
    color: Colors.whiteDim,
    letterSpacing: 0.2,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteIcon: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
  },
});
