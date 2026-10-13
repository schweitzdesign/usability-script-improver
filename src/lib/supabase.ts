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

type Database = {
  public: {
    Tables: {
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
