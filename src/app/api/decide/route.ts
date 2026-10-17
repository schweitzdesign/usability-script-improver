import { NextResponse } from "next/server";
import { applyDecision, decisionBodySchema } from "@/lib/backlog";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const MESSAGES: Record<string, { status: number; error: string }> = {
  invalid: { status: 404, error: "This link isn't valid." },
  expired: { status: 410, error: "This link has expired. Ask the PM bot for a fresh one." },
  used: { status: 409, error: "A decision was already made with this link." },
  not_open: { status: 409, error: "This item isn't waiting on a decision anymore." },
  bad_choice: { status: 400, error: "That choice doesn't apply to this recommendation." },
  error: { status: 502, error: "Couldn't record that. Try again in a moment." },
};

// The decision page posts here. There is no login: the link itself is the credential
// (unguessable, single use, expires), so this handler stays small and strict.
export async function POST(request: Request) {
  const parsed = decisionBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision." }, { status: 400 });

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const outcome = await applyDecision(supabase, parsed.data.token, parsed.data.choice, parsed.data.note);
  if (!outcome.ok) {
    const m = MESSAGES[outcome.reason];
    return NextResponse.json({ error: m.error, reason: outcome.reason }, { status: m.status });
  }
  return NextResponse.json({ ok: true, status: outcome.status }, { headers: { "Cache-Control": "no-store" } });
}
