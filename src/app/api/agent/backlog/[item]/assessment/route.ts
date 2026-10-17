import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/agent-auth";
import { assessmentSchema, logBacklogEvent, parseItemNumber } from "@/lib/backlog";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

type Params = { params: Promise<{ item: string }> };

// The Design-Engineer's assessment. The file paths were already checked against the
// repo copy by pokectl before they get here.
export async function POST(request: Request, { params }: Params) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const number = parseItemNumber((await params).item);
  if (number === null) return NextResponse.json({ error: "Bad item number." }, { status: 400 });

  const parsed = assessmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: `Invalid assessment: ${issue?.path.join(".") || "body"}. ${issue?.message ?? ""}`.trim() },
      { status: 400 }
    );
  }
  const { actor, ...fields } = parsed.data;

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const { data: row } = await supabase
    .from("backlog_items")
    .select("id, status")
    .eq("item_number", number)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "No such item." }, { status: 404 });
  if (row.status !== "assessing") {
    return NextResponse.json({ error: `A ${row.status} item isn't waiting for an assessment.` }, { status: 409 });
  }

  const { error } = await supabase.from("backlog_assessments").insert({
    item_id: row.id,
    ...fields,
    accessibility_note: fields.accessibility_note ?? null,
    states_note: fields.states_note ?? null,
    reuse_note: fields.reuse_note ?? null,
  });
  if (error) {
    console.error("[agent] assessment insert failed:", error);
    return NextResponse.json({ error: "Couldn't save that assessment." }, { status: 502 });
  }

  await logBacklogEvent(supabase, row.id, actor, "assessed", {
    stance: fields.stance,
    effort_size: fields.effort_size,
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
