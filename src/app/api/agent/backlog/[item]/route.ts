import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAgent } from "@/lib/agent-auth";
import {
  BACKLOG_KINDS,
  ITEM_COLUMNS,
  PM_SETTABLE_STATUSES,
  canTransitionItem,
  latestAssessment,
  logBacklogEvent,
  parseItemNumber,
  problemSchema,
  scoreSchema,
  titleSchema,
  userStorySchema,
  withTickets,
} from "@/lib/backlog";
import { getSupabaseServerClient } from "@/lib/supabase";
import { logTicketEvent, parseTicketNumber } from "@/lib/tickets";

export const runtime = "nodejs";

type Params = { params: Promise<{ item: string }> };

export async function GET(request: Request, { params }: Params) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const number = parseItemNumber((await params).item);
  if (number === null) return NextResponse.json({ error: "Bad item number." }, { status: 400 });

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const { data: row, error } = await supabase
    .from("backlog_items")
    .select(ITEM_COLUMNS)
    .eq("item_number", number)
    .maybeSingle();
  if (error) {
    console.error("[agent] get item failed:", error);
    return NextResponse.json({ error: "Couldn't load that item." }, { status: 502 });
  }
  if (!row) return NextResponse.json({ error: "No such item." }, { status: 404 });

  const { data: events } = await supabase
    .from("backlog_events")
    .select("created_at, actor, action, detail")
    .eq("item_id", row.id)
    .order("created_at", { ascending: true })
    .limit(40);

  const [item] = await withTickets(supabase, [row], true);
  return NextResponse.json({
    ok: true,
    item,
    assessment: await latestAssessment(supabase, row.id),
    events: events ?? [],
  });
}

const patchSchema = z.object({
  title: titleSchema.optional(),
  kind: z.enum(BACKLOG_KINDS).optional(),
  problem: problemSchema.optional(),
  user_story: userStorySchema.optional(),
  impact: scoreSchema.optional(),
  confidence: scoreSchema.optional(),
  ease: scoreSchema.optional(),
  status: z.enum(PM_SETTABLE_STATUSES).optional(),
  // Cluster another ticket into this item.
  attach_ticket: z.union([z.string(), z.number()]).transform(String).optional(),
  // Set by the report pass after the recommendation card has gone to Telegram.
  recommendation_reported: z.literal(true).optional(),
  // Set by the decision pass once the Director's choice has been acted on.
  decision_picked_up: z.literal(true).optional(),
  actor: z.string().trim().min(1).max(40).optional().default("pm-bot"),
});

export async function PATCH(request: Request, { params }: Params) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const number = parseItemNumber((await params).item);
  if (number === null) return NextResponse.json({ error: "Bad item number." }, { status: 400 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: `Invalid update: ${issue?.path.join(".") || "body"}. ${issue?.message ?? ""}`.trim() },
      { status: 400 }
    );
  }
  const { attach_ticket, recommendation_reported, decision_picked_up, actor, status, ...fields } =
    parsed.data;

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const { data: row, error: loadError } = await supabase
    .from("backlog_items")
    .select("id, item_number, status, decision")
    .eq("item_number", number)
    .maybeSingle();
  if (loadError) {
    console.error("[agent] load item failed:", loadError);
    return NextResponse.json({ error: "Couldn't load that item." }, { status: 502 });
  }
  if (!row) return NextResponse.json({ error: "No such item." }, { status: 404 });

  if (status && !canTransitionItem(row.status, status)) {
    return NextResponse.json({ error: `A ${row.status} item can't move to ${status}.` }, { status: 409 });
  }
  if (decision_picked_up && !row.decision) {
    return NextResponse.json({ error: "That item has no decision to pick up." }, { status: 409 });
  }
  const finished = ["approved", "rejected", "deferred", "shipped"];
  if (finished.includes(row.status) && (Object.keys(fields).length > 0 || attach_ticket)) {
    return NextResponse.json({ error: `A ${row.status} item can't be edited.` }, { status: 409 });
  }

  let attachFeedback: { id: string; ticket_number: number } | undefined;
  if (attach_ticket !== undefined) {
    const ticketNumber = parseTicketNumber(attach_ticket);
    if (ticketNumber === null) return NextResponse.json({ error: "Bad ticket number." }, { status: 400 });
    const { data: feedback } = await supabase
      .from("feedback")
      .select("id, ticket_number, status")
      .eq("ticket_number", ticketNumber)
      .maybeSingle();
    if (!feedback) return NextResponse.json({ error: "No such ticket." }, { status: 404 });
    if (feedback.status !== "triaged") {
      return NextResponse.json({ error: "Only a triaged ticket can go into the backlog." }, { status: 409 });
    }
    const { data: existing } = await supabase
      .from("backlog_item_tickets")
      .select("item_id")
      .eq("feedback_id", feedback.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "That ticket already belongs to a backlog item." }, { status: 409 });
    }
    attachFeedback = feedback;
  }

  const now = new Date().toISOString();
  const changes = {
    ...fields,
    ...(status && status !== row.status ? { status } : {}),
    ...(recommendation_reported ? { recommendation_reported_at: now } : {}),
    ...(decision_picked_up ? { decision_picked_up_at: now } : {}),
  };
  const touched = Object.keys(changes).length > 0;
  if (!touched && !attachFeedback) return NextResponse.json({ ok: true, changed: false });

  if (touched) {
    const { data: updated, error: updateError } = await supabase
      .from("backlog_items")
      .update({ ...changes, updated_at: now })
      .eq("id", row.id)
      .eq("status", row.status)
      .select("item_number");
    if (updateError) {
      console.error("[agent] update item failed:", updateError);
      return NextResponse.json({ error: "Couldn't update that item." }, { status: 502 });
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: "That item just changed. Reload and retry." }, { status: 409 });
    }
  }

  if (attachFeedback) {
    const { error: linkError } = await supabase
      .from("backlog_item_tickets")
      .insert({ item_id: row.id, feedback_id: attachFeedback.id });
    if (linkError) {
      console.error("[agent] attach ticket failed:", linkError);
      return NextResponse.json({ error: "Couldn't attach the ticket." }, { status: 502 });
    }
    await supabase.from("backlog_items").update({ updated_at: now }).eq("id", row.id);
    await logTicketEvent(supabase, attachFeedback.id, actor, "added_to_backlog", {
      item_number: row.item_number,
    });
  }

  const marker = recommendation_reported
    ? "reported"
    : decision_picked_up
      ? "decision_picked_up"
      : null;
  await logBacklogEvent(supabase, row.id, actor, marker ?? "update", {
    ...(touched && !marker ? changes : {}),
    ...(status && status !== row.status ? { from_status: row.status } : {}),
    ...(attachFeedback ? { attached_ticket: attachFeedback.ticket_number } : {}),
  });

  return NextResponse.json({ ok: true, changed: true });
}
