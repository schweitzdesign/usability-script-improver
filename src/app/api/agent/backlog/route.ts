import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAgent } from "@/lib/agent-auth";
import {
  BACKLOG_KINDS,
  BACKLOG_STATUSES,
  ITEM_COLUMNS,
  logBacklogEvent,
  problemSchema,
  scoreSchema,
  titleSchema,
  userStorySchema,
  withTickets,
} from "@/lib/backlog";
import { getSupabaseServerClient } from "@/lib/supabase";
import { logTicketEvent, parseTicketNumber } from "@/lib/tickets";

export const runtime = "nodejs";

const querySchema = z.object({
  status: z.enum(BACKLOG_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(30),
  // Recommended items whose Telegram card hasn't been sent yet (the report pass).
  needs_report: z.enum(["1", "0"]).optional().default("0"),
  // Decided items the PM side hasn't acted on yet (the decision pass).
  needs_pickup: z.enum(["1", "0"]).optional().default("0"),
  // Approved changes that haven't been handed to the build job yet.
  needs_ship: z.enum(["1", "0"]).optional().default("0"),
  // Changes whose latest build result Zach hasn't been told about.
  needs_ship_report: z.enum(["1", "0"]).optional().default("0"),
});

export async function GET(request: Request) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    needs_report: url.searchParams.get("needs_report") ?? undefined,
    needs_pickup: url.searchParams.get("needs_pickup") ?? undefined,
    needs_ship: url.searchParams.get("needs_ship") ?? undefined,
    needs_ship_report: url.searchParams.get("needs_ship_report") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid query." }, { status: 400 });

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  let query = supabase.from("backlog_items").select(ITEM_COLUMNS).limit(parsed.data.limit);
  if (parsed.data.status) query = query.eq("status", parsed.data.status);
  if (parsed.data.needs_report === "1") {
    query = query.eq("status", "recommended").is("recommendation_reported_at", null);
  }
  if (parsed.data.needs_pickup === "1") {
    query = query.not("decision", "is", null).is("decision_picked_up_at", null);
  }
  if (parsed.data.needs_ship === "1") {
    query = query.eq("status", "approved").eq("decision", "yes").is("ship_state", null);
  }
  if (parsed.data.needs_ship_report === "1") {
    query = query.in("ship_state", ["needs_review", "failed", "live"]);
  }
  // Best score first, so the PM sees the rank at a glance. Unscored items sort last.
  query = query.order("ice_score", { ascending: false, nullsFirst: false }).order("item_number");

  const { data, error } = await query;
  if (error) {
    console.error("[agent] list backlog failed:", error);
    return NextResponse.json({ error: "Couldn't load the backlog." }, { status: 502 });
  }
  let rows = data ?? [];
  if (parsed.data.needs_ship_report === "1") rows = rows.filter((r) => r.ship_reported_state !== r.ship_state);
  return NextResponse.json({ ok: true, items: await withTickets(supabase, rows) });
}

const createSchema = z.object({
  title: titleSchema,
  kind: z.enum(BACKLOG_KINDS),
  problem: problemSchema.optional(),
  user_story: userStorySchema.optional(),
  impact: scoreSchema.optional(),
  confidence: scoreSchema.optional(),
  ease: scoreSchema.optional(),
  // The ticket that started this item. It is attached in the same call.
  ticket: z.union([z.string(), z.number()]).transform(String),
  actor: z.string().trim().min(1).max(40).optional().default("pm-bot"),
});

export async function POST(request: Request) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: `Invalid item: ${issue?.path.join(".") || "body"}. ${issue?.message ?? ""}`.trim() },
      { status: 400 }
    );
  }
  const { ticket, actor, ...fields } = parsed.data;

  const number = parseTicketNumber(ticket);
  if (number === null) return NextResponse.json({ error: "Bad ticket number." }, { status: 400 });

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const { data: feedback } = await supabase
    .from("feedback")
    .select("id, ticket_number, status")
    .eq("ticket_number", number)
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

  const { data: item, error } = await supabase
    .from("backlog_items")
    .insert(fields)
    .select("id, item_number")
    .single();
  if (error || !item) {
    console.error("[agent] create item failed:", error);
    return NextResponse.json({ error: "Couldn't create that item." }, { status: 502 });
  }

  const { error: linkError } = await supabase
    .from("backlog_item_tickets")
    .insert({ item_id: item.id, feedback_id: feedback.id });
  if (linkError) {
    console.error("[agent] attach ticket failed:", linkError);
    // Don't leave an orphan item behind.
    await supabase.from("backlog_items").delete().eq("id", item.id);
    return NextResponse.json({ error: "Couldn't attach the ticket." }, { status: 502 });
  }

  await logBacklogEvent(supabase, item.id, actor, "created", { from_ticket: number });
  await logTicketEvent(supabase, feedback.id, actor, "added_to_backlog", {
    item_number: item.item_number,
  });
  return NextResponse.json({ ok: true, item_number: item.item_number }, { status: 201 });
}
