-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  title text not null default '',
  mode text not null check (mode in ('paste', 'upload')),
  file_name text,
  script_text text not null,
  slack_notified boolean not null default false
);

-- Server-side access only uses the service role key, which bypasses RLS.
-- Enabling RLS with no policies means the anon/public key can't read or
-- write this table even if it were ever exposed to the client.
alter table submissions enable row level security;
