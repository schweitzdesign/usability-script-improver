import { createClient } from "@supabase/supabase-js";

type GradingColumns = {
  grade: string | null;
  grade_summary: string | null;
  grade_strengths: string[] | null;
  grade_weaknesses: string[] | null;
  grade_critical_changes: string[] | null;
  graded_at: string | null;
};

export type SubmissionRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  title: string;
  mode: "paste" | "upload";
  file_name: string | null;
  script_text: string;
  slack_notified: boolean;
} & GradingColumns;

// slack_notified is a legacy column: Slack was retired, the column stays in
// the database (defaulting to false) but nothing writes it anymore.
type SubmissionInsert = Omit<
  SubmissionRow,
  "id" | "created_at" | "slack_notified" | keyof GradingColumns
> &
  Partial<GradingColumns> & { slack_notified?: boolean };

export type FeedbackKind = "bug" | "idea" | "other";

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type TriageColumns = {
  classification:
    | "bug"
    | "usability"
    | "feature_request"
    | "user_error"
    | "question"
    | "not_actionable"
    | null;
  severity: "low" | "medium" | "high" | "critical" | null;
  triage_notes: string | null;
  duplicate_of: string | null;
  reply_draft: string | null;
  reply_sent_at: string | null;
  queued_at: string | null;
  reported_at: string | null;
  pm_queued_at: string | null;
};

export type FeedbackRow = {
  id: string;
  ticket_number: number;
  created_at: string;
  kind: FeedbackKind;
  message: string;
  email: string | null;
  page_url: string | null;
  user_agent: string | null;
  viewport: string | null;
  app_mode: "live" | "demo";
  status: string;
  ack_sent_at: string | null;
} & TriageColumns;

type FeedbackInsert = Omit<
  FeedbackRow,
  "id" | "ticket_number" | "created_at" | "status" | "ack_sent_at" | keyof TriageColumns
> &
  Partial<Pick<FeedbackRow, "status" | "ack_sent_at">> &
  Partial<TriageColumns>;

export type TicketEventRow = {
  id: string;
  feedback_id: string;
  created_at: string;
  actor: string;
  action: string;
  detail: Json | null;
};

type TicketEventInsert = Omit<TicketEventRow, "id" | "created_at">;

export type UsageEventRow = {
  id: string;
  created_at: string;
  source: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  est_cost_usd: number;
  feedback_id: string | null;
};

type UsageEventInsert = Omit<UsageEventRow, "id" | "created_at" | "feedback_id"> &
  Partial<Pick<UsageEventRow, "feedback_id">>;

export type BacklogItemRow = {
  id: string;
  item_number: number;
  created_at: string;
  updated_at: string;
  title: string;
  kind: "bug" | "usability" | "feature_request";
  status:
    | "new"
    | "assessing"
    | "recommended"
    | "approved"
    | "rejected"
    | "deferred"
    | "needs_info"
    | "shipped";
  problem: string | null;
  user_story: string | null;
  impact: number | null;
  confidence: number | null;
  ease: number | null;
  ease_source: "pm_guess" | "engineering";
  /** Computed by the database: impact x confidence x ease / 100. */
  ice_score: number | null;
  recommendation: "build_now" | "build_later" | "investigate" | "defer" | "drop" | "needs_info" | null;
  change_summary: string | null;
  why: string | null;
  risk: string | null;
  effort_size: "S" | "M" | "L" | null;
  effort_why: string | null;
  build_cost_usd: number | null;
  run_cost_delta_usd_month: number | null;
  budget_used_pct: number | null;
  recommendation_reported_at: string | null;
  decision: "yes" | "no" | "more" | null;
  decision_note: string | null;
  decided_at: string | null;
  decision_picked_up_at: string | null;
  followup_rounds: number;
  followup_question: string | null;
  followup_answer: string | null;
  ship_state: "building" | "needs_review" | "merged" | "live" | "failed" | null;
  ship_note: string | null;
  pr_url: string | null;
  ship_requested_at: string | null;
  shipped_at: string | null;
  ship_reported_state: string | null;
};

export type BacklogAssessmentRow = {
  id: string;
  item_id: string;
  created_at: string;
  stance: "change" | "no_change" | "investigate";
  experience_summary: string;
  why: string;
  risk: string;
  effort_size: "S" | "M" | "L";
  effort_why: string;
  touches_database: boolean;
  touches_dependencies: boolean;
  touches_environment: boolean;
  touches_ai_grading: boolean;
  accessibility_note: string | null;
  states_note: string | null;
  reuse_note: string | null;
  files_likely_touched: string[];
};

type BacklogItemInsert = Pick<BacklogItemRow, "title" | "kind"> &
  Partial<Omit<BacklogItemRow, "id" | "item_number" | "created_at" | "ice_score" | "title" | "kind">>;

export type BacklogItemTicketRow = {
  item_id: string;
  feedback_id: string;
  added_at: string;
};

export type BacklogEventRow = {
  id: string;
  item_id: string;
  created_at: string;
  actor: string;
  action: string;
  detail: Json | null;
};

export type DecisionLinkRow = {
  id: string;
  item_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  choice: "yes" | "no" | "more" | null;
};

type Database = {
  public: {
    Tables: {
      backlog_items: {
        Row: BacklogItemRow;
        Insert: BacklogItemInsert;
        Update: Partial<Omit<BacklogItemRow, "id" | "item_number" | "created_at" | "ice_score">>;
        Relationships: [];
      };
      backlog_assessments: {
        Row: BacklogAssessmentRow;
        Insert: Omit<BacklogAssessmentRow, "id" | "created_at">;
        Update: Partial<Omit<BacklogAssessmentRow, "id" | "created_at">>;
        Relationships: [];
      };
      backlog_item_tickets: {
        Row: BacklogItemTicketRow;
        Insert: Pick<BacklogItemTicketRow, "item_id" | "feedback_id">;
        Update: Partial<BacklogItemTicketRow>;
        Relationships: [];
      };
      backlog_events: {
        Row: BacklogEventRow;
        Insert: Omit<BacklogEventRow, "id" | "created_at">;
        Update: Partial<Omit<BacklogEventRow, "id" | "created_at">>;
        Relationships: [];
      };
      decision_links: {
        Row: DecisionLinkRow;
        Insert: Pick<DecisionLinkRow, "item_id" | "token_hash" | "expires_at">;
        Update: Partial<Omit<DecisionLinkRow, "id" | "created_at">>;
        Relationships: [];
      };
      submissions: {
        Row: SubmissionRow;
        Insert: SubmissionInsert;
        Update: Partial<Omit<SubmissionRow, "id" | "created_at">>;
        Relationships: [];
      };
      feedback: {
        Row: FeedbackRow;
        Insert: FeedbackInsert;
        Update: Partial<Omit<FeedbackRow, "id" | "ticket_number" | "created_at">>;
        Relationships: [];
      };
      ticket_events: {
        Row: TicketEventRow;
        Insert: TicketEventInsert;
        Update: Partial<Omit<TicketEventRow, "id" | "created_at">>;
        Relationships: [];
      };
      usage_events: {
        Row: UsageEventRow;
        Insert: UsageEventInsert;
        Update: Partial<Omit<UsageEventRow, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

let client: ReturnType<typeof createClient<Database>> | null | undefined;

/** Server-only client using the service role key. Returns null if unconfigured. */
export function getSupabaseServerClient() {
  if (client !== undefined) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.warn(
      "[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skipping persistence. See .env.local.example."
    );
    client = null;
    return client;
  }

  client = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return client;
}
