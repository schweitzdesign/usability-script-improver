import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAgent } from "@/lib/agent-auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  AGENT_TICKET_COLUMNS,
  FINISHED_STATUSES,
  PM_CLASSIFICATIONS,
  TICKET_STATUSES,
  toAgentTicket,
} from "@/lib/tickets";

export const runtime = "nodejs";

const querySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
  // Finished tickets whose Telegram card hasn't been sent yet (used by the report pass).
  needs_report: z.enum(["1", "0"]).optional().default("0"),
  // Triaged real issues that haven't been handed to the PM yet (used by the sync).
  needs_pm: z.enum(["1", "0"]).optional().default("0"),
  // Opt-in, used only by the maintainer's commands: the Support bot never asks for it.
  include_email: z.enum(["1", "0"]).optional().default("0"),
});

export async function GET(request: Request) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    order: url.searchParams.get("order") ?? undefined,
    needs_report: url.searchParams.get("needs_report") ?? undefined,
    needs_pm: url.searchParams.get("needs_pm") ?? undefined,
    include_email: url.searchParams.get("include_email") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  let query = supabase
    .from("feedback")
    .select(AGENT_TICKET_COLUMNS)
    .order("created_at", { ascending: parsed.data.order === "asc" })
    .limit(parsed.data.limit);
  if (parsed.data.status) query = query.eq("status", parsed.data.status);
  if (parsed.data.needs_report === "1") {
    query = query.in("status", [...FINISHED_STATUSES]).is("reported_at", null);
  }

  if (parsed.data.needs_pm === "1") {
    query = query
      .eq("status", "triaged")
      .in("classification", [...PM_CLASSIFICATIONS])
      .is("pm_queued_at", null);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[agent] list tickets failed:", error);
    return NextResponse.json({ error: "Couldn't load tickets." }, { status: 502 });
  }

  const includeEmail = parsed.data.include_email === "1";
  return NextResponse.json({ ok: true, tickets: data.map((t) => toAgentTicket(t, includeEmail)) });
}
