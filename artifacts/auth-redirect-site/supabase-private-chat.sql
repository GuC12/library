-- Apply with the matching client: attachments store paths, never signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-photos', 'chat-photos', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read chat photos" on storage.objects;
drop policy if exists "Chat participants read photos" on storage.objects;
drop policy if exists "Users upload their own chat photos" on storage.objects;
drop policy if exists "Users update their own chat photos" on storage.objects;

-- New paths: sender/receiver/random-file. Existing sender/file attachments are
-- readable to their sender and the recipients of existing messages only.
create policy "Chat participants read photos" on storage.objects for select to authenticated
using (bucket_id = 'chat-photos' and (
  (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  or (storage.foldername(name))[2] = (select auth.jwt() ->> 'sub')
  or exists (select 1 from public.chat_messages m
    where m.receiver_id = (select auth.jwt() ->> 'sub')
      and (m.attachment_url = 'chat-photos/' || name
        or split_part(m.attachment_url, '/storage/v1/object/public/chat-photos/', 2) = name
        or split_part(m.body, '/storage/v1/object/public/chat-photos/', 2) = name))
));
create policy "Users upload their own chat photos" on storage.objects for insert to authenticated
with check (bucket_id = 'chat-photos'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  and array_length(storage.foldername(name), 1) = 2
  and exists (select 1 from public.friendships f where f.user_id = (select auth.jwt() ->> 'sub')
    and f.friend_id = (storage.foldername(name))[2] and f.status = 'accepted'));

-- Prevent a sender from borrowing another user's file path to grant themselves
-- access through a forged message. Existing attachments survive text edits.
create or replace function public.validate_chat_attachment()
returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and new.attachment_url is not distinct from old.attachment_url
    and new.body is not distinct from old.body then return new; end if;
  if TG_OP = 'UPDATE' and new.attachment_url is not distinct from old.attachment_url
    and new.body not like '%/storage/v1/object/%' then return new; end if;
  if new.attachment_url is not null and not starts_with(new.attachment_url,
    'chat-photos/' || new.sender_id || '/' || new.receiver_id || '/') then
    raise exception 'Invalid attachment path';
  end if;
  if new.body like '%/storage/v1/object/%' then
    raise exception 'Use a private attachment instead of a storage URL';
  end if;
  return new;
end $$;
drop trigger if exists validate_chat_attachment on public.chat_messages;
create trigger validate_chat_attachment before insert or update on public.chat_messages
for each row execute function public.validate_chat_attachment();
