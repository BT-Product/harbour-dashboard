-- A pre-approval is what the lender's letter says, not a model of it.
--
-- The table had grown into a small mortgage model: loan amount, cash down,
-- rate, HOA, assistance percentage, deferred flag — from which the app
-- derived a purchase price. That derivation is the problem. A lender hands
-- the agent three facts (purchase price, percent down, loan type), and the
-- client should see that price, not a number this app recalculated. When
-- the two disagree, the app is wrong by definition.
--
-- Old columns are kept for now rather than dropped: `rate` still powers the
-- HOA estimate, and nothing should be destroyed before that question is
-- settled.
alter table preapproval
  add column if not exists purchase_price numeric(12, 2),
  add column if not exists percent_down numeric(5, 2) not null default 0,
  add column if not exists loan_type text;

comment on column preapproval.purchase_price is
  'The pre-approved purchase price exactly as the lender stated it. Displayed to the client verbatim — never recomputed from loan amount, down payment or assistance.';

comment on column preapproval.percent_down is
  'Percent down as stated on the pre-approval letter.';

comment on column preapproval.loan_type is
  'Conventional, FHA, VA, CalHFA, etc. — as written on the letter.';

-- Backfill from what is already there: the old model's purchase price was
-- loan + cash down, which is right for the rows that predate assistance.
update preapproval
set purchase_price = coalesce(purchase_price, loan_amount + down_payment)
where purchase_price is null;

create or replace function agent_upsert_preapproval(
  p_client_id uuid,
  p_purchase_price numeric,
  p_percent_down numeric,
  p_loan_type text,
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

  insert into preapproval (
    client_id, purchase_price, percent_down, loan_type, rate, lender, hoa_monthly,
    loan_amount, down_payment, updated_at
  )
  values (
    p_client_id,
    p_purchase_price,
    coalesce(p_percent_down, 0),
    nullif(btrim(p_loan_type), ''),
    p_rate,
    nullif(btrim(p_lender), ''),
    coalesce(p_hoa_monthly, 0),
    -- Legacy not-null columns, derived so old rows stay readable. Nothing
    -- shown to a client reads them any more.
    p_purchase_price * (1 - coalesce(p_percent_down, 0) / 100),
    p_purchase_price * (coalesce(p_percent_down, 0) / 100),
    now()
  )
  on conflict (client_id) do update
    set purchase_price = excluded.purchase_price,
        percent_down = excluded.percent_down,
        loan_type = excluded.loan_type,
        rate = excluded.rate,
        lender = excluded.lender,
        hoa_monthly = excluded.hoa_monthly,
        loan_amount = excluded.loan_amount,
        down_payment = excluded.down_payment,
        updated_at = now()
  returning * into result;

  return result;
end;
$$;

grant execute on function agent_upsert_preapproval(uuid, numeric, numeric, text, numeric, text, numeric) to authenticated;

drop function if exists agent_upsert_preapproval(uuid, numeric, numeric, numeric, text, numeric, numeric, boolean);
