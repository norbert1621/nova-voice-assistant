import axios from 'axios';
import { Config } from '../constants/config';

export interface WebhookResponse {
  audio_url: string;
}

export async function sendCommand(
  webhookUrl: string,
  command: string,
): Promise<WebhookResponse> {
  console.log('[WebhookService] POST', webhookUrl, { command });
  const response = await axios.post<WebhookResponse>(
    webhookUrl,
    { command },
    {
      timeout: Config.webhookTimeoutMs,
      headers: { 'Content-Type': 'application/json' },
    },
  );

  console.log('[WebhookService] response:', JSON.stringify(response.data));

  // audio_url may be blank if the webhook has nothing to play — callers handle this gracefully
  return { audio_url: response.data?.audio_url ?? '' };
}
