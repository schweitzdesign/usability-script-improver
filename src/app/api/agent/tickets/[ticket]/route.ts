import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAgent } from "@/lib/agent-auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  AGENT_TICKET_COLUMNS,
  CLASSIFICATIONS,
  FINISHED_STATUSES,
  SEVERITIES,
  TICKET_STATUSES,
  canTransition,
  logTicketEvent,
  parseTicketNumber,
  toAgentTicket,
} from "@/lib/tickets";

export const runtime = "nodejs";

type Params = { params: Promise<{ ticket: string }> };

const patchSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  classification: z.enum(CLASSIFICATIONS).optional(),
  severity: z.enum(SEVERITIES).optional(),
  triage_notes: z.string().trim().min(1).max(2000).optional(),
  duplicate_of: z.coerce.number().int().positive().optional(),
  // Set by the report pass once a finished ticket's card has gone to Telegram.
  reported: z.literal(true).optional(),
  // true: the sync hands a triaged ticket to the PM, exactly once. false: releases that
  // claim when the PM's task couldn't be created.
  pm_queued: z.boolean().optional(),
  actor: z.string().trim().min(1).max(40).optional().default("support-bot"),
});

export async function GET(request: Request, { params }: Params) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const number = parseTicketNumber((await params).ticket);
  if (number === null) return NextResponse.json({ error: "Bad ticket number." }, { status: 400 });

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const { data: row, error } = await supabase
    .from("feedback")
    .select(AGENT_TICKET_COLUMNS)
    .eq("ticket_number", number)
    .maybeSingle();
  if (error) {
    console.error("[agent] get ticket failed:", error);
    return NextResponse.json({ error: "Couldn't load that ticket." }, { status: 502 });
  }
  if (!row) return NextResponse.json({ error: "No such ticket." }, { status: 404 });

  const { data: events } = await supabase
    .from("ticket_events")
    .select("created_at, actor, action, detail")
    .eq("feedback_id", row.id)
    .order("created_at", { ascending: true })
    .limit(30);

  // Duplicates are stored by id; readers want the ticket number.
  let duplicateOfTicket: number | null = null;
  if (row.duplicate_of) {
    const { data: dup } = await supabase
      .from("feedback")
      .select("ticket_number")
      .eq("id", row.duplicate_of)
      .maybeSingle();
    duplicateOfTicket = dup?.ticket_number ?? null;
  }

  const includeEmail = new URL(request.url).searchParams.get("include_email") === "1";
  return NextResponse.json({
    ok: true,
    ticket: { ...toAgentTicket(row, includeEmail), duplicate_of_ticket: duplicateOfTicket },
    events: events ?? [],
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const number = parseTicketNumber((await params).ticket);
  if (number === null) return NextResponse.json({ error: "Bad ticket number." }, { status: 400 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  const {
    status: requestedStatus,
    classification,
    severity,
    triage_notes,
    duplicate_of,
    reported,
    pm_queued,
    actor,
  } = parsed.data;

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const { data: row, error: loadError } = await supabase
    .from("feedback")
    .select("id, ticket_number, status, classification, severity")
    .eq("ticket_number", number)
    .maybeSingle();
  if (loadError) {
    console.error("[agent] load ticket failed:", loadError);
    return NextResponse.json({ error: "Couldn't load that ticket." }, { status: 502 });
  }
  if (!row) return NextResponse.json({ error: "No such ticket." }, { status: 404 });

  // Triage is only complete with a classification (and severity for real issues).
  const finalClassification = classification ?? row.classification;
  const finalSeverity = severity ?? row.severity;

  // The bot sometimes records a full triage but forgets to name the final status, which
  // would leave the ticket stuck in `queued` forever. A queued ticket that now has both a
  // classification and a severity counts as triaged (escalated, the safe default).
  const status =
    requestedStatus ??
    (row.status === "queued" && (classification || severity) && finalClassification && finalSeverity
      ? "triaged"
      : undefined);

  if (status && !canTransition(row.status, status)) {
    return NextResponse.json(
      { error: `A ${row.status} ticket can't move to ${status}.` },
      { status: 409 }
    );
  }

  if (status === "triaged" && (!finalClassification || !finalSeverity)) {
    return NextResponse.json(
      { error: "Triaging needs both a classification and a severity." },
      { status: 400 }
    );
  }
  if (status === "resolved_by_support" && !finalClassification) {
    return NextResponse.json({ error: "Resolving needs a classification." }, { status: 400 });
  }

  if (reported && !(FINISHED_STATUSES as readonly string[]).includes(row.status)) {
    return NextResponse.json(
      { error: "Only a triaged or resolved ticket can be marked reported." },
      { status: 409 }
    );
  }

  if (pm_queued !== undefined && row.status !== "triaged") {
    return NextResponse.json({ error: "Only a triaged ticket can go to the PM." }, { status: 409 });
  }

  let duplicateId: string | undefined;
  if (duplicate_of !== undefined) {
    if (duplicate_of === row.ticket_number) {
      return NextResponse.json({ error: "A ticket can't duplicate itself." }, { status: 400 });
    }
    // The earliest report is the canonical one. Without this, two tickets about
    // the same problem can each be marked a duplicate of the other.
    if (duplicate_of > row.ticket_number) {
      return NextResponse.json(
        { error: "A ticket can only be a duplicate of an earlier ticket (a lower number). Link the later one to this one instead." },
        { status: 400 }
      );
    }
    const { data: dup } = await supabase
      .from("feedback")
      .select("id")
      .eq("ticket_number", duplicate_of)
      .maybeSingle();
    if (!dup) return NextResponse.json({ error: "No such duplicate ticket." }, { status: 400 });
    duplicateId = dup.id;
  }

  const changes = {
    ...(status && status !== row.status ? { status } : {}),
    ...(classification ? { classification } : {}),
    ...(severity ? { severity } : {}),
    ...(triage_notes ? { triage_notes } : {}),
    ...(duplicateId ? { duplicate_of: duplicateId } : {}),
    ...(reported ? { reported_at: new Date().toISOString() } : {}),
    ...(pm_queued === true ? { pm_queued_at: new Date().toISOString() } : {}),
    ...(pm_queued === false ? { pm_queued_at: null } : {}),
    ...(status === "queued" && row.status !== "queued" ? { queued_at: new Date().toISOString() } : {}),
  };
  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ ok: true, changed: false });
  }

  // Conditional on the status we just read, so two agents racing to claim the
  // same ticket can't both win: the loser updates zero rows and gets a 409.
  let update = supabase.from("feedback").update(changes).eq("id", row.id).eq("status", row.status);
  // Handing a ticket to the PM is also a claim: only one sync can win it.
  if (pm_queued === true) update = update.is("pm_queued_at", null);
  const { data: updated, error: updateError } = await update.select("ticket_number");
  if (updateError) {
    console.error("[agent] update ticket failed:", updateError);
    return NextResponse.json({ error: "Couldn't update that ticket." }, { status: 502 });
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "That ticket just changed. Reload and retry." }, { status: 409 });
  }

  const onlyMarker = Object.keys(changes).length === 1;
  const action =
    onlyMarker && reported
      ? "reported"
      : onlyMarker && pm_queued === true
        ? "handed_to_pm"
        : onlyMarker && pm_queued === false
          ? "pm_handoff_released"
          : "update";
  await logTicketEvent(supabase, row.id, actor, action, {
    from_status: row.status,
    ...changes,
    ...(duplicate_of !== undefined ? { duplicate_of_ticket: duplicate_of } : {}),
  });

  return NextResponse.json({ ok: true, changed: true });
}
