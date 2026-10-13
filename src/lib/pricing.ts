// USD per one million tokens. Source: Anthropic's published API pricing
// (checked 2026-10-06). Update here, nowhere else; the usage ledger and the
// PM bot's cost math both read from this file.
const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  // Used by the PM and Design-Engineer bots from Phase 3 (price per Hermes' model catalog).
  "claude-sonnet-5": { input: 2.0, output: 10.0 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number) {
  const price = PRICE_PER_MTOK[model];
  if (!price) return 0;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}
