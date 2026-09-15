-- An agent profile page: one place for the agent's own details.
--
-- License number and phone were edited from a card on the agent's home page,
-- and phone from a client's escrow card too. As more agent information
-- accumulates — photo, office address, and later whatever the brokerage
-- requires — it needs a home of its own. This adds the two new fields and the
-- storage for the photo.
--
-- Neither new field is shown to clients yet. Where a client sees their agent's
-- photo (a "your agent" card, an email signature) changes every client's
-- experience and is a separate decision. The office address will matter for
-- marketing email, which must carry a physical postal address.

alter table agents
  add column if not exists office_address text,
  add column if not exists photo_url text;

comment on column agents.office_address is
  'The agent''s office postal address, free text. Not yet shown to clients; intended as the physical address marketing email requires.';
comment on column agents.photo_url is
  'Public URL of the agent''s photo in the agent-photos storage bucket, under the agent''s own folder. Written only through agent_update_my_photo.';

-- Profile fields in one call from the profile page. Scoped to the caller's own
-- agent row; no parameter names an agent.
create or replace function agent_update_my_profile(
  p_phone text,
  p_dre_number text,
  p_office_address text
)
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
  set phone = nullif(btrim(p_phone), ''),
      dre_number = nullif(btrim(p_dre_number), ''),
      office_address = nullif(btrim(p_office_address), '')
  where id = current_agent_id()
  returning * into result;

  return result;
end;
$$;

grant execute on function agent_update_my_profile(text, text, text) to authenticated;

-- The photo URL must point into the caller's own folder of the agent-photos
-- bucket. Without that check any URL could be stored — and the day photos are
-- shown to clients, an arbitrary image or tracking pixel would be too.
create or replace function agent_update_my_photo(p_photo_url text)
returns agents
language plpgsql
security definer
set search_path = public
as $$
declare
  result agents;
  agent uuid;
begin
  if not current_user_is_agent() then
    raise exception 'not authorized';
  end if;

  agent := current_agent_id();

  if p_photo_url is not null
     and position('/storage/v1/object/public/agent-photos/' || agent::text || '/' in p_photo_url) = 0 then
    raise exception 'photo must be uploaded to your own profile folder';
  end if;

  update agents
  set photo_url = p_photo_url
  where id = agent
  returning * into result;

  return result;
end;
$$;

grant execute on function agent_update_my_photo(text) to authenticated;

-- Public bucket: an agent photo is meant to be seen, and a public URL is
-- what an email client or <img> can load. Size and type are capped by the
-- bucket itself, not only by the upload form.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agent-photos', 'agent-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Writes only into the first folder named for the caller's own agent id.
-- Select is needed as well: an upsert checks whether the object exists.
drop policy if exists agent_photos_select on storage.objects;
create policy agent_photos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'agent-photos'
    and public.current_user_is_agent()
    and (storage.foldername(name))[1] = public.current_agent_id()::text
  );

drop policy if exists agent_photos_insert on storage.objects;
create policy agent_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'agent-photos'
    and public.current_user_is_agent()
    and (storage.foldername(name))[1] = public.current_agent_id()::text
  );

drop policy if exists agent_photos_update on storage.objects;
create policy agent_photos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'agent-photos'
    and public.current_user_is_agent()
    and (storage.foldername(name))[1] = public.current_agent_id()::text
  )
  with check (
    bucket_id = 'agent-photos'
    and public.current_user_is_agent()
    and (storage.foldername(name))[1] = public.current_agent_id()::text
  );

drop policy if exists agent_photos_delete on storage.objects;
create policy agent_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'agent-photos'
    and public.current_user_is_agent()
    and (storage.foldername(name))[1] = public.current_agent_id()::text
  );
