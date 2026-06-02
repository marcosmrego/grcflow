/**
 * AIOS Usage Tracker — report LLM usage to the Expansao AI OS API.
 *
 * Usage: call trackUsage() immediately after any Anthropic messages.create() call.
 *
 *   const t0 = Date.now();
 *   const response = await client.messages.create({ ... });
 *   trackUsage('my-agent', response.model, response.usage.input_tokens, response.usage.output_tokens, Date.now() - t0);
 */

const AIOS_API_URL = (process.env.AIOS_API_URL ?? '').replace(/\/$/, '');
const AIOS_TRACK_KEY = process.env.AIOS_TRACK_KEY ?? '';

export function trackUsage(
  agentName: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  durationMs = 0,
): void {
  if (!AIOS_API_URL) return;

  const payload = {
    project: 'grc-flow',
    agent_name: agentName,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    duration_ms: durationMs,
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (AIOS_TRACK_KEY) headers['X-AIOS-Key'] = AIOS_TRACK_KEY;

  fetch(`${AIOS_API_URL}/track`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {
    // fire-and-forget — tracking must never break production calls
  });
}
