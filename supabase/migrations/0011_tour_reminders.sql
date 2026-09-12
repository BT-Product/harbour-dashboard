-- Day-before tour reminders.
--
-- One row per client per tour date, not per tour stop: a tour is an outing
-- of five or six addresses on one day, and the client gets one email
-- listing all of them. The unique constraint is what makes the send
-- idempotent — a cron retry, a double invocation, or a manual re-run can't
-- email the same client twice for the same day.

create table tour_reminders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  tour_date date not null,
  sent_at timestamptz not null default now(),
  -- Who it actually went to, including the partner when one is on file.
  recipients text[] not null,
  stop_count integer not null default 0,
  unique (client_id, tour_date)
);

create index tour_reminders_client_idx on tour_reminders (client_id, tour_date desc);

alter table tour_reminders enable row level security;

-- Readable so the agent can see a reminder already went out before texting
-- the client about the same tour. Writes only happen from the cron route
-- with the service-role key.
create policy tour_reminders_select on tour_reminders
  for select to authenticated
  using (client_id = auth.uid() or is_agent_of(client_id));

grant select on tour_reminders to authenticated;

-- Keep the full extent of a client removal readable in one place. The FK
-- cascades on profile delete anyway.
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
