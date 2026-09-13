-- Down payment assistance as a first-class part of a pre-approval.
--
-- California DPA programs (CalHFA MyHome, Dream For All, city and county
-- equivalents) cover the down payment with a second loan rather than the
-- buyer's savings. The model here had only `down_payment`, which means
-- cash the buyer brings — so a client using assistance showed a max price
-- equal to their first loan, understating what they can actually offer by
-- the assistance amount.
--
-- Stored as a percentage of purchase price, because that is how the
-- programs are written (3%, 3.5%) and because the dollar amount depends on
-- the price of the home being considered, which is exactly what the
-- affordability tool solves for.
alter table preapproval
  add column if not exists assistance_percent numeric(5, 3) not null default 0,
  add column if not exists assistance_deferred boolean not null default false;

comment on column preapproval.assistance_percent is
  'Down payment assistance as a percent of purchase price. The approved loan_amount is the FIRST loan only, and for a non-deferred program the lender has already reduced it to absorb the second loan payment.';

comment on column preapproval.assistance_deferred is
  'True when the assistance requires no monthly payment until sale or refinance. Drives disclosure copy, not the arithmetic: either way loan_amount is what the lender approved given the program.';

drop function if exists agent_upsert_preapproval(uuid, numeric, numeric, numeric, text, numeric);

create or replace function agent_upsert_preapproval(
  p_client_id uuid,
  p_loan_amount numeric,
  p_down_payment numeric,
  p_rate numeric,
  p_lender text,
  p_hoa_monthly numeric,
  p_assistance_percent numeric,
  p_assistance_deferred boolean
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
    client_id, loan_amount, down_payment, rate, lender, hoa_monthly,
    assistance_percent, assistance_deferred, updated_at
  )
  values (
    p_client_id,
    p_loan_amount,
    p_down_payment,
    p_rate,
    nullif(btrim(p_lender), ''),
    coalesce(p_hoa_monthly, 0),
    coalesce(p_assistance_percent, 0),
    coalesce(p_assistance_deferred, false),
    now()
  )
  on conflict (client_id) do update
    set loan_amount = excluded.loan_amount,
        down_payment = excluded.down_payment,
        rate = excluded.rate,
        lender = excluded.lender,
        hoa_monthly = excluded.hoa_monthly,
        assistance_percent = excluded.assistance_percent,
        assistance_deferred = excluded.assistance_deferred,
        updated_at = now()
  returning * into result;

  return result;
end;
$$;

grant execute on function agent_upsert_preapproval(uuid, numeric, numeric, numeric, text, numeric, numeric, boolean) to authenticated;
