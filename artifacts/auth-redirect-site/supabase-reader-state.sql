-- Private, per-item reading state; unrelated books and notes cannot overwrite each other.
create table if not exists public.reader_state (
  owner_id text not null,
  kind text not null check (kind in ('progress','bookmark','note')),
  item_key text not null check (length(item_key) between 1 and 100),
  revision text collate "C" not null check (revision ~ '^[0-9]{13}-[a-zA-Z0-9-]{1,40}$'),
  value jsonb not null check (octet_length(value::text) <= 20000),
  primary key (owner_id, kind, item_key)
);
create table if not exists public.reader_note_history (
  owner_id text not null, item_key text not null,
  revision text collate "C" not null, value jsonb not null,
  saved_at timestamptz not null default now(),
  primary key (owner_id, item_key, revision)
);
alter table public.reader_state enable row level security;
alter table public.reader_note_history enable row level security;
revoke all on public.reader_state, public.reader_note_history from anon, authenticated;
grant select on public.reader_state, public.reader_note_history to authenticated;
drop policy if exists "Own reading state" on public.reader_state;
create policy "Own reading state" on public.reader_state for select to authenticated
using (owner_id = (select auth.jwt() ->> 'sub'));
drop policy if exists "Own note history" on public.reader_note_history;
create policy "Own note history" on public.reader_note_history for select to authenticated
using (owner_id = (select auth.jwt() ->> 'sub'));

create or replace function public.save_reader_state(entries jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare owner text := auth.jwt() ->> 'sub'; entry jsonb; k text; v jsonb;
begin
  if owner is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(entries) <> 'array' or jsonb_array_length(entries) > 100 then
    raise exception 'Invalid batch';
  end if;
  for entry in select * from jsonb_array_elements(entries) loop
    k := entry ->> 'kind'; v := entry -> 'value';
    if k = 'note' then
      if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 4000 then raise exception 'Invalid note'; end if;
    elsif k in ('progress','bookmark') then
      if coalesce(jsonb_typeof(v) <> 'object', true) or coalesce(jsonb_typeof(v -> 'title') <> 'string', true)
        or not coalesce((v ->> 'page') ~ '^[1-9][0-9]{0,7}$', false)
        or coalesce(v ? 'offset' and not coalesce((v ->> 'offset') ~ '^[0-9]{1,9}$', false), false) then raise exception 'Invalid position'; end if;
    else raise exception 'Invalid kind'; end if;
    insert into public.reader_state(owner_id,kind,item_key,revision,value)
      values(owner,k,entry->>'item_key',entry->>'revision',v)
    on conflict(owner_id,kind,item_key) do update set revision=excluded.revision,value=excluded.value
      where excluded.revision > public.reader_state.revision;
    -- Retain even an older offline note that loses a concurrent update.
    if k = 'note' then
      insert into public.reader_note_history(owner_id,item_key,revision,value)
        values(owner,entry->>'item_key',entry->>'revision',v) on conflict do nothing;
    end if;
  end loop;
end $$;
revoke all on function public.save_reader_state(jsonb) from public, anon;
grant execute on function public.save_reader_state(jsonb) to authenticated;

-- Cleanup runs in the same transaction as account-data deletion.
create or replace function public.delete_reader_state_for_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.reader_state where owner_id=old.user_id;
  delete from public.reader_note_history where owner_id=old.user_id;
  return old;
end $$;
drop trigger if exists delete_reader_state_for_profile on public.user_profiles;
create trigger delete_reader_state_for_profile after delete on public.user_profiles
for each row execute function public.delete_reader_state_for_profile();
