-- Upgrade existing book tables without changing books, permissions or RLS.
begin;
alter table public.community_books
  add column if not exists community_category text;
notify pgrst, 'reload schema';
commit;
