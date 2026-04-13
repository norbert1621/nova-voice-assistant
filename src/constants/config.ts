export const Config = {
  // Vosk model folder name (relative to Android assets)
  voskModelPath: 'model',

  // Grammar for wake word detection
  // [unk] is required — tells Vosk to handle out-of-grammar speech gracefully
  wakeWordGrammar: ['hey nova', '[unk]'],

  // Exact strings that count as a wake word match (Vosk may add commas)
  wakeWordVariants: ['hey nova', 'hey, nova'],

  // How long to wait for a command before timing out (ms)
  commandTimeoutMs: 8000,

  // How long to wait for a follow-up reply after playing a response (ms)
  followUpTimeoutMs: 15000, // 15 seconds

  // Cooldown after wake word to prevent echo double-triggers (ms)
  wakeWordCooldownMs: 500,

  // HTTP timeout for webhook calls (ms) — set high enough to cover full AI generation time
  webhookTimeoutMs: 300_000, // 5 minutes

  // Delay between Vosk.stop() and STT start to allow mic handoff (ms)
  micHandoffDelayMs: 300,
} as const;
