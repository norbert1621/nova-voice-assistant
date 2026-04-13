import type { Tool } from '../utils/secureStorage';

// Pure function: given a command and the stored tools + mainWebhook,
// returns the correct webhook URL to POST to.
// First keyword match wins; falls back to mainWebhook.
export function resolveWebhook(
  command: string,
  tools: Tool[],
  mainWebhook: string,
): string {
  const lowerCommand = command.toLowerCase();

  for (const tool of tools) {
    if (tool.keyword && lowerCommand.includes(tool.keyword.toLowerCase())) {
      return tool.webhookUrl;
    }
  }

  return mainWebhook;
}
