-- A buyer exists before there's a property.
--
-- The buy sequence started at 'offer_accepted', which assumed every buyer
-- arrives already in contract. Most don't: they tour for weeks first, and
-- that's exactly the window where tours and debriefs — the things this
-- product is actually about — are happening. Until now the only way to give
-- such a client a dashboard was to invent an address and a stage that
-- hadn't happened yet.

-- Some stages have no property attached. Data-driven rather than a hardcoded
-- stage key, so the rule stays visible to the UI and to the create function.
alter table stage_definitions
  add column if not exists requires_property boolean not null default true;

-- sort_order 0 rather than renumbering: this genuinely precedes the
-- existing first stage, and the column is only ever used for ordering.
insert into stage_definitions (stage_key, transaction_type, sort_order, label, explainer, requires_property) values
  ('house_hunting', 'buy', 0, 'House Hunting',
   'You''re out looking at homes. Tours you have scheduled and notes from homes you''ve already seen show up here as we go. When an offer is accepted, this moves to the next stage.',
   false)
on conflict (transaction_type, stage_key) do nothing;

-- A house-hunting buyer has no address yet.
alter table transactions alter column property_address drop not null;

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
  resolved_stage stage_definitions;
  link_row transactions;
  clean_address text;
begin
  if not is_agent_of(p_client_id) then
    raise exception 'not authorized';
  end if;

  if p_stage_key is null then
    select * into resolved_stage
    from stage_definitions
    where transaction_type = p_type
    order by sort_order
    limit 1;
  else
    select * into resolved_stage
    from stage_definitions
    where transaction_type = p_type and stage_key = p_stage_key;
  end if;

  if resolved_stage.stage_key is null then
    raise exception 'no stage % defined for a % transaction', p_stage_key, p_type;
  end if;

  clean_address := nullif(btrim(coalesce(p_property_address, '')), '');

  if clean_address is null and resolved_stage.requires_property then
    raise exception 'property address is required at the % stage', resolved_stage.label;
  end if;

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
    resolved_stage.stage_key,
    clean_address,
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

-- Sets up a newly invited client in one transaction. Doing both legs here
-- rather than as two calls from the app means a move-up client can't end up
-- half-created — one leg saved, the other failed, and no link between them.
create or replace function agent_onboard_client(
  p_client_id uuid,
  p_buying boolean,
  p_selling boolean,
  p_buy_stage_key text,
  p_buy_address text,
  p_sell_stage_key text,
  p_sell_address text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sell_txn transactions;
begin
  if not is_agent_of(p_client_id) then
    raise exception 'not authorized';
  end if;

  if not p_buying and not p_selling then
    raise exception 'a client has to be buying, selling, or both';
  end if;

  -- Sell first so the buy leg can be linked to it on creation.
  if p_selling then
    sell_txn := agent_create_transaction(
      p_client_id, 'sell', p_sell_address, p_sell_stage_key, null
    );
  end if;

  if p_buying then
    perform agent_create_transaction(
      p_client_id, 'buy', p_buy_address, coalesce(p_buy_stage_key, 'house_hunting'), sell_txn.id
    );
  end if;
end;
$$;

grant execute on function agent_onboard_client(uuid, boolean, boolean, text, text, text, text) to authenticated;
