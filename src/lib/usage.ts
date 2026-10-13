import { estimateCostUsd } from "@/lib/pricing";
import { getSupabaseServerClient } from "@/lib/supabase";

type Usage = { input_tokens: number; output_tokens: number };

/**
 * Fire-and-forget cost ledger write. Never awaited by callers and never
 * throws: a failed ledger insert must not break a grade or a chat turn.
 */
export function recordUsage(
  source: string,
  model: string,
  usage: Usage,
  feedbackId?: string
) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  void (async () => {
    try {
      const { error } = await supabase.from("usage_events").insert({
        source,
        model,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        est_cost_usd: estimateCostUsd(model, usage.input_tokens, usage.output_tokens),
        feedback_id: feedbackId ?? null,
      });
      if (error) console.error("[usage] ledger insert failed:", error.message);
    } catch (error) {
      console.error("[usage] ledger insert threw:", error);
    }
  })();
}
