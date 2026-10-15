-- Server-owned XP and an idempotent reward ledger for authenticated readers.
create table if not exists public.reader_xp_ledger (
  owner_id text not null,
  reward_key text not null check (length(reward_key) between 1 and 160),
  xp_delta integer not null check (xp_delta between 0 and 100000),
  pages_delta integer not null default 0 check (pages_delta between 0 and 200),
  created_at timestamptz not null default now(),
  primary key (owner_id, reward_key)
);
create index if not exists reader_xp_ledger_daily_idx
  on public.reader_xp_ledger(owner_id, created_at desc) where reward_key like 'read:%';
alter table public.reader_xp_ledger enable row level security;
revoke all on public.reader_xp_ledger from public, anon, authenticated;

alter table public.reader_stats add column if not exists last_read_date date;

-- Keep profile fields editable, while XP, level, streak and reading totals can
-- only be written by the SECURITY DEFINER award functions below.
revoke insert, update on public.reader_stats from authenticated;
grant select on public.reader_stats to anon, authenticated;
grant insert (id, nickname, avatar, books_published, updated_at) on public.reader_stats to authenticated;
grant update (nickname, avatar, books_published, updated_at) on public.reader_stats to authenticated;

create or replace function public.apply_reader_reward(p_owner_id text, p_reward_key text, p_xp integer, p_pages integer)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare inserted_key text; daily_xp integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner_id, 42));
  select coalesce(sum(xp_delta), 0) into daily_xp from public.reader_xp_ledger
    where owner_id = p_owner_id and created_at >= date_trunc('day', now());
  if daily_xp + p_xp > 1500 then return false; end if;
  insert into public.reader_stats(id) values (p_owner_id) on conflict (id) do nothing;
  insert into public.reader_xp_ledger(owner_id, reward_key, xp_delta, pages_delta)
    values (p_owner_id, p_reward_key, p_xp, p_pages)
    on conflict (owner_id, reward_key) do nothing
    returning reward_key into inserted_key;
  if inserted_key is null then return false; end if;

  update public.reader_stats set
    xp = xp + p_xp,
    level = 1,
    pages_read = pages_read + p_pages,
    last_read_date = case when p_pages > 0 then current_date else last_read_date end,
    updated_at = now()
    where id = p_owner_id;
  update public.reader_stats set level = floor((sqrt(1 + 0.08 * xp) - 1) / 2)::integer + 1 where id = p_owner_id;
  return true;
end $$;
revoke all on function public.apply_reader_reward(text, text, integer, integer) from public, anon, authenticated;

create or replace function public.award_reading_pages(p_book_id bigint, p_page_indexes integer[])
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare current_id text := auth.jwt() ->> 'sub'; page_index integer; added integer := 0;
  day_count integer; expected_pages integer; result_row public.reader_stats%rowtype;
begin
  if current_id is null then raise exception 'Authentication required'; end if;
  if p_book_id is null or p_book_id <= 0 or p_page_indexes is null
    or cardinality(p_page_indexes) > 20 then raise exception 'Invalid reading activity'; end if;
  if exists (select 1 from unnest(p_page_indexes) as p(i) where i is null or i < 0 or i > 9999999) then
    raise exception 'Invalid page index';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(current_id, 42));
  select jsonb_array_length(pages) into expected_pages from public.community_books where id = p_book_id;
  if expected_pages is not null and exists (select 1 from unnest(p_page_indexes) as p(i) where i >= expected_pages) then
    raise exception 'Page index is outside the book';
  end if;

  for page_index in select distinct i from unnest(p_page_indexes) as p(i) order by i loop
    select count(*) into day_count from public.reader_xp_ledger
      where owner_id = current_id and reward_key like 'read:%' and created_at >= date_trunc('day', now());
    exit when day_count >= 100;
    if public.apply_reader_reward(current_id, 'read:' || p_book_id::text || ':' || page_index::text, 15, 1) then
      added := added + 1;
    end if;
  end loop;

  select * into result_row from public.reader_stats where id = current_id;
  return jsonb_build_object('xp', result_row.xp, 'level', result_row.level,
    'streakDays', result_row.streak_days, 'pagesRead', result_row.pages_read,
    'gainedXp', added * 15, 'awardedPages', added);
end $$;
revoke all on function public.award_reading_pages(bigint, integer[]) from public, anon;
grant execute on function public.award_reading_pages(bigint, integer[]) to authenticated;

-- Publication reward runs only on a new row insert. Retrying an upsert or
-- editing a published book cannot create a second publication reward.
create or replace function public.reward_new_book_publication()
returns trigger language plpgsql security definer set search_path = '' as $$
declare safe_pages integer := greatest(1, least(coalesce(jsonb_array_length(new.pages), 1), 200));
begin
  perform public.apply_reader_reward(new.owner_id, 'publish:' || new.id::text, least(40 + safe_pages * 15, 1000), 0);
  return new;
end $$;
drop trigger if exists reward_new_book_publication on public.community_books;
create trigger reward_new_book_publication after insert on public.community_books
  for each row when (new.owner_id is not null and new.is_user_book)
  execute function public.reward_new_book_publication();

create or replace function public.delete_reader_xp_ledger_for_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.reader_xp_ledger where owner_id = old.id;
  return old;
end $$;
drop trigger if exists delete_reader_xp_ledger_for_profile on public.reader_stats;
create trigger delete_reader_xp_ledger_for_profile after delete on public.reader_stats
  for each row execute function public.delete_reader_xp_ledger_for_profile();
