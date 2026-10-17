import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/agent-auth";
import { DECISION_LINK_DAYS, hashToken, logBacklogEvent, newDecisionToken, parseItemNumber } from "@/lib/backlog";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

type Params = { params: Promise<{ item: string }> };

// Mints the one-time link that goes into the recommendation card. Only a hash is stored,
// so the raw token is returned here and nowhere else. Minting a new link retires any
// older unused one for the same item, so only the newest card's link works.
export async function POST(request: Request, { params }: Params) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const number = parseItemNumber((await params).item);
  if (number === null) return NextResponse.json({ error: "Bad item number." }, { status: 400 });

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const { data: row } = await supabase
    .from("backlog_items")
    .select("id, status")
    .eq("item_number", number)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "No such item." }, { status: 404 });
  if (row.status !== "recommended") {
    return NextResponse.json({ error: "Only a recommended item can have a decision link." }, { status: 409 });
  }

  const now = new Date();
  await supabase
    .from("decision_links")
    .update({ expires_at: now.toISOString() })
    .eq("item_id", row.id)
    .is("used_at", null)
    .gt("expires_at", now.toISOString());

  const token = newDecisionToken();
  const expires = new Date(now.getTime() + DECISION_LINK_DAYS * 24 * 60 * 60 * 1000);
  const { error } = await supabase
    .from("decision_links")
    .insert({ item_id: row.id, token_hash: hashToken(token), expires_at: expires.toISOString() });
  if (error) {
    console.error("[agent] mint link failed:", error);
    return NextResponse.json({ error: "Couldn't create a decision link." }, { status: 502 });
  }

  await logBacklogEvent(supabase, row.id, "pm-bot", "decision_link_created", {
    expires_at: expires.toISOString(),
  });
  return NextResponse.json({ ok: true, token, path: `/decide/${token}`, expires_at: expires.toISOString() });
}
