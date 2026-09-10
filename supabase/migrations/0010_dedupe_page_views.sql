-- Collapse repeat views of the same page inside a short window.
--
-- React Strict Mode remounts a component once on first mount in dev, which
-- wrote two rows a second apart. Production doesn't do that, but a refresh
-- or a double-tapped nav link would, and "pages opened this week" is meant
-- to describe what a client looked at, not how many times the page mounted.
-- Visits are unaffected either way (30-minute gap rule), so this only
-- protects the finer-grained number.

create or replace function record_my_page_view(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_path text;
begin
  if auth.uid() is null then
    return;
  end if;

  if current_user_is_agent() then
    return;
  end if;

  clean_path := left(coalesce(p_path, ''), 200);

  if exists (
    select 1 from client_page_views
    where client_id = auth.uid()
      and path = clean_path
      and viewed_at > now() - interval '30 seconds'
  ) then
    return;
  end if;

  insert into client_page_views (client_id, path)
  values (auth.uid(), clean_path);
end;
$$;

grant execute on function record_my_page_view(text) to authenticated;
