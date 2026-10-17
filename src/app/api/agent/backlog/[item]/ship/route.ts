import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAgent } from "@/lib/agent-auth";
import { latestAssessment, logBacklogEvent, parseItemNumber, ITEM_COLUMNS } from "@/lib/backlog";
import { autoMergeEligibility, plain } from "@/lib/ship";
import { getSupabaseServerClient, type BacklogItemRow } from "@/lib/supabase";

export const runtime = "nodejs";

type Params = { params: Promise<{ item: string }> };

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("fail"), note: z.string().max(2000) }),
  z.object({ action: z.literal("reported"), state: z.enum(["needs_review", "failed", "live"]) }),
]);

// Used by the sync on the droplet: begin shipping an approved item, record that the dispatch
// failed, or record that Zach has been told about a ship state.
export async function POST(request: Request, { params }: Params) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const number = parseItemNumber((await params).item);
  if (number === null) return NextResponse.json({ error: "Bad item number." }, { status: 400 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const { data } = await supabase.from("backlog_items").select(ITEM_COLUMNS).eq("item_number", number).maybeSingle();
  const item = data as BacklogItemRow | null;
  if (!item) return NextResponse.json({ error: "No such item." }, { status: 404 });

  const now = new Date().toISOString();
  const body = parsed.data;

  if (body.action === "start") {
    if (item.status !== "approved" || item.decision !== "yes" || item.ship_state !== null) {
      return NextResponse.json({ error: "That item isn't ready to be built." }, { status: 409 });
    }
    const { eligible, reasons } = autoMergeEligibility(item, await latestAssessment(supabase, item.id));
    // Claimed with a conditional update, so two syncs can't both dispatch it.
    const { data: claimed, error } = await supabase
      .from("backlog_items")
      .update({ ship_state: "building", ship_requested_at: now, ship_note: null, updated_at: now })
      .eq("id", item.id)
      .is("ship_state", null)
      .select("item_number");
    if (error) return NextResponse.json({ error: "Couldn't start that." }, { status: 502 });
    if (!claimed || claimed.length === 0) return NextResponse.json({ error: "Already started." }, { status: 409 });
    await logBacklogEvent(supabase, item.id, "sync", "ship_started", { auto_merge: eligible, reasons });
    return NextResponse.json({ ok: true, auto_merge: eligible, reasons });
  }

  if (body.action === "fail") {
    if (item.ship_state !== "building") return NextResponse.json({ error: "Nothing is being built." }, { status: 409 });
    await supabase
      .from("backlog_items")
      .update({ ship_state: "failed", ship_note: plain(body.note), updated_at: now })
      .eq("id", item.id)
      .eq("ship_state", "building");
    await logBacklogEvent(supabase, item.id, "sync", "ship_failed", { note: plain(body.note) });
    return NextResponse.json({ ok: true });
  }

  // reported
  if (item.ship_state !== body.state) {
    return NextResponse.json({ error: "That state has changed since." }, { status: 409 });
  }
  await supabase.from("backlog_items").update({ ship_reported_state: body.state }).eq("id", item.id);
  return NextResponse.json({ ok: true });
}
