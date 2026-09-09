-- Pre-approval editing and client add/remove from the agent UI.
--
-- Adding a client can't live entirely here: creating the auth.users row
-- goes through Supabase's Admin API (invite-by-email, so the client sets
-- their own password) from a server action that checks the caller is an
-- agent before it touches the service-role key. Removing a client is
-- split the same way — this function deletes every app row the client
-- owns in one transaction, and the server action deletes the auth user
-- afterwards.

-- The client dashboard reads a client's pre-approval with maybeSingle(),
-- and the affordability calculator assumes one set of numbers. Make that
-- assumption real so the upsert below has something to conflict on.
create unique index if not exists preapproval_client_id_key on preapproval (client_id);

create or replace function agent_upsert_preapproval(
  p_client_id uuid,
  p_loan_amount numeric,
  p_down_payment numeric,
  p_rate numeric,
  p_lender text,
  p_hoa_monthly numeric
)
returns preapproval
language plpgsql
security definer
set search_path = public
as $$
declare
  result preapproval;
begin
  if not is_agent_of(p_client_id) then
    raise exception 'not authorized';
  end if;

  insert into preapproval (client_id, loan_amount, down_payment, rate, lender, hoa_monthly, updated_at)
  values (
    p_client_id,
    p_loan_amount,
    p_down_payment,
    p_rate,
    nullif(btrim(p_lender), ''),
    coalesce(p_hoa_monthly, 0),
    now()
  )
  on conflict (client_id) do update
    set loan_amount = excluded.loan_amount,
        down_payment = excluded.down_payment,
        rate = excluded.rate,
        lender = excluded.lender,
        hoa_monthly = excluded.hoa_monthly,
        updated_at = now()
  returning * into result;

  return result;
end;
$$;

grant execute on function agent_upsert_preapproval(uuid, numeric, numeric, numeric, text, numeric) to authenticated;

create or replace function agent_delete_preapproval(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_agent_of(p_client_id) then
    raise exception 'not authorized';
  end if;

  delete from preapproval where client_id = p_client_id;
end;
$$;

grant execute on function agent_delete_preapproval(uuid) to authenticated;

-- Everything a client owns, deleted in FK order in one transaction. The
-- auth.users row is deliberately left to the caller's Admin API call:
-- deleting it here would cascade profiles away and strand the rest.
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

  -- is_agent_of() is true for the agent's own profile too (same tenant), so
  -- without this an agent could delete themselves out of the app.
  if (select is_agent from profiles where id = p_client_id) then
    raise exception 'cannot delete an agent profile';
  end if;

  delete from inspection_items
  where transaction_id in (select id from transactions where client_id = p_client_id);

  delete from tours where client_id = p_client_id;
  delete from homes_seen where client_id = p_client_id;
  delete from preapproval where client_id = p_client_id;

  -- transactions.linked_transaction_id points at another transactions row,
  -- so the pair has to be unlinked before either can be deleted. Clearing
  -- inbound links too covers a link left behind by a partly-deleted pair.
  update transactions set linked_transaction_id = null
  where client_id = p_client_id
     or linked_transaction_id in (select id from transactions where client_id = p_client_id);

  delete from transactions where client_id = p_client_id;
  delete from profiles where id = p_client_id;
end;
$$;

grant execute on function agent_delete_client_data(uuid) to authenticated;
