-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Marks when a finished ticket's card has been sent to Telegram, so each ticket
-- is reported exactly once. Run after 0005.

alter table feedback add column if not exists reported_at timestamptz;
