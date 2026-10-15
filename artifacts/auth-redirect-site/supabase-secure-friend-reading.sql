-- Apply once in Supabase SQL Editor after enabling Clerk as a Third-Party Auth provider.
-- Clerk session tokens must include role=authenticated; the site sends each session token.

create table if not exists public.friend_reading_lists (
  owner_id text primary key,
  want jsonb not null default '[]'::jsonb,
  reading jsonb not null default '[]'::jsonb,
  done jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Move any lists saved by the previous version before removing the public column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reader_stats' and column_name = 'reading_lists'
  ) then
    execute $migrate$
      insert into public.friend_reading_lists (owner_id, want, reading, done, updated_at)
      select id,
        coalesce(reading_lists -> 'want', '[]'::jsonb),
        coalesce(reading_lists -> 'reading', '[]'::jsonb),
        coalesce(reading_lists -> 'done', '[]'::jsonb),
        coalesce(updated_at, now())
      from public.reader_stats
      where reading_lists is not null
      on conflict (owner_id) do nothing
    $migrate$;
    alter table public.reader_stats drop column reading_lists;
  end if;
end $$;

alter table public.friend_reading_lists enable row level security;
revoke all on public.friend_reading_lists from anon, authenticated;
grant select, insert, update, delete on public.friend_reading_lists to authenticated;

-- Remove any older permissive policies on the protected tables before defining
-- the final policy set below (multiple permissive policies are OR-ed together).
do $$
declare existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('friend_reading_lists', 'reader_stats', 'friendships')
  loop
    execute format('drop policy %I on %I.%I', existing_policy.policyname, existing_policy.schemaname, existing_policy.tablename);
  end loop;
end $$;

drop policy if exists "Owners and accepted friends can read lists" on public.friend_reading_lists;
drop policy if exists "Owners can insert reading lists" on public.friend_reading_lists;
drop policy if exists "Owners can update reading lists" on public.friend_reading_lists;
drop policy if exists "Owners can delete reading lists" on public.friend_reading_lists;

create policy "Owners and accepted friends can read lists"
  on public.friend_reading_lists for select to authenticated
  using (
    owner_id = (select auth.jwt() ->> 'sub')
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.user_id = owner_id and f.friend_id = (select auth.jwt() ->> 'sub'))
          or (f.friend_id = owner_id and f.user_id = (select auth.jwt() ->> 'sub'))
        )
    )
  );

create policy "Owners can insert reading lists"
  on public.friend_reading_lists for insert to authenticated
  with check (owner_id = (select auth.jwt() ->> 'sub'));

create policy "Owners can update reading lists"
  on public.friend_reading_lists for update to authenticated
  using (owner_id = (select auth.jwt() ->> 'sub'))
  with check (owner_id = (select auth.jwt() ->> 'sub'));

create policy "Owners can delete reading lists"
  on public.friend_reading_lists for delete to authenticated
  using (owner_id = (select auth.jwt() ->> 'sub'));

-- Keep public leaderboard statistics readable, but only let the Clerk account
-- that owns a row create or change it.
alter table public.reader_stats enable row level security;
drop policy if exists "Public can read reader stats" on public.reader_stats;
drop policy if exists "Public can upsert reader stats" on public.reader_stats;
drop policy if exists "Public can update reader stats" on public.reader_stats;
drop policy if exists "Users can read reader stats" on public.reader_stats;
drop policy if exists "Users can insert own reader stats" on public.reader_stats;
drop policy if exists "Users can update own reader stats" on public.reader_stats;
create policy "Users can read reader stats" on public.reader_stats
  for select to anon, authenticated using (true);
create policy "Users can insert own reader stats" on public.reader_stats
  for insert to authenticated
  with check (id = (select auth.jwt() ->> 'sub'));
create policy "Users can update own reader stats" on public.reader_stats
  for update to authenticated
  using (id = (select auth.jwt() ->> 'sub'))
  with check (id = (select auth.jwt() ->> 'sub'));

-- Friendship rows are private to their two participants. A user can only
-- create a pending request as themselves; acceptance is done by the RPC below.
alter table public.friendships enable row level security;
drop policy if exists "Public can read friendships" on public.friendships;
drop policy if exists "Users can create friendships" on public.friendships;
drop policy if exists "Users can update friendships" on public.friendships;
drop policy if exists "Users can delete friendships" on public.friendships;
drop policy if exists "Participants can read friendships" on public.friendships;
drop policy if exists "Users can send friend requests" on public.friendships;
drop policy if exists "Participants can delete friendships" on public.friendships;
create policy "Participants can read friendships" on public.friendships
  for select to authenticated
  using (user_id = (select auth.jwt() ->> 'sub') or friend_id = (select auth.jwt() ->> 'sub'));
create policy "Users can send friend requests" on public.friendships
  for insert to authenticated
  with check (user_id = (select auth.jwt() ->> 'sub') and status = 'pending');
create policy "Participants can delete friendships" on public.friendships
  for delete to authenticated
  using (user_id = (select auth.jwt() ->> 'sub') or friend_id = (select auth.jwt() ->> 'sub'));
revoke update on public.friendships from anon, authenticated;
grant select, insert, delete on public.friendships to authenticated;

create or replace function public.accept_friend_request(p_request_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id text := auth.jwt() ->> 'sub';
  request_sender_id text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.friendships
    set status = 'accepted'
    where id = p_request_id
      and friend_id = current_user_id
      and status = 'pending'
    returning user_id into request_sender_id;

  if request_sender_id is null then
    raise exception 'Pending friend request not found';
  end if;

  insert into public.friendships (user_id, friend_id, status)
    values (current_user_id, request_sender_id, 'accepted')
    on conflict (user_id, friend_id) do update set status = 'accepted';
end;
$$;

revoke all on function public.accept_friend_request(bigint) from public, anon;
grant execute on function public.accept_friend_request(bigint) to authenticated;

-- Remove the old public list migration's permissive policies if they exist.
drop policy if exists "Public can read reader stats" on public.reader_stats;
drop policy if exists "Public can upsert reader stats" on public.reader_stats;
drop policy if exists "Public can update reader stats" on public.reader_stats;
