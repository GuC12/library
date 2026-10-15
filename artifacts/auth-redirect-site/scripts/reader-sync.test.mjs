import assert from 'node:assert/strict';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { mergeReaderEntries, readerValues, nextReaderRevision, isReaderEntry } from '../src/lib/reader-sync.ts';
import { createId } from '../src/lib/create-id.ts';

const note = (revision, value, item_key = '1:0') => ({ kind: 'note', item_key, revision, value });
test('merge keeps independent items and resolves races regardless of arrival order', () => {
  const a = note('1700000000001-a', 'first');
  const b = note('1700000000002-b', 'second');
  const c = note('1700000000000-c', 'other note', '2:0');
  assert.deepEqual(readerValues(mergeReaderEntries([b, c], [a])).notes, { '1:0': 'second', '2:0': 'other note' });
  assert.deepEqual(mergeReaderEntries([a], [b]), mergeReaderEntries([b], [a]));
  assert.equal(nextReaderRevision(mergeReaderEntries([b]), 10, 'device'), '1700000000003-device');
  assert.equal(readerValues(mergeReaderEntries([b], [note('1700000000003-a', '')])).notes['1:0'], '');
  assert.equal(isReaderEntry({ kind: 'progress', item_key: '1', revision: a.revision, value: { title: 'Book', page: 0 } }), false);
});

test('ID generation works when crypto.randomUUID is unavailable', () => {
  const fallback = createId({ getRandomValues(bytes) { bytes.fill(7); return bytes; } });
  assert.match(fallback, /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/);
  assert.match(nextReaderRevision({}, 12, fallback), /^0000000000012-[\da-f-]{36}$/);
});

test('database preserves concurrent notes, retries safely and isolates accounts', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.jwt() returns jsonb language sql stable as $$ select current_setting('request.jwt.claims')::jsonb $$;
      create table public.user_profiles(user_id text primary key);
      grant usage on schema public,auth to authenticated;
      insert into public.user_profiles values ('alice');`);
    const sql = await readFile(new URL('../supabase-reader-state.sql', import.meta.url), 'utf8');
    await db.exec(sql); await db.exec(sql);
    await db.exec(`set role authenticated; select set_config('request.jwt.claims','{"sub":"alice"}',false);`);
    const save = entries => db.query('select public.save_reader_state($1::jsonb)', [JSON.stringify(entries)]);
    await save([note('1700000000002-b', 'new')]);
    await save([note('1700000000001-a', 'offline edit')]);
    await save([note('1700000000001-a', 'offline edit')]);
    assert.equal((await db.query('select value from public.reader_state')).rows[0].value, 'new');
    assert.equal((await db.query('select * from public.reader_note_history')).rows.length, 2);
    await save([{ kind: 'progress', item_key: 'book2', revision: '1700000000003-a', value: { title: 'Book', page: 12 } }]);
    assert.equal((await db.query('select * from public.reader_state')).rows.length, 2);
    await assert.rejects(save([{ kind: 'progress', item_key: 'book3', revision: '1700000000004-a', value: { page: 1 } }]));
    await db.exec(`select set_config('request.jwt.claims','{"sub":"bob"}',false)`);
    assert.equal((await db.query('select * from public.reader_state')).rows.length, 0);
    assert.equal((await db.query('select * from public.reader_note_history')).rows.length, 0);
    await save([{ ...note('1700000000005-b', 'bob'), owner_id: 'alice' }]);
    assert.equal((await db.query('select owner_id from public.reader_state')).rows[0].owner_id, 'bob');
    await db.exec('reset role; set role anon');
    await assert.rejects(save([note('1700000000006-x', 'guest')]));
    await db.exec("reset role; delete from public.user_profiles where user_id='alice'");
    assert.equal((await db.query("select * from public.reader_note_history where owner_id='alice'")).rows.length, 0);
    assert.equal((await db.query("select * from public.reader_state where owner_id='alice'")).rows.length, 0);
  } finally { await db.close(); }
});
