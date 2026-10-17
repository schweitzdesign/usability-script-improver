-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run. Run after 0009.
-- Tracks an approved change as it is built, merged, and deployed.

alter table backlog_items add column if not exists ship_state text
  check (ship_state in ('building', 'needs_review', 'merged', 'live', 'failed'));
alter table backlog_items add column if not exists ship_note text;
alter table backlog_items add column if not exists pr_url text;
alter table backlog_items add column if not exists ship_requested_at timestamptz;
alter table backlog_items add column if not exists shipped_at timestamptz;
-- The last ship state Zach was told about, so each change is announced exactly once.
alter table backlog_items add column if not exists ship_reported_state text;
