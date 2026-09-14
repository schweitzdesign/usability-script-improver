import { createClient } from "@supabase/supabase-js";

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
};

type Database = {
  public: {
    Tables: {
      submissions: {
        Row: SubmissionRow;
        Insert: Omit<SubmissionRow, "id" | "created_at">;
        Update: Partial<Omit<SubmissionRow, "id" | "created_at">>;
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
