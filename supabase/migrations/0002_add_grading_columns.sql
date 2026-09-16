-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- schema.sql already ran once against the live project, so this is a
-- separate, idempotent migration rather than an edit to it.

alter table submissions add column if not exists grade text;
alter table submissions add column if not exists grade_summary text;
alter table submissions add column if not exists grade_strengths jsonb;
alter table submissions add column if not exists grade_weaknesses jsonb;
alter table submissions add column if not exists grade_critical_changes jsonb;
alter table submissions add column if not exists graded_at timestamptz;
