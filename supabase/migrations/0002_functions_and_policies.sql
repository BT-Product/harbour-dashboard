-- Harbour: RLS + helper functions.
--
-- Guarantee this migration enforces at the database level (not just app code):
-- a client session can never retrieve homes_seen.private_notes, no matter what
-- query the client-side code issues. Enforced by revoking column-level SELECT
-- on private_notes from `authenticated` entirely; the only path to that column
-- is the SECURITY DEFINER agent_* functions below, which check is_agent_of()
-- before touching the row.

grant usage on schema public to authenticated, anon;

create or replace function current_user_is_agent()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_agent from profiles where id = auth.uid()), false);
$$;

create or replace function current_agent_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select agent_id from profiles where id = auth.uid();
$$;

-- True when the caller is an agent and target_client_id belongs to the same tenant.
create or replace function is_agent_of(target_client_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select current_user_is_agent()
    and exists (
      select 1 from profiles
      where id = target_client_id
        and agent_id = current_agent_id()
    );
$$;

create or replace function can_access_transaction(target_transaction_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from transactions t
    where t.id = target_transaction_id
      and (t.client_id = auth.uid() or is_agent_of(t.client_id))
  );
$$;

-- ---------------------------------------------------------------------------
-- agents
-- ---------------------------------------------------------------------------
alter table agents enable row level security;

create policy agents_select_own on agents
  for select to authenticated
  using (id = current_agent_id());

grant select on agents to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;

create policy profiles_select on profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (current_user_is_agent() and agent_id = current_agent_id())
  );

grant select on profiles to authenticated;

-- ---------------------------------------------------------------------------
-- stage_definitions (public reference data)
-- ---------------------------------------------------------------------------
alter table stage_definitions enable row level security;

create policy stage_definitions_select on stage_definitions
  for select to authenticated
  using (true);

grant select on stage_definitions to authenticated;

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
alter table transactions enable row level security;

create policy transactions_select on transactions
  for select to authenticated
  using (client_id = auth.uid() or is_agent_of(client_id));

create policy transactions_insert_agent on transactions
  for insert to authenticated
  with check (is_agent_of(client_id));

create policy transactions_update_agent on transactions
  for update to authenticated
  using (is_agent_of(client_id))
  with check (is_agent_of(client_id));

grant select, insert, update on transactions to authenticated;

-- ---------------------------------------------------------------------------
-- homes_seen
-- Clients read their own rows through the base table, but only the
-- client-safe columns (see grant below). Agents read/write the full row,
-- private_notes included, only through the SECURITY DEFINER functions.
-- ---------------------------------------------------------------------------
alter table homes_seen enable row level security;

create policy homes_seen_select_client on homes_seen
  for select to authenticated
  using (client_id = auth.uid());

revoke all on homes_seen from authenticated, anon;
grant select (id, client_id, address, client_notes, interest_level, seen_at, debriefed_at, created_at)
  on homes_seen to authenticated;

create or replace function agent_upsert_home_debrief(
  p_home_id uuid,
  p_client_id uuid,
  p_address text,
  p_client_notes text,
  p_private_notes text,
  p_interest_level interest_level,
  p_seen_at timestamptz
)
returns homes_seen
language plpgsql
security definer
set search_path = public
as $$
declare
  result homes_seen;
begin
  if not is_agent_of(p_client_id) then
    raise exception 'not authorized';
  end if;

  if p_home_id is null then
    insert into homes_seen (client_id, address, client_notes, private_notes, interest_level, seen_at, debriefed_at)
    values (p_client_id, p_address, p_client_notes, p_private_notes, p_interest_level, p_seen_at, now())
    returning * into result;
  else
    update homes_seen
    set address = p_address,
        client_notes = p_client_notes,
        private_notes = p_private_notes,
        interest_level = p_interest_level,
        seen_at = p_seen_at,
        debriefed_at = now()
    where id = p_home_id and client_id = p_client_id
    returning * into result;
  end if;

  return result;
end;
$$;

grant execute on function agent_upsert_home_debrief(uuid, uuid, text, text, text, interest_level, timestamptz) to authenticated;

create or replace function agent_list_homes_seen(p_client_id uuid)
returns setof homes_seen
language sql
security definer
set search_path = public
stable
as $$
  select * from homes_seen
  where client_id = p_client_id and is_agent_of(p_client_id)
  order by seen_at desc;
$$;

grant execute on function agent_list_homes_seen(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- tours
-- ---------------------------------------------------------------------------
alter table tours enable row level security;

create policy tours_select on tours
  for select to authenticated
  using (client_id = auth.uid() or is_agent_of(client_id));

grant select on tours to authenticated;

-- ---------------------------------------------------------------------------
-- inspection_items
-- ---------------------------------------------------------------------------
alter table inspection_items enable row level security;

create policy inspection_items_select on inspection_items
  for select to authenticated
  using (can_access_transaction(transaction_id));

grant select on inspection_items to authenticated;

-- ---------------------------------------------------------------------------
-- preapproval
-- ---------------------------------------------------------------------------
alter table preapproval enable row level security;

create policy preapproval_select on preapproval
  for select to authenticated
  using (client_id = auth.uid() or is_agent_of(client_id));

grant select on preapproval to authenticated;

-- ---------------------------------------------------------------------------
-- Agent-facing surfaces: stage advance + tour debrief entry (section 4a)
-- ---------------------------------------------------------------------------

create or replace function agent_advance_stage(p_transaction_id uuid, p_stage_key text)
returns transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  result transactions;
  target_client_id uuid;
begin
  select client_id into target_client_id from transactions where id = p_transaction_id;

  if target_client_id is null or not is_agent_of(target_client_id) then
    raise exception 'not authorized';
  end if;

  update transactions
  set current_stage_key = p_stage_key
  where id = p_transaction_id
  returning * into result;

  return result;
end;
$$;

grant execute on function agent_advance_stage(uuid, text) to authenticated;
