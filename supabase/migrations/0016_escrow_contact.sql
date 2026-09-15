-- Who the client should call before wiring money.
--
-- The first wire-fraud warning (0015 and WireFraudNotice) told clients "we
-- will never email you wiring instructions". That is not how escrow works:
-- escrow emails the client a link to a secure portal, and the instructions
-- are inside it. A client warned that such emails don't exist either
-- distrusts the real one — delaying closing — or learns the warning is wrong
-- and discounts the rest of it.
--
-- The fix is to tell the client *who* their escrow is and, above all, give
-- them a number to call. Names alone protect no one: attackers reuse real
-- officers' names and lookalike domains, and fake portal links are among the
-- most common lures. The protective element is a phone number the client did
-- not get from email — and this dashboard is an unusually good place for it,
-- because it sits behind a login on a channel separate from the client's
-- inbox. Someone who has compromised the client's email, or the agent's,
-- cannot change what it shows.
--
-- Deliberately no escrow email column. Displaying an address invites the
-- client to verify by email, which is the channel being attacked.

alter table transactions
  add column if not exists escrow_company text,
  add column if not exists escrow_officer text,
  add column if not exists escrow_phone text;

comment on column transactions.escrow_phone is
  'The escrow officer''s number, shown to the client as the one to call before wiring. Should be sourced from the escrow company''s website or the agent''s own contacts, never copied from an email — a number lifted from a spoofed email relays the fraud.';

-- The agent's own number, so the warning can say who to call if anything
-- looks wrong. It lived only on the agent's profile, which clients cannot
-- read — and in production it was empty, so tour reminders had been going
-- out signed without a phone number. The agents row is already readable by
-- that agent's clients (agents_select_own), which makes it the right home
-- for a business contact number.
alter table agents
  add column if not exists phone text;

update agents a
set phone = p.phone
from profiles p
where p.agent_id = a.id
  and p.is_agent
  and p.phone is not null
  and a.phone is null;

create or replace function agent_update_escrow_contact(
  p_transaction_id uuid,
  p_company text,
  p_officer text,
  p_phone text
)
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
  set escrow_company = nullif(btrim(p_company), ''),
      escrow_officer = nullif(btrim(p_officer), ''),
      escrow_phone = nullif(btrim(p_phone), '')
  where id = p_transaction_id
  returning * into result;

  return result;
end;
$$;

grant execute on function agent_update_escrow_contact(uuid, text, text, text) to authenticated;

-- Scoped to the caller's own agent row; there is no parameter naming which
-- agent, so one agent can never set another's number.
create or replace function agent_update_my_phone(p_phone text)
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
  set phone = nullif(btrim(p_phone), '')
  where id = current_agent_id()
  returning * into result;

  return result;
end;
$$;

grant execute on function agent_update_my_phone(text) to authenticated;
