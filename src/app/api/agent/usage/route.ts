import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAgent } from "@/lib/agent-auth";
import { estimateCostUsd } from "@/lib/pricing";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const bodySchema = z.object({
  source: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(100),
  input_tokens: z.number().int().min(0).max(50_000_000),
  output_tokens: z.number().int().min(0).max(50_000_000),
  ticket: z.coerce.number().int().positive().optional(),
});

// Bots report what their runs consumed; the dollar figure is always computed
// here from src/lib/pricing.ts so there is one source of truth for prices.
export async function POST(request: Request) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid usage report." }, { status: 400 });
  const { source, model, input_tokens, output_tokens, ticket } = parsed.data;

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  let feedbackId: string | null = null;
  if (ticket !== undefined) {
    const { data } = await supabase.from("feedback").select("id").eq("ticket_number", ticket).maybeSingle();
    feedbackId = data?.id ?? null;
  }

  const est_cost_usd = estimateCostUsd(model, input_tokens, output_tokens);
  const { error } = await supabase
    .from("usage_events")
    .insert({ source, model, input_tokens, output_tokens, est_cost_usd, feedback_id: feedbackId });
  if (error) {
    console.error("[agent] usage insert failed:", error);
    return NextResponse.json({ error: "Couldn't record usage." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, est_cost_usd, priced: est_cost_usd > 0 || input_tokens + output_tokens === 0 });
}
