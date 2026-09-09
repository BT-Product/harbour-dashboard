-- Creating a transaction from the agent UI. Same pattern as the other
-- agent_* functions — SECURITY DEFINER, authorization re-derived from
-- auth.uid() server-side. agent_id is taken from current_agent_id()
-- rather than the caller, so a transaction can never be filed under a
-- tenant the caller doesn't belong to.

create or replace function agent_create_transaction(
  p_client_id uuid,
  p_type transaction_type,
  p_property_address text,
  p_stage_key text,
  p_link_to_transaction_id uuid
)
returns transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  result transactions;
  resolved_stage_key text;
  link_row transactions;
begin
  if not is_agent_of(p_client_id) then
    raise exception 'not authorized';
  end if;

  if coalesce(btrim(p_property_address), '') = '' then
    raise exception 'property address is required';
  end if;

  -- Null stage means "start at the beginning". A stage can be passed to
  -- open a transaction mid-flight, which is the normal case when an
  -- already-in-escrow client is onboarded onto Harbour.
  if p_stage_key is null then
    select stage_key into resolved_stage_key
    from stage_definitions
    where transaction_type = p_type
    order by sort_order
    limit 1;
  else
    select stage_key into resolved_stage_key
    from stage_definitions
    where transaction_type = p_type and stage_key = p_stage_key;
  end if;

  if resolved_stage_key is null then
    raise exception 'no stage % defined for a % transaction', p_stage_key, p_type;
  end if;

  -- The other leg of a move-up buyer. Must be the same client's and the
  -- opposite side. The coordination view resolves the link by following
  -- linked_transaction_id from whichever leg it starts on, so both rows
  -- get pointed at each other.
  if p_link_to_transaction_id is not null then
    select * into link_row
    from transactions
    where id = p_link_to_transaction_id
      and client_id = p_client_id
      and type <> p_type;

    if link_row.id is null then
      raise exception 'cannot link to that transaction';
    end if;
  end if;

  insert into transactions (
    client_id, agent_id, type, current_stage_key, property_address, linked_transaction_id
  )
  values (
    p_client_id,
    current_agent_id(),
    p_type,
    resolved_stage_key,
    btrim(p_property_address),
    link_row.id
  )
  returning * into result;

  if link_row.id is not null then
    update transactions set linked_transaction_id = result.id where id = link_row.id;
  end if;

  return result;
end;
$$;

grant execute on function agent_create_transaction(uuid, transaction_type, text, text, uuid) to authenticated;
