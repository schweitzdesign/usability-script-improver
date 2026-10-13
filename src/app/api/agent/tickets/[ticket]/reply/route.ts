import { NextResponse } from "next/server";
import { z } from "zod";
import { getReplyMode, requireAgent } from "@/lib/agent-auth";
import { sendSupportReply } from "@/lib/email";
import { getSupabaseServerClient } from "@/lib/supabase";
import { logTicketEvent, parseTicketNumber } from "@/lib/tickets";

export const runtime = "nodejs";

type Params = { params: Promise<{ ticket: string }> };

const bodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
  actor: z.string().trim().min(1).max(40).optional().default("support-bot"),
});

export async function POST(request: Request, { params }: Params) {
  const denied = requireAgent(request);
  if (denied) return denied;

  const number = parseTicketNumber((await params).ticket);
  if (number === null) return NextResponse.json({ error: "Bad ticket number." }, { status: 400 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid reply." }, { status: 400 });
  const { body, actor } = parsed.data;

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database isn't configured." }, { status: 502 });

  const { data: row, error } = await supabase
    .from("feedback")
    .select("id, ticket_number, email, status")
    .eq("ticket_number", number)
    .maybeSingle();
  if (error) {
    console.error("[agent] load ticket for reply failed:", error);
    return NextResponse.json({ error: "Couldn't load that ticket." }, { status: 502 });
  }
  if (!row) return NextResponse.json({ error: "No such ticket." }, { status: 404 });
  if (row.status === "new") {
    return NextResponse.json({ error: "Claim the ticket before replying." }, { status: 409 });
  }

  const mode = getReplyMode();
  let sent = false;

  if (mode === "send" && row.email) {
    try {
      await sendSupportReply({ to: row.email, ticketNumber: row.ticket_number, body });
      sent = true;
    } catch (sendError) {
      console.error("[agent] reply email failed:", sendError);
      return NextResponse.json({ error: "Couldn't send that reply." }, { status: 502 });
    }
  }

  // The draft is always kept as the record of what was written.
  const { error: saveError } = await supabase
    .from("feedback")
    .update({ reply_draft: body, ...(sent ? { reply_sent_at: new Date().toISOString() } : {}) })
    .eq("id", row.id);
  if (saveError) {
    console.error("[agent] saving reply failed:", saveError);
    return NextResponse.json({ error: "Couldn't save that reply." }, { status: 502 });
  }

  await logTicketEvent(supabase, row.id, actor, sent ? "reply_sent" : "reply_drafted", {
    mode,
    has_email: Boolean(row.email),
    chars: body.length,
  });

  return NextResponse.json({ ok: true, mode, sent });
}
