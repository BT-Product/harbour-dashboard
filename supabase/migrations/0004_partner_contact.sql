-- Lets a client store a spouse/partner contact (name + email) on their own
-- profile. Display-only contact info for now — no login/shared access.

alter table profiles add column partner_name text;
alter table profiles add column partner_email text;

-- SECURITY DEFINER so we don't need a general UPDATE grant/policy on
-- profiles (which has no write path today): this function only ever
-- touches the two partner columns, and only on the caller's own row.
create or replace function update_my_partner(p_partner_name text, p_partner_email text)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result profiles;
begin
  update profiles
  set partner_name = nullif(trim(p_partner_name), ''),
      partner_email = nullif(trim(p_partner_email), '')
  where id = auth.uid()
  returning * into result;

  if result is null then
    raise exception 'not authorized';
  end if;

  return result;
end;
$$;

grant execute on function update_my_partner(text, text) to authenticated;
