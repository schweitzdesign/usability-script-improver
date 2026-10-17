import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/agent-auth";
import { getBudget } from "@/lib/backlog";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// Month-to-date spend from the cost ledger, against the agent team's monthly cap.
export async function GET(request: Request) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  try {
    return NextResponse.json({ ok: true, budget: await getBudget(supabase) });
  } catch (e) {
    console.error("[agent] budget failed:", e);
    return NextResponse.json({ error: "Couldn't read the cost ledger." }, { status: 502 });
  }
}
