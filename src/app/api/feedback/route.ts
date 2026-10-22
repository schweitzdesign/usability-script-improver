import { NextResponse } from "next/server";
import { z } from "zod";
import { sendFeedbackAck } from "@/lib/email";
import { getSupabaseServerClient } from "@/lib/supabase";
import { requirePortfolioOpen } from "@/lib/portfolio";

export const runtime = "nodejs";

const bodySchema = z.object({
  kind: z.enum(["bug", "idea", "other"]),
  message: z.string().trim().min(1, "Tell us what happened first.").max(2000, "That's a bit long. Keep it under 2,000 characters."),
  email: z.string().trim().max(200).optional().default(""),
  pageUrl: z.string().trim().max(500).optional().default(""),
  viewport: z.string().trim().max(30).optional().default(""),
  appMode: z.enum(["live", "demo"]).optional().default("live"),
  // Honeypot: real people never see or fill this field.
  website: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const closed = requirePortfolioOpen();
  if (closed) return closed;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    // Only the message field has copy written for people; anything else is
    // a malformed request, so don't leak validator internals.
    const issue = parsed.error.issues[0];
    const friendly = issue?.path[0] === "message" ? issue.message : "That didn't look right. Try again.";
    return NextResponse.json({ error: friendly }, { status: 400 });
  }
  const { kind, message, email, pageUrl, viewport, appMode, website } = parsed.data;

  if (website) {
    // Looks like a bot. Pretend it worked so it doesn't retry, store nothing.
    return NextResponse.json({ ok: true, ticketNumber: null });
  }

  if (email && !z.email().safeParse(email).success) {
    return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Feedback isn't set up yet." }, { status: 502 });
  }

  const { data, error } = await supabase
    .from("feedback")
    .insert({
      kind,
      message,
      email: email || null,
      page_url: pageUrl || null,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
      viewport: viewport || null,
      app_mode: appMode,
    })
    .select("id, ticket_number")
    .single();

  if (error) {
    console.error("[feedback] Supabase insert failed:", error);
    return NextResponse.json(
      { error: "We couldn't save that. Please try again in a moment." },
      { status: 502 }
    );
  }

  // The row is the source of truth; the confirmation email is best-effort.
  if (email) {
    try {
      const result = await sendFeedbackAck({
        to: email,
        ticketNumber: data.ticket_number,
        kind,
        message,
      });
      if (result.delivered) {
        await supabase
          .from("feedback")
          .update({ ack_sent_at: new Date().toISOString() })
          .eq("id", data.id);
      }
    } catch (ackError) {
      console.error("[feedback] confirmation email failed:", ackError);
    }
  }

  return NextResponse.json({ ok: true, ticketNumber: data.ticket_number });
}
