import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/agent-auth";
import {
  canTransitionItem,
  getBudget,
  logBacklogEvent,
  parseItemNumber,
  recommendationSchema,
} from "@/lib/backlog";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

type Params = { params: Promise<{ item: string }> };

// The PM's one real output: a full recommendation for the Director. Everything the
// decision page and the Telegram card show is required here, so a half-written
// recommendation can never reach Zach.
export async function POST(request: Request, { params }: Params) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const number = parseItemNumber((await params).item);
  if (number === null) return NextResponse.json({ error: "Bad item number." }, { status: 400 });

  const parsed = recommendationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: `Invalid recommendation: ${issue?.path.join(".") || "body"}. ${issue?.message ?? ""}`.trim() },
      { status: 400 }
    );
  }
  const { actor, ...rec } = parsed.data;

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const { data: row } = await supabase
    .from("backlog_items")
    .select("id, item_number, status, problem, user_story")
    .eq("item_number", number)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "No such item." }, { status: 404 });

  if (!canTransitionItem(row.status, "recommended") || row.status === "recommended") {
    return NextResponse.json(
      { error: `A ${row.status} item can't be recommended right now.` },
      { status: 409 }
    );
  }
  if (!row.problem || !row.user_story) {
    return NextResponse.json(
      { error: "Write the problem and the user story on the item before recommending it." },
      { status: 400 }
    );
  }

  // The card shows how much of the monthly budget is used; take it from the ledger,
  // never from the model.
  let budgetUsedPct: number | null = null;
  try {
    budgetUsedPct = (await getBudget(supabase)).agents_used_pct;
  } catch (e) {
    console.error("[agent] budget lookup failed:", e);
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("backlog_items")
    .update({
      ...rec,
      status: "recommended",
      budget_used_pct: budgetUsedPct,
      // A fresh recommendation gets a fresh card and a fresh decision.
      recommendation_reported_at: null,
      decision: null,
      decision_note: null,
      decided_at: null,
      decision_picked_up_at: null,
      updated_at: now,
    })
    .eq("id", row.id)
    .eq("status", row.status)
    .select("item_number");
  if (error) {
    console.error("[agent] recommend failed:", error);
    return NextResponse.json({ error: "Couldn't save that recommendation." }, { status: 502 });
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "That item just changed. Reload and retry." }, { status: 409 });
  }

  await logBacklogEvent(supabase, row.id, actor, "recommended", {
    recommendation: rec.recommendation,
    effort_size: rec.effort_size,
  });
  return NextResponse.json({ ok: true });
}
