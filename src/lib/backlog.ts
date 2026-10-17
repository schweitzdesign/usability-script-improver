import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { BacklogItemRow, getSupabaseServerClient, Json } from "@/lib/supabase";

type Supabase = NonNullable<ReturnType<typeof getSupabaseServerClient>>;

export const BACKLOG_KINDS = ["bug", "usability", "feature_request"] as const;
export const BACKLOG_STATUSES = [
  "new",
  "assessing",
  "recommended",
  "approved",
  "rejected",
  "deferred",
  "needs_info",
  "shipped",
] as const;
// What the PM may recommend. "defer" is retired: it meant "not enough evidence", which is
// now "investigate" (do more discovery first). Old rows may still carry it.
export const RECOMMENDATIONS = ["build_now", "build_later", "investigate", "drop"] as const;
export const EFFORT_SIZES = ["S", "M", "L"] as const;
export const DECISION_CHOICES = ["yes", "no", "more"] as const;

export type BacklogStatus = (typeof BACKLOG_STATUSES)[number];
export type Recommendation = (typeof RECOMMENDATIONS)[number] | "defer" | "needs_info";
export type DecisionChoice = (typeof DECISION_CHOICES)[number];

/** Decision links stop working after this long. */
export const DECISION_LINK_DAYS = 14;

/** Statuses the PM may set on its own. Everything else is set by code or by Zach's decision. */
export const PM_SETTABLE_STATUSES = ["new", "assessing", "needs_info"] as const;

// The item lifecycle. `recommended` is entered only through the recommendation endpoint,
// and approved / rejected / deferred only through a decision on the decision page.
const ALLOWED_TRANSITIONS: Record<BacklogStatus, readonly BacklogStatus[]> = {
  new: ["assessing", "needs_info", "recommended"],
  assessing: ["new", "needs_info", "recommended"],
  needs_info: ["new", "assessing", "recommended"],
  // "Ask more" sends it back; yes and no end it.
  recommended: ["approved", "rejected", "deferred", "needs_info", "assessing"],
  approved: ["shipped"],
  rejected: [],
  deferred: ["new", "assessing"],
  shipped: [],
};

export function canTransitionItem(from: string, to: string) {
  if (from === to) return true;
  return (ALLOWED_TRANSITIONS[from as BacklogStatus] ?? []).includes(to as BacklogStatus);
}

/** Accepts 3, "3", "B-3", or "B-003". */
export function parseItemNumber(raw: string) {
  const match = /^(?:B-)?0*(\d{1,9})$/i.exec(raw.trim());
  return match ? Number(match[1]) : null;
}

export function formatItemNumber(n: number) {
  return `B-${String(n).padStart(3, "0")}`;
}

/** Same house rule as replies: bots drift to em and en dashes, so refuse them in code. */
const noDashes = (s: string) => !/[–—]/.test(s);
const DASH_MESSAGE = "Use commas, periods, or colons instead of em or en dashes.";

const text = (max: number) =>
  z.string().trim().min(1).max(max).refine(noDashes, { message: DASH_MESSAGE });

export const titleSchema = text(90);
export const problemSchema = text(500);
export const userStorySchema = text(500);
const score = z.number().int().min(1).max(10);

export const recommendationSchema = z.object({
  recommendation: z.enum(RECOMMENDATIONS),
  // The headline: what changes for the user, in plain language.
  change_summary: text(500),
  why: text(450),
  risk: text(350),
  effort_size: z.enum(EFFORT_SIZES),
  effort_why: text(300),
  build_cost_usd: z.number().min(0).max(1000).optional(),
  run_cost_delta_usd_month: z.number().min(-1000).max(1000).optional(),
  // The PM re-states its scores when it recommends, so the card and the rank always agree.
  impact: score,
  confidence: score,
  ease: score,
  actor: z.string().trim().min(1).max(40).optional().default("pm-bot"),
});

export const scoreSchema = score;

export const decisionBodySchema = z.object({
  token: z.string().trim().min(20).max(200),
  choice: z.enum(DECISION_CHOICES),
  note: z.string().trim().max(1000).optional(),
});

export async function logBacklogEvent(
  supabase: Supabase,
  itemId: string,
  actor: string,
  action: string,
  detail?: Json
) {
  const { error } = await supabase
    .from("backlog_events")
    .insert({ item_id: itemId, actor, action, detail: detail ?? null });
  if (error) console.error("[backlog] audit insert failed:", error.message);
}

