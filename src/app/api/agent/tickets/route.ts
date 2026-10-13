import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAgent } from "@/lib/agent-auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import { AGENT_TICKET_COLUMNS, TICKET_STATUSES, toAgentTicket } from "@/lib/tickets";

export const runtime = "nodejs";

const querySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
});

export async function GET(request: Request) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    order: url.searchParams.get("order") ?? undefined,
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

  const { data, error } = await query;
  if (error) {
    console.error("[agent] list tickets failed:", error);
    return NextResponse.json({ error: "Couldn't load tickets." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, tickets: data.map(toAgentTicket) });
}
