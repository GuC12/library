import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

test('setup is repeatable and isolates books, messages and private photos', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create function auth.jwt() returns jsonb language sql stable as
        $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
      create function storage.foldername(name text) returns text[] language sql immutable as
        $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1] $$;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(id bigint generated always as identity primary key, bucket_id text, name text);
      alter table storage.objects enable row level security;
      grant usage on schema public, auth, storage to anon, authenticated;
      grant select, insert, update, delete on storage.objects to authenticated;
      grant usage on all sequences in schema storage to authenticated;
    `);
    const setup = await readFile(new URL('../supabase-setup.sql', import.meta.url), 'utf8');
    await db.exec(setup);
    // Simulate a forgotten legacy policy: reapplying must remove it, too.
    await db.exec('create policy "Old broad book access" on public.community_books for all using (true) with check (true)');
    await db.exec(setup);
    assert.equal((await db.query("select public from storage.buckets where id = 'chat-photos'")).rows[0].public, false);
    await db.exec(`
      insert into public.friendships(user_id,friend_id,status) values ('alice','bob','accepted'),('bob','alice','accepted');
      insert into public.community_books(id,owner_id,title,author,category) values (1,'alice','Book','Alice','Fiction');
      insert into public.chat_messages(sender_id,receiver_id,body,attachment_url)
        values ('alice','bob','hello','chat-photos/alice/bob/photo.jpg');
      insert into storage.objects(bucket_id,name) values ('chat-photos','alice/bob/photo.jpg');
      set role authenticated;
      select set_config('request.jwt.claims','{"sub":"mallory"}',false);
    `);
    assert.equal((await db.query('select * from public.chat_messages')).rows.length, 0);
    assert.equal((await db.query('select * from storage.objects')).rows.length, 0);
    assert.equal((await db.query("update public.community_books set title='stolen' where id=1 returning id")).rows.length, 0);
    await assert.rejects(db.exec("insert into public.community_books(id,owner_id,title,author,category) values(2,'alice','Fake','Fake','Fiction')"));
    await db.exec(`select set_config('request.jwt.claims','{"sub":"bob"}',false)`);
    assert.equal((await db.query('select * from public.chat_messages')).rows.length, 1);
    assert.equal((await db.query('select * from storage.objects')).rows.length, 1);
    await assert.rejects(db.exec("insert into public.chat_messages(sender_id,receiver_id,body,attachment_url) values ('bob','alice','','chat-photos/alice/bob/photo.jpg')"));
    await db.exec("insert into public.chat_messages(sender_id,receiver_id,body) values ('bob','alice','reply')");
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query('select * from public.chat_messages'));
    assert.equal((await db.query('select * from public.community_books')).rows.length, 1);
  } finally { await db.close(); }
});
