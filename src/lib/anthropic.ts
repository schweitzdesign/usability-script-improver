import Anthropic from "@anthropic-ai/sdk";

export const GRADING_MODEL = "claude-haiku-4-5";

let client: Anthropic | null | undefined;

/** Server-only client. Returns null if ANTHROPIC_API_KEY is unset. */
export function getAnthropicClient() {
  if (client !== undefined) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      "[anthropic] ANTHROPIC_API_KEY not set — grading/chat will return a fallback. See .env.local.example."
    );
    client = null;
    return client;
  }

  client = new Anthropic({ apiKey });
  return client;
}
