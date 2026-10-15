-- Apply in Supabase SQL Editor after Clerk's third-party JWT integration is enabled.
-- This migration removes broad legacy RLS policies and limits account writes to
-- the Clerk subject in the verified JWT. Public catalogue/profile reads remain.
begin;

do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('user_profiles', 'chat_messages', 'book_likes', 'reader_stats', 'friendships', 'friend_reading_lists', 'community_books')
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Keep public chat-photo viewing for existing image URLs, but only let a user
-- upload, replace, or remove files inside their own Clerk-id folder.
drop policy if exists "Users can upload chat photos" on storage.objects;
drop policy if exists "Users can update chat photos" on storage.objects;
drop policy if exists "Users can delete chat photos" on storage.objects;
drop policy if exists "Users upload their own chat photos" on storage.objects;
drop policy if exists "Users update their own chat photos" on storage.objects;
drop policy if exists "Users delete their own chat photos" on storage.objects;
create policy "Users upload their own chat photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-photos' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));
create policy "Users update their own chat photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'chat-photos' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'))
  with check (bucket_id = 'chat-photos' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));
create policy "Users delete their own chat photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat-photos' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));

alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from anon, authenticated;
grant select on public.user_profiles to anon, authenticated;
grant insert, update, delete on public.user_profiles to authenticated;
create policy "Public profiles are readable" on public.user_profiles
  for select to anon, authenticated using (true);
create policy "Users manage their own profile" on public.user_profiles
  for all to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'))
  with check (user_id = (select auth.jwt() ->> 'sub'));

alter table public.reader_stats enable row level security;
revoke all on public.reader_stats from anon, authenticated;
grant select on public.reader_stats to anon, authenticated;
grant insert, update on public.reader_stats to authenticated;
create policy "Leaderboard is readable" on public.reader_stats
  for select to anon, authenticated using (true);
create policy "Readers manage their own stats" on public.reader_stats
  for all to authenticated
  using (id = (select auth.jwt() ->> 'sub'))
  with check (id = (select auth.jwt() ->> 'sub'));

alter table public.book_likes enable row level security;
revoke all on public.book_likes from anon, authenticated;
grant select on public.book_likes to anon, authenticated;
grant insert, delete on public.book_likes to authenticated;
create policy "Book like counts are readable" on public.book_likes
  for select to anon, authenticated using (true);
create policy "Readers manage their own likes" on public.book_likes
  for all to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'))
  with check (user_id = (select auth.jwt() ->> 'sub'));

alter table public.chat_messages enable row level security;
revoke all on public.chat_messages from anon, authenticated;
grant select, insert, update, delete on public.chat_messages to authenticated;
create policy "Chat participants read messages" on public.chat_messages
  for select to authenticated
  using (sender_id = (select auth.jwt() ->> 'sub') or receiver_id = (select auth.jwt() ->> 'sub'));
create policy "Friends send messages as themselves" on public.chat_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.jwt() ->> 'sub')
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.user_id = sender_id and f.friend_id = receiver_id)
          or (f.friend_id = sender_id and f.user_id = receiver_id))
    )
  );
create policy "Senders edit their own messages" on public.chat_messages
  for update to authenticated
  using (sender_id = (select auth.jwt() ->> 'sub'))
  with check (sender_id = (select auth.jwt() ->> 'sub'));
create policy "Participants delete messages" on public.chat_messages
  for delete to authenticated
  using (sender_id = (select auth.jwt() ->> 'sub') or receiver_id = (select auth.jwt() ->> 'sub'));

create or replace function public.keep_chat_message_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sender_id is distinct from old.sender_id
    or new.receiver_id is distinct from old.receiver_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Message participants and timestamp cannot be changed';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_chat_message_identity on public.chat_messages;
create trigger protect_chat_message_identity
  before update on public.chat_messages
  for each row execute function public.keep_chat_message_identity();

alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;
grant select, insert, delete on public.friendships to authenticated;
grant usage on sequence public.friendships_id_seq, public.chat_messages_id_seq to authenticated;
create policy "Friend participants read relationships" on public.friendships
  for select to authenticated
  using (user_id = (select auth.jwt() ->> 'sub') or friend_id = (select auth.jwt() ->> 'sub'));
