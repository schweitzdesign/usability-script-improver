import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/agent-auth";
import { followupAnswerSchema, logBacklogEvent, parseItemNumber } from "@/lib/backlog";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

type Params = { params: Promise<{ item: string }> };

export async function POST(request: Request, { params }: Params) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const number = parseItemNumber((await params).item);
  if (number === null) return NextResponse.json({ error: "Bad item number." }, { status: 400 });

  const parsed = followupAnswerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: `Invalid answer: ${issue?.message ?? "check the length and avoid dashes"}` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const { data: row } = await supabase
    .from("backlog_items")
    .select("id, followup_question, followup_answer")
    .eq("item_number", number)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "No such item." }, { status: 404 });
  if (!row.followup_question || row.followup_answer) {
    return NextResponse.json({ error: "There is no open follow-up question on this item." }, { status: 409 });
  }

  const { data: updated, error } = await supabase
    .from("backlog_items")
    .update({ followup_answer: parsed.data.answer, updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("followup_answer", null)
    .select("item_number");
  if (error) {
    console.error("[agent] followup answer failed:", error);
    return NextResponse.json({ error: "Couldn't save that answer." }, { status: 502 });
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "That question was just answered." }, { status: 409 });
  }

  await logBacklogEvent(supabase, row.id, parsed.data.actor, "followup_answered");
  return NextResponse.json({ ok: true });
}
