import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/agent-auth";
import {
  EASE_BANDS,
  canTransitionItem,
  easeBandMessage,
  getBudget,
  latestAssessment,
  logBacklogEvent,
  parseItemNumber,
  recommendationSchema,
} from "@/lib/backlog";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

type Params = { params: Promise<{ item: string }> };

const BUILD = ["build_now", "build_later"];

// The PM's one real output: a full recommendation for the Director. Everything the
// decision page and the Telegram card show is required, so a half-written
// recommendation can never reach Zach. When the Design-Engineer has assessed the item,
// its wording and its sizing are used, so the PM can't contradict the engineer.
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
  const { actor, change_summary, risk, effort_size, effort_why, ...rest } = parsed.data;

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const { data: row } = await supabase
    .from("backlog_items")
    .select("id, item_number, status, problem, user_story, followup_question, followup_answer")
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
  if (row.followup_question && !row.followup_answer) {
    return NextResponse.json(
      { error: "The Design-Engineer hasn't answered your follow-up question yet." },
      { status: 409 }
    );
  }

  const assessment = await latestAssessment(supabase, row.id);
  const build = BUILD.includes(rest.recommendation);

  // Whose words end up on the card.
  const final = {
    change_summary: build && assessment ? assessment.experience_summary : change_summary,
    risk: build && assessment ? assessment.risk : risk,
    effort_size: assessment ? assessment.effort_size : effort_size,
    effort_why: assessment ? assessment.effort_why : effort_why,
  };
  const missing = Object.entries(final)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing ${missing.join(", ")}. Write them yourself, because no engineering wording applies here.` },
      { status: 400 }
    );
  }

  if (assessment) {
    const [lo, hi] = EASE_BANDS[assessment.effort_size];
    if (rest.ease < lo || rest.ease > hi) {
      return NextResponse.json({ error: easeBandMessage(assessment.effort_size) }, { status: 400 });
    }
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
      ...rest,
      ...(final as { change_summary: string; risk: string; effort_size: "S" | "M" | "L"; effort_why: string }),
      ease_source: assessment ? "engineering" : "pm_guess",
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
    recommendation: rest.recommendation,
    ...(final.effort_size ? { effort_size: final.effort_size } : {}),
    engineering_assessed: Boolean(assessment),
  });
  return NextResponse.json({
    ok: true,
    note: assessment
      ? build
        ? "Used the Design-Engineer's wording for the headline, risk, and effort."
        : "Used the Design-Engineer's effort and sizing; your headline and risk were kept."
      : "No engineering assessment on this item, so the card says the effort is a guess.",
  });
}
