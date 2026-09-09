-- Visit tracking for the discovery-phase retention metric in strategy.md
-- ("median 2+ visits per week per client while a transaction is active").
--
-- Supabase only keeps auth.users.last_sign_in_at — a single overwritten
-- timestamp — so without this there is no visit history and none can be
-- reconstructed afterwards.
--
-- What's stored is raw page views, not visits. A "visit" is a judgment
-- call (how long a gap starts a new one?), and baking that definition
-- into the write path would make it unchangeable later; collapsing views
-- into visits at read time keeps the definition revisable against data
-- already collected.

create table client_page_views (
  id bigint generated always as identity primary key,
  client_id uuid not null references profiles (id) on delete cascade,
  path text not null,
  viewed_at timestamptz not null default now()
);

create index client_page_views_client_time_idx
  on client_page_views (client_id, viewed_at desc);

alter table client_page_views enable row level security;

create policy client_page_views_select on client_page_views
  for select to authenticated
  using (client_id = auth.uid() or is_agent_of(client_id));

-- Read-only through the table; the insert path is the function below, so a
-- client session can't write a row for anyone but themselves.
grant select on client_page_views to authenticated;

-- The second client-side write in the app, alongside update_my_partner.
-- Scoped to auth.uid() — there is no way to record a view for someone else.
create or replace function record_my_page_view(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  -- The agent browsing is not a client visit. Silent rather than an error:
  -- this is called from a layout on every page, and an agent should never
  -- see a failure from it.
  if current_user_is_agent() then
    return;
  end if;

  insert into client_page_views (client_id, path)
  values (auth.uid(), left(coalesce(p_path, ''), 200));
end;
$$;

grant execute on function record_my_page_view(text) to authenticated;

-- Redefined from 0007 to clear page views explicitly. The FK cascades on
-- profile delete anyway, but the function is where the full extent of a
-- client removal is meant to be readable in one place.
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
