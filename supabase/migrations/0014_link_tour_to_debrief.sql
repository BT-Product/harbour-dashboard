-- A tour that has happened is a home seen, waiting on a debrief.
--
-- `tours.home_seen_id` has existed since the initial schema and was never
-- populated: nothing in the app ever connected a scheduled showing to the
-- debrief written after it. The visible symptom was that a tour whose time
-- had passed simply dropped out of Upcoming Tours and appeared nowhere else
-- — the address had to be retyped into a fresh debrief from memory, and a
-- showing nobody had got to was indistinguishable from one already written
-- up.
--
-- Which tours still need a debrief is derived at read time rather than
-- materialised by a scheduled job, the same way client_page_views collapses
-- into visits. The reason is that homes_seen is client-readable: creating a
-- row the moment a tour's start time passed would put a blank entry on the
-- client's own Homes Seen page for a showing that may have been cancelled,
-- rescheduled, or simply not reached.

create or replace function agent_link_tour_to_home(p_tour_id uuid, p_home_id uuid)
returns tours
language plpgsql
security definer
set search_path = public
as $$
declare
  result tours;
  tour_client_id uuid;
  home_client_id uuid;
begin
  select client_id into tour_client_id from tours where id = p_tour_id;
  select client_id into home_client_id from homes_seen where id = p_home_id;

  if tour_client_id is null or home_client_id is null then
    raise exception 'tour or home not found';
  end if;

  -- Authorization is re-derived from the rows themselves, never from what
  -- the caller claims, in line with every other agent_* function here.
  if not is_agent_of(tour_client_id) then
    raise exception 'not authorized';
  end if;

  -- A link across two different clients would leak one client's debrief
  -- onto another's tour, so it is rejected rather than silently ignored.
  if tour_client_id <> home_client_id then
    raise exception 'tour and home belong to different clients';
  end if;

  update tours
  set home_seen_id = p_home_id
  where id = p_tour_id
  returning * into result;

  return result;
end;
$$;

grant execute on function agent_link_tour_to_home(uuid, uuid) to authenticated;

comment on column tours.home_seen_id is
  'Set when a debrief is written from this tour. A past tour with a null link is what the agent UI lists as still needing a debrief; matching address and date is only a fallback for tours that predate this link.';
