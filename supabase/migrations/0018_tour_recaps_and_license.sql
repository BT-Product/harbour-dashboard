-- Two things every client email now depends on.
--
-- 1. The agent's license number. California requires a licensee's DRE
--    number on marketing and client-facing material — emails and the
--    dashboard included — and the same holds for every future agent. The
--    column has existed since the initial schema, seeded as the placeholder
--    'TBD', and nothing client-facing ever read it. A placeholder is worse
--    than nothing here: it would print "DRE #TBD" on a client email. So it
--    is cleared to null, and Harbour's senders refuse to send a client email
--    without a real number.
--
-- 2. The tour recap. After the agent has written up every home from a tour
--    day, the client gets one email with those homes and the agent's read on
--    each (strategy.md, "Bringing clients back during the home search"). One
--    row per client per tour day, claimed before sending, exactly like
--    tour_reminders — the unique constraint is what stops a double-click or a
--    retry emailing the same client twice for the same day.

update agents
set dre_number = null
where dre_number is not null
  and upper(btrim(dre_number)) in ('', 'TBD');

comment on column agents.dre_number is
  'The agent''s real estate license number (California DRE: 8 digits). Printed on every client-facing email and on the client dashboard. Null means not on file, and client emails are withheld until it is.';

-- Scoped to the caller's own agent row, like agent_update_my_phone: there is
-- no parameter naming which agent, so one agent can never set another's.
-- Format is checked in the app, where the error can be explained; this only
-- normalises whitespace.
create or replace function agent_update_my_license(p_dre_number text)
returns agents
language plpgsql
security definer
set search_path = public
as $$
declare
  result agents;
begin
  if not current_user_is_agent() then
    raise exception 'not authorized';
  end if;

  update agents
  set dre_number = nullif(btrim(p_dre_number), '')
  where id = current_agent_id()
  returning * into result;

  return result;
end;
$$;

grant execute on function agent_update_my_license(text) to authenticated;

create table if not exists tour_recaps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  tour_date date not null,
  sent_at timestamptz not null default now(),
  recipients text[] not null,
  home_count integer not null default 0,
  unique (client_id, tour_date)
);

create index if not exists tour_recaps_client_idx on tour_recaps (client_id, tour_date desc);

alter table tour_recaps enable row level security;

-- Readable so the agent's Homes Seen tab can stop offering a recap once one
-- has gone out. Written only by the send path, with the service-role key.
drop policy if exists tour_recaps_select on tour_recaps;
create policy tour_recaps_select on tour_recaps
  for select to authenticated
  using (client_id = auth.uid() or is_agent_of(client_id));

grant select on tour_recaps to authenticated;

-- Keep the full extent of a client removal readable in one place.
create or replace function agent_delete_client_data(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_agent_of(p_client_id) then
    raise exception 'not authorized';
  end if;

  if (select is_agent from profiles where id = p_client_id) then
    raise exception 'cannot delete an agent profile';
  end if;

  delete from tour_recaps where client_id = p_client_id;
  delete from tour_reminders where client_id = p_client_id;
  delete from client_page_views where client_id = p_client_id;

  delete from inspection_items
  where transaction_id in (select id from transactions where client_id = p_client_id);

  delete from tours where client_id = p_client_id;
  delete from homes_seen where client_id = p_client_id;
  delete from preapproval where client_id = p_client_id;

  update transactions set linked_transaction_id = null
  where client_id = p_client_id
     or linked_transaction_id in (select id from transactions where client_id = p_client_id);

  delete from transactions where client_id = p_client_id;
  delete from profiles where id = p_client_id;
end;
$$;

grant execute on function agent_delete_client_data(uuid) to authenticated;
