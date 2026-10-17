-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- The PM bot's backlog: items (clusters of related tickets), which tickets belong to
-- which item, an audit trail, and one-time decision links. Run after 0006.

-- Marks when a triaged ticket has been handed to the PM, like queued_at does for Support.
alter table feedback add column if not exists pm_queued_at timestamptz;

create table if not exists backlog_items (
  id uuid primary key default gen_random_uuid(),
  -- Human-friendly id, shown as B-003.
  item_number bigint generated always as identity,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  kind text not null check (kind in ('bug', 'usability', 'feature_request')),
  status text not null default 'new'
    check (status in ('new', 'assessing', 'recommended', 'approved', 'rejected', 'deferred', 'needs_info', 'shipped')),
  problem text,
  user_story text,

  -- ICE scoring, each 1 to 10. Confidence is explicit so thin evidence lowers the rank.
  impact smallint check (impact between 1 and 10),
  confidence smallint check (confidence between 1 and 10),
  ease smallint check (ease between 1 and 10),
  -- Who set Ease: the PM's own guess, or the Design-Engineer's assessment.
  ease_source text not null default 'pm_guess' check (ease_source in ('pm_guess', 'engineering')),
  -- impact x confidence x ease / 100, on a 0 to 10 scale. Null until all three are set.
  ice_score numeric(4, 2) generated always as (round((impact * confidence * ease) / 100.0, 2)) stored,

  -- The recommendation to the Director of Product.
  recommendation text check (recommendation in ('build_now', 'build_later', 'defer', 'drop', 'needs_info')),
  why text,
  risk text,
  effort_size text check (effort_size in ('S', 'M', 'L')),
  effort_why text,
  build_cost_usd numeric(8, 2),
  run_cost_delta_usd_month numeric(8, 2),
  budget_used_pct numeric(5, 1),
  recommendation_reported_at timestamptz,

  -- The Director's decision, made on the one-time decision page.
  decision text check (decision in ('yes', 'no', 'more')),
  decision_note text,
  decided_at timestamptz,
  decision_picked_up_at timestamptz
);

create unique index if not exists backlog_items_number_idx on backlog_items (item_number);
create index if not exists backlog_items_status_idx on backlog_items (status, updated_at);

-- Which tickets belong to which item. A ticket belongs to at most one item.
create table if not exists backlog_item_tickets (
  item_id uuid not null references backlog_items (id) on delete cascade,
  feedback_id uuid not null references feedback (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (item_id, feedback_id),
  unique (feedback_id)
);

create table if not exists backlog_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references backlog_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  actor text not null,
  action text not null,
  detail jsonb
);

create index if not exists backlog_events_item_idx on backlog_events (item_id, created_at);

-- One-time decision links. Only a hash of the token is stored, so a database leak
-- doesn't hand out working links.
create table if not exists decision_links (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references backlog_items (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  choice text check (choice in ('yes', 'no', 'more'))
);

create index if not exists decision_links_item_idx on decision_links (item_id);

-- Service role only, like every other table here.
alter table backlog_items enable row level security;
alter table backlog_item_tickets enable row level security;
alter table backlog_events enable row level security;
alter table decision_links enable row level security;