create policy "Users create requests as themselves" on public.friendships
  for insert to authenticated
  with check (user_id = (select auth.jwt() ->> 'sub') and status = 'pending');
create policy "Friend participants remove relationships" on public.friendships
  for delete to authenticated
  using (user_id = (select auth.jwt() ->> 'sub') or friend_id = (select auth.jwt() ->> 'sub'));

-- Reading lists are visible only to their owner and accepted friends.
do $$
begin
  if to_regclass('public.friend_reading_lists') is not null then
    alter table public.friend_reading_lists enable row level security;
    revoke all on public.friend_reading_lists from anon, authenticated;
    grant select, insert, update, delete on public.friend_reading_lists to authenticated;
    execute 'create policy "Owners and accepted friends read lists" on public.friend_reading_lists for select to authenticated using (owner_id = (select auth.jwt() ->> ''sub'') or exists (select 1 from public.friendships f where f.status = ''accepted'' and ((f.user_id = owner_id and f.friend_id = (select auth.jwt() ->> ''sub'')) or (f.friend_id = owner_id and f.user_id = (select auth.jwt() ->> ''sub'')))))';
    execute 'create policy "Owners insert reading lists" on public.friend_reading_lists for insert to authenticated with check (owner_id = (select auth.jwt() ->> ''sub''))';
    execute 'create policy "Owners update reading lists" on public.friend_reading_lists for update to authenticated using (owner_id = (select auth.jwt() ->> ''sub'')) with check (owner_id = (select auth.jwt() ->> ''sub''))';
    execute 'create policy "Owners delete reading lists" on public.friend_reading_lists for delete to authenticated using (owner_id = (select auth.jwt() ->> ''sub''))';
  end if;
end $$;

-- Community books are public to read, but only their author may change or remove them.
do $$
begin
  if to_regclass('public.community_books') is not null then
    -- The app writes the Clerk account id into owner_id. Some earlier project
    -- versions created this table without that column.
    alter table public.community_books add column if not exists owner_id text;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'community_books' and column_name = 'user_id'
    ) then
      execute 'update public.community_books set owner_id = user_id::text where owner_id is null';
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'community_books' and column_name = 'created_by'
    ) then
      execute 'update public.community_books set owner_id = created_by::text where owner_id is null';
    end if;
    alter table public.community_books enable row level security;
    revoke all on public.community_books from anon, authenticated;
    grant select on public.community_books to anon, authenticated;
    grant insert, update, delete on public.community_books to authenticated;
    execute 'drop policy if exists "Public can read community books" on public.community_books';
    execute 'drop policy if exists "Authors manage their community books" on public.community_books';
    execute 'create policy "Public can read community books" on public.community_books for select to anon, authenticated using (true)';
    execute 'create policy "Authors manage their community books" on public.community_books for all to authenticated using (owner_id = (select auth.jwt() ->> ''sub'')) with check (owner_id = (select auth.jwt() ->> ''sub''))';
  end if;
end $$;

-- Account data cleanup is explicit and scoped to the authenticated Clerk subject.
create or replace function public.delete_my_library_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare current_id text := auth.jwt() ->> 'sub';
begin
  if current_id is null then raise exception 'Authentication required'; end if;
  delete from public.chat_messages where sender_id = current_id or receiver_id = current_id;
  delete from public.friendships where user_id = current_id or friend_id = current_id;
  delete from public.book_likes where user_id = current_id;
  delete from public.reader_stats where id = current_id;
  if to_regclass('public.reader_state') is not null then
    execute 'delete from public.reader_state where owner_id = $1' using current_id;
    execute 'delete from public.reader_note_history where owner_id = $1' using current_id;
  end if;
  delete from public.user_profiles where user_id = current_id;
  if to_regclass('public.friend_reading_lists') is not null then
    execute 'delete from public.friend_reading_lists where owner_id = $1' using current_id;
  end if;
  if to_regclass('public.community_books') is not null then
    execute 'delete from public.community_books where owner_id = $1' using current_id;
  end if;
  if to_regclass('public.content_reports') is not null then
    execute 'delete from public.content_reports where reporter_id = $1' using current_id;
  end if;
end;
$$;
revoke all on function public.delete_my_library_data() from public, anon;
grant execute on function public.delete_my_library_data() to authenticated;

commit;
