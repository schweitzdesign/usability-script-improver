-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Adds the user feedback inbox and a ledger of Anthropic API spend.

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  -- Human-friendly ticket id, shown to users and agents as POKE-0042.
  ticket_number bigint generated always as identity,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null,
  email text,
  page_url text,
  user_agent text,
  viewport text,
  app_mode text not null default 'live' check (app_mode in ('live', 'demo')),
  status text not null default 'new',
  ack_sent_at timestamptz
);

create unique index if not exists feedback_ticket_number_idx on feedback (ticket_number);
create index if not exists feedback_status_idx on feedback (status, created_at);

-- One row per Anthropic API call, so we can see what POKE (and later the
-- agent team) actually costs. est_cost_usd is computed in the app from
-- src/lib/pricing.ts at write time.
create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  est_cost_usd numeric(12, 6) not null default 0,
  feedback_id uuid references feedback (id) on delete set null
);

create index if not exists usage_events_created_at_idx on usage_events (created_at);

-- Server-side access only uses the service role key, which bypasses RLS.
-- RLS on with no policies keeps the anon/public key out of both tables.
alter table feedback enable row level security;
alter table usage_events enable row level security;
