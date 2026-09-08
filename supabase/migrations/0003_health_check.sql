-- Dedicated single-row table for /api/health's write+read round trip.
-- Never touched by application logic — infra-only, service-role access.
create table _health_check (
  id boolean primary key default true,
  checked_at timestamptz not null default now(),
  constraint _health_check_singleton check (id = true)
);

insert into _health_check (id) values (true);

alter table _health_check enable row level security;
-- No policies: authenticated/anon get nothing. Only the service role
-- (which bypasses RLS) can touch this table, from /api/health.
