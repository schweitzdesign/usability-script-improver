import { Resend } from "resend";
import {
  FEEDBACK_KIND_LABEL,
  firstUpdateWindow,
  formatTicketNumber,
} from "@/lib/support-policy";

type FeedbackAckInput = {
  to: string;
  ticketNumber: number;
  kind: keyof typeof FEEDBACK_KIND_LABEL;
  message: string;
};

let client: Resend | null | undefined;

function getResend() {
  if (client !== undefined) return client;
  const apiKey = process.env.RESEND_API_KEY;
  client = apiKey ? new Resend(apiKey) : null;
  return client;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Sends the "we got it" confirmation. Unconfigured is not fatal, like every other side channel here. */
export async function sendFeedbackAck(input: FeedbackAckInput) {
  const resend = getResend();
  const from = process.env.FEEDBACK_FROM_EMAIL;

  if (!resend || !from) {
    console.warn(
      "[email] RESEND_API_KEY / FEEDBACK_FROM_EMAIL not set, skipping confirmation email. See .env.local.example."
    );
    return { delivered: false as const };
  }

  const ticket = formatTicketNumber(input.ticketNumber);
  const kindLabel = FEEDBACK_KIND_LABEL[input.kind];
  const updateWindow = firstUpdateWindow(input.kind);
  const preview =
    input.message.length > 400 ? `${input.message.slice(0, 400)}...` : input.message;

  const text = [
    `We got your ${kindLabel}. Thanks for poking at POKE.`,
    "",
    `Ticket: ${ticket}`,
    `Expect a first update within ${updateWindow}. If we need more from you, we'll reply to this email.`,
    "",
    "What you sent:",
    preview,
  ].join("\n");

  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:520px">
<p>We got your ${kindLabel}. Thanks for poking at POKE.</p>
<p><strong>Ticket:</strong> ${ticket}<br>
Expect a first update within ${updateWindow}. If we need more from you, we'll reply to this email.</p>
<p style="color:#555;margin-bottom:4px">What you sent:</p>
<blockquote style="margin:0;padding-left:12px;border-left:3px solid #ddd;white-space:pre-wrap">${escapeHtml(preview)}</blockquote>
</div>`;

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `We got it: ${ticket}`,
    text,
    html,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
  return { delivered: true as const };
}
