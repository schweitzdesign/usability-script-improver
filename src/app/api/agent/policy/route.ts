import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/agent-auth";
import {
  REPLY_BODY_MAX_CHARS,
  REPLY_CLOSING,
  REPLY_GREETING,
  SUPPORT_EXAMPLES,
  SUPPORT_FAQ,
  SUPPORT_SLA,
  SUPPORT_TONE,
} from "@/lib/support-policy";
import { CLASSIFICATIONS, SEVERITIES } from "@/lib/tickets";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = requireAgent(request);
  if (denied) return denied;

  return NextResponse.json({
    ok: true,
    sla: SUPPORT_SLA,
    tone: SUPPORT_TONE,
    examples: SUPPORT_EXAMPLES,
    reply: { greeting: REPLY_GREETING, closing: REPLY_CLOSING, maxBodyChars: REPLY_BODY_MAX_CHARS },
    faq: SUPPORT_FAQ,
    classifications: CLASSIFICATIONS,
    severities: SEVERITIES,
  });
}
