-- Apply in the Supabase SQL Editor to enable images inside user-created books.
-- Public read lets every reader see an illustration; uploads and edits are
-- restricted to the authenticated Clerk user whose id is the first path part.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-illustrations',
  'book-illustrations',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Anyone can read book illustrations" on storage.objects;
drop policy if exists "Authors can upload book illustrations" on storage.objects;
drop policy if exists "Authors can update book illustrations" on storage.objects;
drop policy if exists "Authors can delete book illustrations" on storage.objects;

create policy "Anyone can read book illustrations"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'book-illustrations');

create policy "Authors can upload book illustrations"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'book-illustrations'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

create policy "Authors can update book illustrations"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'book-illustrations'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  )
  with check (
    bucket_id = 'book-illustrations'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

create policy "Authors can delete book illustrations"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'book-illustrations'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );
