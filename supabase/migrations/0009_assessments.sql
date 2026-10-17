-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run. Run after 0008.
-- The Design-Engineer's assessment of a backlog item, plus the PM's one follow-up round.

alter table backlog_items add column if not exists followup_rounds smallint not null default 0;
alter table backlog_items add column if not exists followup_question text;
alter table backlog_items add column if not exists followup_answer text;

create table if not exists backlog_assessments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references backlog_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- The Design-Engineer's own view: make a change, make no change, or find out more first.
  stance text not null check (stance in ('change', 'no_change', 'investigate')),
  -- What changes for people, naming real screens and elements. Becomes the card's headline for builds.
  experience_summary text not null,
  why text not null,
  risk text not null,
  effort_size text not null check (effort_size in ('S', 'M', 'L')),
  effort_why text not null,
  -- Risk flags: any true needs the Director's second approval.
  touches_database boolean not null,
  touches_dependencies boolean not null,
  touches_environment boolean not null,
  touches_ai_grading boolean not null,
  accessibility_note text,
  states_note text,
  reuse_note text,
  -- Paths were checked against the repo copy before saving.
  files_likely_touched text[] not null default '{}'
);

create index if not exists backlog_assessments_item_idx on backlog_assessments (item_id, created_at);

alter table backlog_assessments enable row level security;