export const ITEM_COLUMNS =
  "id, item_number, created_at, updated_at, title, kind, status, problem, user_story, impact, confidence, ease, ease_source, ice_score, recommendation, change_summary, why, risk, effort_size, effort_why, build_cost_usd, run_cost_delta_usd_month, budget_used_pct, recommendation_reported_at, decision, decision_note, decided_at, decision_picked_up_at";

export type ItemTicket = {
  ticket_number: number;
  classification: string | null;
  severity: string | null;
  created_at: string;
  message?: string;
};

/** Attach the tickets behind each item. Messages are included only when asked for. */
export async function withTickets(
  supabase: Supabase,
  items: BacklogItemRow[],
  includeMessages = false
) {
  if (items.length === 0) return [] as (BacklogItemRow & { tickets: ItemTicket[] })[];

  const { data: links } = await supabase
    .from("backlog_item_tickets")
    .select("item_id, feedback_id")
    .in("item_id", items.map((i) => i.id));

  const feedbackIds = (links ?? []).map((l) => l.feedback_id);
  const { data: feedback } = feedbackIds.length
    ? await supabase
        .from("feedback")
        .select("id, ticket_number, classification, severity, created_at, message")
        .in("id", feedbackIds)
    : { data: [] };
  const byId = new Map((feedback ?? []).map((f) => [f.id, f]));

  return items.map((item) => ({
    ...item,
    tickets: (links ?? [])
      .filter((l) => l.item_id === item.id)
      .map((l) => byId.get(l.feedback_id))
      .filter((f): f is NonNullable<typeof f> => Boolean(f))
      .sort((a, b) => a.ticket_number - b.ticket_number)
      .map((f) => ({
        ticket_number: f.ticket_number,
        classification: f.classification,
        severity: f.severity,
        created_at: f.created_at,
        ...(includeMessages ? { message: f.message.slice(0, 600) } : {}),
      })),
  }));
}

// --- Decision links ---------------------------------------------------------------

export function newDecisionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** What "Yes" means depends on what the PM recommended. */
export function statusForYes(recommendation: string | null): BacklogStatus {
  // Yes to "investigate first" approves the discovery; the item waits for what it finds.
  if (recommendation === "investigate" || recommendation === "needs_info") return "needs_info";
  if (recommendation === "defer") return "deferred";
  if (recommendation === "drop") return "rejected";
  return "approved";
}

/** "No" only makes sense when the recommendation proposes doing something. */
export function allowsNo(recommendation: string | null) {
  return ["build_now", "build_later", "investigate", "needs_info"].includes(recommendation ?? "");
}

export type LinkLookup =
  | { state: "invalid" }
  | { state: "expired" | "used" | "not_open" | "open"; item: BacklogItemRow & { tickets: ItemTicket[] }; choice: DecisionChoice | null };

/** Read-only check used to render the decision page. It never consumes the link. */
export async function lookupDecisionLink(supabase: Supabase, token: string): Promise<LinkLookup> {
  if (token.length < 20 || token.length > 200) return { state: "invalid" };
  const { data: link } = await supabase
    .from("decision_links")
    .select("item_id, expires_at, used_at, choice")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!link) return { state: "invalid" };

  const { data: row } = await supabase
    .from("backlog_items")
    .select(ITEM_COLUMNS)
    .eq("id", link.item_id)
    .maybeSingle();
  if (!row) return { state: "invalid" };
  const [item] = await withTickets(supabase, [row], true);

  const state = link.used_at
    ? "used"
    : new Date(link.expires_at).getTime() < Date.now()
      ? "expired"
      : row.status !== "recommended"
        ? "not_open"
        : "open";
  return { state, item, choice: link.choice };
}

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  build_now: "Make this change now",
  build_later: "Make this change later",
  investigate: "Find out more before changing anything",
  needs_info: "Find out more before changing anything",
  defer: "Wait for now",
  drop: "Make no change",
};

export const EFFORT_LABELS = { S: "Small", M: "Medium", L: "Large" } as const;

export const KIND_LABELS: Record<(typeof BACKLOG_KINDS)[number], string> = {
  bug: "Bug",
  usability: "Usability issue",
  feature_request: "Feature request",
};

export function describeCost(item: {
  build_cost_usd: number | null;
  run_cost_delta_usd_month: number | null;
  budget_used_pct: number | null;
}) {
  const parts: string[] = [];
  if (item.build_cost_usd !== null) {
    const build = Number(item.build_cost_usd);
    parts.push(build === 0 ? "no agent time needed" : `about $${build.toFixed(2)} of agent time`);
  }
  if (item.run_cost_delta_usd_month !== null) {
    const d = Number(item.run_cost_delta_usd_month);
    parts.push(
      d === 0
        ? "no change to monthly running cost"
        : `${d > 0 ? "adds" : "saves"} about $${Math.abs(d).toFixed(2)} a month in running cost`
    );
  }
  if (item.budget_used_pct !== null) parts.push(`the agent team has used ${Number(item.budget_used_pct).toFixed(0)}% of this month's budget`);
  return parts.length ? parts.join("; ") + "." : "No cost estimate given.";
}

