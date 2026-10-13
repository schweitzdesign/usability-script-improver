-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Adds a "not_actionable" classification so the Support bot can close jokes,
-- spam, and unrelated messages politely instead of mislabeling them. Run after 0004.

alter table feedback drop constraint if exists feedback_classification_check;

alter table feedback
  add constraint feedback_classification_check
  check (classification in ('bug', 'usability', 'feature_request', 'user_error', 'question', 'not_actionable'));
