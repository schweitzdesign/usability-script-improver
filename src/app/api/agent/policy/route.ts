import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/agent-auth";
import { SUPPORT_FAQ, SUPPORT_SLA, SUPPORT_TONE } from "@/lib/support-policy";
import { CLASSIFICATIONS, SEVERITIES } from "@/lib/tickets";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = requireAgent(request);
  if (denied) return denied;

  return NextResponse.json({
    ok: true,
    sla: SUPPORT_SLA,
    tone: SUPPORT_TONE,
    faq: SUPPORT_FAQ,
    classifications: CLASSIFICATIONS,
    severities: SEVERITIES,
  });
}
