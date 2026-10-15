begin;
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

-- Daily site visits and achievements. Rewards remain server-owned and idempotent.
alter table public.reader_stats add column if not exists last_visit_date date;
alter table public.reader_stats add column if not exists visit_timezone text;
update public.reader_stats set last_visit_date = last_read_date where last_visit_date is null and last_read_date is not null;

create or replace function public.reader_journey(p_claim text default null, p_timezone text default 'UTC')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid text := auth.jwt() ->> 'sub'; zone text; today date; before_xp integer;
  r public.reader_stats%rowtype; item record; progress integer; key text; earned boolean;
  daily_pages integer; books_started integer; achievements jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid, 42));
  insert into public.reader_stats(id) values(uid) on conflict(id) do nothing;
  select * into r from public.reader_stats where id = uid;
  before_xp := r.xp;
  zone := r.visit_timezone;
  if zone is null then
    select name into zone from pg_timezone_names where name = p_timezone;
    zone := coalesce(zone, 'UTC');
    update public.reader_stats set visit_timezone = zone where id = uid;
  end if;
  today := (now() at time zone zone)::date;
  if r.last_visit_date is distinct from today then
    update public.reader_stats set
      streak_days = case when last_visit_date = today - 1 then streak_days + 1 else 1 end,
      last_visit_date = today, updated_at = now() where id = uid;
  end if;
  perform public.apply_reader_reward(uid, 'visit:' || today::text, 10, 0);
  select * into r from public.reader_stats where id = uid;
  select coalesce(sum(pages_delta),0) into daily_pages from public.reader_xp_ledger
    where owner_id = uid and (created_at at time zone zone)::date = today and reward_key like 'read:%';
  select count(distinct split_part(reward_key, ':', 2)) into books_started
    from public.reader_xp_ledger where owner_id = uid and reward_key like 'read:%';
  for item in select * from (values
    ('first10', 'Первые шаги', 'Прочитайте 10 новых страниц', 'pages', 10, 50),
    ('pages100', 'За главой — глава', 'Прочитайте 100 новых страниц', 'pages', 100, 150),
    ('pages500', 'Книжный исследователь', 'Прочитайте 500 новых страниц', 'pages', 500, 300),
    ('visits3', 'Хорошее начало', 'Заходите на сайт 3 дня подряд', 'streak', 3, 40),
    ('visits7', 'Неделя с книгой', 'Заходите на сайт 7 дней подряд', 'streak', 7, 100),
    ('visits30', 'Литературная привычка', 'Заходите на сайт 30 дней подряд', 'streak', 30, 400),
    ('pages1000', 'Хранитель библиотеки', 'Прочитайте 1000 новых страниц', 'pages', 1000, 500),
    ('books3', 'Разведчик миров', 'Прочитайте хотя бы одну новую страницу в 3 разных книгах', 'books', 3, 60),
    ('books10', 'Путешественник между строк', 'Прочитайте хотя бы одну новую страницу в 10 разных книгах', 'books', 10, 180),
    ('visits14', 'Книжный магнит', 'Заходите на сайт 14 дней подряд', 'streak', 14, 200),
    ('daily20', 'Ещё одна глава', 'Прочитайте 20 новых страниц сегодня · новое задание каждый день', 'daily', 20, 40)
  ) as a(id, title, description, metric, target, reward) loop
    progress := case item.metric when 'pages' then r.pages_read when 'streak' then r.streak_days when 'books' then books_started else daily_pages end;
    key := case when item.metric = 'daily' then 'quest:' || today::text || ':' else 'achievement:' end || item.id;
    if p_claim = item.id and progress >= item.target then
      perform public.apply_reader_reward(uid, key, item.reward, 0);
    end if;
    select exists(select 1 from public.reader_xp_ledger where owner_id=uid and reward_key=key) into earned;
    achievements := achievements || jsonb_build_array(jsonb_build_object(
      'id',item.id,'title',item.title,'description',item.description,'target',item.target,
      'progress',progress,'reward',item.reward,'earned',earned,'ready',progress >= item.target));
  end loop;
  select * into r from public.reader_stats where id = uid;
  return jsonb_build_object('xp',r.xp,'level',r.level,'streakDays',r.streak_days,'pagesRead',r.pages_read,
    'date',today,'gainedXp',r.xp-before_xp,'achievements',achievements);
end $$;
revoke all on function public.reader_journey(text,text) from public, anon;
grant execute on function public.reader_journey(text,text) to authenticated;

commit;
