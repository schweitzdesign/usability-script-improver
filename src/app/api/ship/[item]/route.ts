import { NextResponse } from "next/server";
import { latestAssessment, logBacklogEvent, parseItemNumber, ITEM_COLUMNS } from "@/lib/backlog";
import { buildBrief, canShipTransition, plain, requireShip, shipResultSchema } from "@/lib/ship";
import { getSupabaseServerClient, type BacklogItemRow } from "@/lib/supabase";

export const runtime = "nodejs";

type Params = { params: Promise<{ item: string }> };

// The build job reads the brief here. Only an item that was approved and is actively being built
// is served, so the token can't be used to browse the backlog.
export async function GET(request: Request, { params }: Params) {
  const denied = requireShip(request);
  if (denied) return denied;

  const number = parseItemNumber((await params).item);
  if (number === null) return NextResponse.json({ error: "Bad item number." }, { status: 400 });

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const { data } = await supabase.from("backlog_items").select(ITEM_COLUMNS).eq("item_number", number).maybeSingle();
  const item = data as BacklogItemRow | null;
  if (!item) return NextResponse.json({ error: "No such item." }, { status: 404 });
  if (item.status !== "approved" || item.ship_state !== "building") {
    return NextResponse.json({ error: "That item isn't waiting to be built." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, brief: buildBrief(item, await latestAssessment(supabase, item.id)) });
}

// The build job reports how it went; the deployment notice reports "live".
export async function POST(request: Request, { params }: Params) {
  const denied = requireShip(request);
  if (denied) return denied;

  const number = parseItemNumber((await params).item);
  if (number === null) return NextResponse.json({ error: "Bad item number." }, { status: 400 });

  const parsed = shipResultSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid result." }, { status: 400 });
  const { state, note, pr_url } = parsed.data;

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const { data: row } = await supabase
    .from("backlog_items")
    .select("id, item_number, status, ship_state")
    .eq("item_number", number)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "No such item." }, { status: 404 });
  if (row.status !== "approved" && row.status !== "shipped") {
    return NextResponse.json({ error: "That item wasn't approved." }, { status: 409 });
  }
  if (row.ship_state === state) return NextResponse.json({ ok: true, changed: false });
  if (!canShipTransition(row.ship_state, state)) {
    return NextResponse.json({ error: `A ${row.ship_state ?? "not started"} change can't become ${state}.` }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("backlog_items")
    .update({
      ship_state: state,
      ...(note !== undefined ? { ship_note: plain(note) } : {}),
      ...(pr_url ? { pr_url } : {}),
      ...(state === "live" ? { status: "shipped" as const, shipped_at: now } : {}),
      updated_at: now,
    })
    .eq("id", row.id)
    .eq("ship_state", row.ship_state as NonNullable<BacklogItemRow["ship_state"]>)
    .select("item_number");
  if (error) {
    console.error("[ship] update failed:", error);
    return NextResponse.json({ error: "Couldn't record that." }, { status: 502 });
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "That item just changed. Retry." }, { status: 409 });
  }

  await logBacklogEvent(supabase, row.id, "ship", state, { ...(pr_url ? { pr_url } : {}) });
  return NextResponse.json({ ok: true, changed: true });
}
