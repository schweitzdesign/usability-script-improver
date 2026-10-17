-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run. Run after 0007.
-- A recommendation now leads with a plain-language statement of what would change for the
-- user, and "more discovery first" becomes its own recommendation instead of "defer".

alter table backlog_items add column if not exists change_summary text;

alter table backlog_items drop constraint if exists backlog_items_recommendation_check;
alter table backlog_items add constraint backlog_items_recommendation_check
  check (recommendation in ('build_now', 'build_later', 'investigate', 'defer', 'drop', 'needs_info'));
