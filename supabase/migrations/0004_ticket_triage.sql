-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Adds the triage fields the Support bot writes, plus an audit trail of every
-- agent action on a ticket. Run after 0003.

alter table feedback
  add column if not exists classification text
    check (classification in ('bug', 'usability', 'feature_request', 'user_error', 'question')),
  add column if not exists severity text
    check (severity in ('low', 'medium', 'high', 'critical')),
  add column if not exists triage_notes text,
  add column if not exists duplicate_of uuid references feedback (id) on delete set null,
  add column if not exists reply_draft text,
  add column if not exists reply_sent_at timestamptz,
  add column if not exists queued_at timestamptz;

-- Status values are enforced in the app (src/lib/tickets.ts), not here, so
-- later phases can add states without another migration.

create table if not exists ticket_events (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references feedback (id) on delete cascade,
  created_at timestamptz not null default now(),
  actor text not null,
  action text not null,
  detail jsonb
);

create index if not exists ticket_events_feedback_idx on ticket_events (feedback_id, created_at);

-- Service role only, like every other table here.
alter table ticket_events enable row level security;
