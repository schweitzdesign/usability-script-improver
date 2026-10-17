import { z } from "zod";
import type { getSupabaseServerClient, Json } from "@/lib/supabase";

type Supabase = NonNullable<ReturnType<typeof getSupabaseServerClient>>;

export const TICKET_STATUSES = ["new", "queued", "triaged", "resolved_by_support"] as const;
/** Statuses where the Support bot is done and the ticket's card can be reported. */
export const FINISHED_STATUSES = ["triaged", "resolved_by_support"] as const;
export const CLASSIFICATIONS = [
  "bug",
  "usability",
  "feature_request",
  "user_error",
  "question",
  "not_actionable",
] as const;
export const SEVERITIES = ["low", "medium", "high", "critical"] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

// The ticket lifecycle from docs/agents/architecture.md. Later phases add states.
const ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  new: ["queued"],
  // queued -> new releases a claim when the sync could not create the agent's task.
  queued: ["triaged", "resolved_by_support", "new"],
  triaged: [],
  resolved_by_support: [],
};

export function canTransition(from: string, to: string) {
  if (from === to) return true;
  return (ALLOWED_TRANSITIONS[from as TicketStatus] ?? []).includes(to as TicketStatus);
}

/** Accepts 42, "42", or "POKE-0042". */
export function parseTicketNumber(raw: string) {
  const match = /^(?:POKE-)?0*(\d{1,9})$/i.exec(raw.trim());
  return match ? Number(match[1]) : null;
}

export const ticketNumberSchema = z.coerce.number().int().positive().max(999_999_999);

export async function logTicketEvent(
  supabase: Supabase,
  feedbackId: string,
  actor: string,
  action: string,
  detail?: Json
) {
  const { error } = await supabase
    .from("ticket_events")
    .insert({ feedback_id: feedbackId, actor, action, detail: detail ?? null });
  if (error) console.error("[tickets] audit insert failed:", error.message);
}

/**
 * What agents are allowed to see. The customer's email address is left out unless
 * the caller opts in with includeEmail, which only the maintainer's report and
 * story commands do; the Support bot's own commands never ask for it.
 */
export const AGENT_TICKET_COLUMNS =
  "id, ticket_number, created_at, kind, message, email, page_url, user_agent, viewport, app_mode, status, classification, severity, triage_notes, duplicate_of, reply_draft, reply_sent_at, queued_at, reported_at";

export function toAgentTicket(
  row: {
    email: string | null;
    [key: string]: unknown;
  },
  includeEmail = false
) {
  const { email, ...rest } = row;
  return { ...rest, has_email: Boolean(email), ...(includeEmail ? { email } : {}) };
}
