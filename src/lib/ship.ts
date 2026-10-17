import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { BacklogAssessmentRow, BacklogItemRow } from "@/lib/supabase";
import { riskFlags } from "@/lib/backlog";

function digest(s: string) {
  return createHash("sha256").update(s).digest();
}

/**
 * The build job in GitHub gets its own token, separate from the agent token: it can read the
 * brief for an item that is being built and report how the build went, and nothing else.
 */
export function requireShip(request: Request) {
  const expected = process.env.SHIP_API_TOKEN;
  if (!expected) return NextResponse.json({ error: "Shipping isn't configured." }, { status: 503 });
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !timingSafeEqual(digest(token), digest(expected))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

export const SHIP_STATES = ["building", "needs_review", "merged", "live", "failed"] as const;
export type ShipState = (typeof SHIP_STATES)[number];

// building -> merged | needs_review | failed; merged -> live | failed; needs_review -> live (a
// person merged it) | failed. "live" can also arrive from building, because the deployment
// notice can beat the build job's own final report.
const ALLOWED: Record<ShipState, readonly ShipState[]> = {
  building: ["needs_review", "merged", "failed", "live"],
  merged: ["live", "failed"],
  needs_review: ["live", "failed"],
  live: [],
  failed: [],
};

export function canShipTransition(from: string | null, to: string) {
  if (from === to) return true;
  return from ? (ALLOWED[from as ShipState] ?? []).includes(to as ShipState) : false;
}

/** System text sometimes carries dashes (a tool's error output); keep the no-dashes rule by swapping them. */
export function plain(text: string) {
  return text.replace(/[–—]/g, "-").slice(0, 400);
}

export const shipResultSchema = z.object({
  state: z.enum(["needs_review", "merged", "failed", "live"]),
  note: z.string().max(2000).optional(),
  pr_url: z.string().url().max(300).optional(),
});

/**
 * An approved change may merge without a person only when it is Small and the Design-Engineer
 * raised no second-approval flag. The build job checks this again from its own copy.
 */
export function autoMergeEligibility(
  item: Pick<BacklogItemRow, "recommendation" | "effort_size">,
  assessment: BacklogAssessmentRow | null
) {
  const reasons: string[] = [];
  if (!assessment) reasons.push("No engineering assessment.");
  if (item.effort_size !== "S") reasons.push("The work is not Small.");
  if (assessment) {
    for (const flag of riskFlags(assessment)) reasons.push(`It ${flag}.`);
    if (assessment.stance !== "change") reasons.push("The Design-Engineer did not recommend a change.");
  }
  if (item.recommendation !== "build_now" && item.recommendation !== "build_later") {
    reasons.push("The recommendation was not to make a change.");
  }
  return { eligible: reasons.length === 0, reasons };
}

/** What the build job is told to build. It leaves out the raw user reports on purpose. */
export function buildBrief(item: BacklogItemRow, assessment: BacklogAssessmentRow | null) {
  return {
    item_number: item.item_number,
    title: item.title,
    kind: item.kind,
    problem: item.problem,
    user_story: item.user_story,
    change: item.change_summary,
    why: item.why,
    design_notes: {
      experience: assessment?.experience_summary ?? null,
      reuse: assessment?.reuse_note ?? null,
      states: assessment?.states_note ?? null,
      accessibility: assessment?.accessibility_note ?? null,
      risk: assessment?.risk ?? null,
      files_likely_touched: assessment?.files_likely_touched ?? [],
    },
    director_note: item.decision_note,
    ...autoMergeEligibility(item, assessment),
  };
}
