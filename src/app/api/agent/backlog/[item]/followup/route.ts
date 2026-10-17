import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/agent-auth";
import { followupSchema, latestAssessment, logBacklogEvent, parseItemNumber } from "@/lib/backlog";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

type Params = { params: Promise<{ item: string }> };

const MAX_ROUNDS = 1;

// The PM may ask the Design-Engineer one follow-up question per item, and only one.
export async function POST(request: Request, { params }: Params) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const number = parseItemNumber((await params).item);
  if (number === null) return NextResponse.json({ error: "Bad item number." }, { status: 400 });

  const parsed = followupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: `Invalid question: ${issue?.message ?? "check the length and avoid dashes"}` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const { data: row } = await supabase
    .from("backlog_items")
    .select("id, status, followup_rounds")
    .eq("item_number", number)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "No such item." }, { status: 404 });
  if (row.status !== "assessing") {
    return NextResponse.json({ error: `A ${row.status} item can't take a follow-up question.` }, { status: 409 });
  }
  if (!(await latestAssessment(supabase, row.id))) {
    return NextResponse.json({ error: "Wait for the first assessment before asking a follow-up." }, { status: 409 });
  }
  if (row.followup_rounds >= MAX_ROUNDS) {
    return NextResponse.json(
      { error: "Only one follow-up round is allowed. Use what you have and recommend." },
      { status: 409 }
    );
  }

  const { data: updated, error } = await supabase
    .from("backlog_items")
    .update({
      followup_rounds: row.followup_rounds + 1,
      followup_question: parsed.data.question,
      followup_answer: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("followup_rounds", row.followup_rounds)
    .select("item_number");
  if (error) {
    console.error("[agent] followup failed:", error);
    return NextResponse.json({ error: "Couldn't save that question." }, { status: 502 });
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "That item just changed. Reload and retry." }, { status: 409 });
  }

  await logBacklogEvent(supabase, row.id, parsed.data.actor, "followup_asked");
  return NextResponse.json({ ok: true });
}
