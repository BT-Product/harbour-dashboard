-- Agent write paths for the per-client management page: editing key
-- dates, and full CRUD on tours and inspection_items. Same pattern as
-- the existing agent_* functions — SECURITY DEFINER, authorization
-- re-derived from auth.uid() server-side, never trust the caller.

create or replace function agent_update_key_dates(p_transaction_id uuid, p_key_dates jsonb)
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
  set key_dates = p_key_dates
  where id = p_transaction_id
  returning * into result;

  return result;
end;
$$;

grant execute on function agent_update_key_dates(uuid, jsonb) to authenticated;

create or replace function agent_upsert_tour(
  p_tour_id uuid,
  p_client_id uuid,
  p_address text,
  p_scheduled_at timestamptz,
  p_notes text
)
returns tours
language plpgsql
security definer
set search_path = public
as $$
declare
  result tours;
begin
  if not is_agent_of(p_client_id) then
    raise exception 'not authorized';
  end if;

  if p_tour_id is null then
    insert into tours (client_id, address, scheduled_at, notes)
    values (p_client_id, p_address, p_scheduled_at, p_notes)
    returning * into result;
  else
    update tours
    set address = p_address,
        scheduled_at = p_scheduled_at,
        notes = p_notes
    where id = p_tour_id and client_id = p_client_id
    returning * into result;
  end if;

  return result;
end;
$$;

grant execute on function agent_upsert_tour(uuid, uuid, text, timestamptz, text) to authenticated;

create or replace function agent_delete_tour(p_tour_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_client_id uuid;
begin
  select client_id into target_client_id from tours where id = p_tour_id;

  if target_client_id is null or not is_agent_of(target_client_id) then
    raise exception 'not authorized';
  end if;

  delete from tours where id = p_tour_id;
end;
$$;

grant execute on function agent_delete_tour(uuid) to authenticated;

create or replace function agent_upsert_inspection_item(
  p_item_id uuid,
  p_transaction_id uuid,
  p_item text,
  p_importance item_importance,
  p_negotiation_note text,
  p_resolved boolean
)
returns inspection_items
language plpgsql
security definer
set search_path = public
as $$
declare
  result inspection_items;
  target_client_id uuid;
begin
  select client_id into target_client_id from transactions where id = p_transaction_id;

  if target_client_id is null or not is_agent_of(target_client_id) then
    raise exception 'not authorized';
  end if;

  if p_item_id is null then
    insert into inspection_items (transaction_id, item, importance_to_client, negotiation_note, resolved)
    values (p_transaction_id, p_item, p_importance, p_negotiation_note, p_resolved)
    returning * into result;
  else
    update inspection_items
    set item = p_item,
        importance_to_client = p_importance,
        negotiation_note = p_negotiation_note,
        resolved = p_resolved
    where id = p_item_id and transaction_id = p_transaction_id
    returning * into result;
  end if;

  return result;
end;
$$;

grant execute on function agent_upsert_inspection_item(uuid, uuid, text, item_importance, text, boolean) to authenticated;

create or replace function agent_delete_inspection_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_transaction_id uuid;
  target_client_id uuid;
begin
  select transaction_id into target_transaction_id from inspection_items where id = p_item_id;
  select client_id into target_client_id from transactions where id = target_transaction_id;

  if target_client_id is null or not is_agent_of(target_client_id) then
    raise exception 'not authorized';
  end if;

  delete from inspection_items where id = p_item_id;
end;
$$;

grant execute on function agent_delete_inspection_item(uuid) to authenticated;
