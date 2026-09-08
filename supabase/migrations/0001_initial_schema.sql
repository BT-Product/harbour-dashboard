-- Harbour: initial schema
-- Multi-tenant from day one (single row in `agents` at launch).

create extension if not exists "pgcrypto";

create type transaction_type as enum ('buy', 'sell');
create type transaction_status as enum ('active', 'closed', 'fell_through');
create type interest_level as enum ('pass', 'maybe', 'strong');
create type item_importance as enum ('dealbreaker', 'important', 'minor');

create table agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  brokerage text,
  dre_number text,
  created_at timestamptz not null default now()
);

-- Extends auth.users. One row per authenticated person (agent or client).
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  agent_id uuid not null references agents (id),
  full_name text not null,
  phone text,
  is_agent boolean not null default false,
  created_at timestamptz not null default now()
);

create index profiles_agent_id_idx on profiles (agent_id);

-- Lookup table, not a hardcoded enum, so seller stages are a data insert later.
-- Composite PK: stage_key ('offer_accepted', 'inspection', etc.) is reused
-- across both buy and sell sequences, so it is only unique per type.
create table stage_definitions (
  stage_key text not null,
  transaction_type transaction_type not null,
  sort_order integer not null,
  label text not null,
  explainer text not null,
  primary key (transaction_type, stage_key)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id),
  agent_id uuid not null references agents (id),
  type transaction_type not null,
  status transaction_status not null default 'active',
  current_stage_key text not null,
  property_address text not null,
  key_dates jsonb not null default '{}'::jsonb,
  linked_transaction_id uuid references transactions (id),
  created_at timestamptz not null default now(),
  foreign key (type, current_stage_key) references stage_definitions (transaction_type, stage_key)
);

create index transactions_client_id_idx on transactions (client_id);
create index transactions_agent_id_idx on transactions (agent_id);
create index transactions_linked_transaction_id_idx on transactions (linked_transaction_id);

-- Buy-side only.
create table homes_seen (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id),
  address text not null,
  client_notes text,
  private_notes text,
  interest_level interest_level,
  seen_at timestamptz not null,
  debriefed_at timestamptz,
  created_at timestamptz not null default now()
);

create index homes_seen_client_id_idx on homes_seen (client_id);

-- Buy-side only.
create table tours (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id),
  home_seen_id uuid references homes_seen (id),
  address text not null,
  scheduled_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

create index tours_client_id_idx on tours (client_id);

-- Transaction-scoped so buy contingencies and seller pre-listing items share one shape.
create table inspection_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions (id),
  item text not null,
  importance_to_client item_importance not null default 'minor',
  negotiation_note text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index inspection_items_transaction_id_idx on inspection_items (transaction_id);

-- Buy-side only.
create table preapproval (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id),
  loan_amount numeric(12, 2) not null,
  down_payment numeric(12, 2) not null,
  rate numeric(5, 3) not null,
  lender text,
  hoa_monthly numeric(10, 2) not null default 0,
  updated_at timestamptz not null default now()
);

create index preapproval_client_id_idx on preapproval (client_id);