export type DecisionOutcome =
  | { ok: true; status: BacklogStatus; itemNumber: number }
  | { ok: false; reason: "invalid" | "expired" | "used" | "not_open" | "bad_choice" | "error" };

/**
 * Applies a decision made with a one-time link. The link is claimed first with a
 * conditional update, so a double tap or a replay can't decide twice.
 */
export async function applyDecision(
  supabase: Supabase,
  token: string,
  choice: DecisionChoice,
  note?: string
): Promise<DecisionOutcome> {
  const { data: link } = await supabase
    .from("decision_links")
    .select("id, item_id, expires_at, used_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!link) return { ok: false, reason: "invalid" };
  if (link.used_at) return { ok: false, reason: "used" };
  if (new Date(link.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };

  const { data: item } = await supabase
    .from("backlog_items")
    .select("id, item_number, status, recommendation")
    .eq("id", link.item_id)
    .maybeSingle();
  if (!item) return { ok: false, reason: "invalid" };
  if (item.status !== "recommended") return { ok: false, reason: "not_open" };
  if (choice === "no" && !allowsNo(item.recommendation)) {
    return { ok: false, reason: "bad_choice" };
  }

  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("decision_links")
    .update({ used_at: now, choice })
    .eq("id", link.id)
    .is("used_at", null)
    .select("id");
  if (claimError) {
    console.error("[decide] claim failed:", claimError);
    return { ok: false, reason: "error" };
  }
  if (!claimed || claimed.length === 0) return { ok: false, reason: "used" };

  const status: BacklogStatus =
    choice === "yes" ? statusForYes(item.recommendation) : choice === "no" ? "rejected" : "needs_info";

  const { error: updateError } = await supabase
    .from("backlog_items")
    .update({
      status,
      decision: choice,
      decision_note: note || null,
      decided_at: now,
      decision_picked_up_at: null,
      updated_at: now,
    })
    .eq("id", item.id)
    .eq("status", "recommended");
  if (updateError) {
    console.error("[decide] item update failed:", updateError);
    return { ok: false, reason: "error" };
  }

  await logBacklogEvent(supabase, item.id, "director", "decision", {
    choice,
    to_status: status,
    ...(note ? { note } : {}),
  });
  return { ok: true, status, itemNumber: item.item_number };
}

// --- Budget -----------------------------------------------------------------------

export function monthlyAgentBudgetUsd() {
  const raw = Number(process.env.AGENT_MONTHLY_BUDGET_USD);
  // Default is the cap on the Hermes workspace in the Anthropic Console.
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
}

/** Month-to-date spend, split into the agent team and the app itself. */
export async function getBudget(supabase: Supabase) {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("usage_events")
    .select("source, est_cost_usd")
    .gte("created_at", start.toISOString())
    .limit(20000);
  if (error) throw new Error(error.message);

  const bySource: Record<string, { usd: number; calls: number }> = {};
  for (const row of data ?? []) {
    const entry = (bySource[row.source] ??= { usd: 0, calls: 0 });
    entry.usd += Number(row.est_cost_usd);
    entry.calls += 1;
  }
  const sum = (pred: (s: string) => boolean) =>
    Object.entries(bySource)
      .filter(([s]) => pred(s))
      .reduce((a, [, v]) => a + v.usd, 0);

  // Bot sources end in "-bot" (support-bot, pm-bot, eng-bot); the rest is the app.
  const agents = sum((s) => s.endsWith("-bot"));
  const app = sum((s) => !s.endsWith("-bot"));
  const cap = monthlyAgentBudgetUsd();

  return {
    month_start: start.toISOString().slice(0, 10),
    agents_spent_usd: round(agents, 4),
    app_spent_usd: round(app, 4),
    agents_cap_usd: cap,
    agents_used_pct: round((agents / cap) * 100, 1),
    // Average cost per call is what the PM needs to price a change that adds model calls.
    by_source: Object.fromEntries(
      Object.entries(bySource).map(([k, v]) => [
        k,
        { usd: round(v.usd, 4), calls: v.calls, avg_usd: round(v.usd / v.calls, 4) },
      ])
    ),
  };
}

function round(n: number, places: number) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}
