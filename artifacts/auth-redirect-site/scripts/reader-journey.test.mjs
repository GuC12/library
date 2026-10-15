import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

test('visits, streak resets and achievement claims are server-owned and repeat-safe', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.jwt() returns jsonb language sql stable as $$ select current_setting('request.jwt.claims')::jsonb $$;
      create table public.reader_stats(id text primary key, xp integer default 0, level integer default 1,
        streak_days integer default 1, pages_read integer default 0, nickname text, avatar text, books_published integer default 0, updated_at timestamptz default now());
      create table public.community_books(id bigint primary key, owner_id text, pages jsonb, is_user_book boolean);
      grant usage on schema public,auth to authenticated;
    `);
    for (const name of ['supabase-reader-rewards.sql', 'supabase-reader-journey.sql']) await db.exec(await readFile(new URL(`../${name}`, import.meta.url), 'utf8'));
    await db.exec(`insert into public.reader_stats(id,streak_days,last_visit_date,visit_timezone) values ('alice',2,current_date-1,'UTC');
      set role authenticated; select set_config('request.jwt.claims','{"sub":"alice"}',false);`);
    const journey = async (claim = null) => (await db.query('select public.reader_journey($1,$2) as result', [claim, 'UTC'])).rows[0].result;
    let result = await journey();
    assert.equal(result.streakDays, 3); assert.equal(result.xp, 10);
    assert.equal((await journey()).xp, 10);
    assert.equal((await journey('visits3')).xp, 50);
    assert.equal((await journey('visits3')).xp, 50);
    assert.equal((await journey('pages100')).xp, 50, 'incomplete achievements cannot be claimed');
    await db.query('select public.award_reading_pages(1000,$1)', [Array.from({length:20}, (_,i)=>i)]);
    result = await journey('daily20');
    assert.equal(result.xp, 390); assert.equal(result.streakDays, 3);
    assert.equal((await journey('daily20')).xp, 390);
    assert.equal((await journey('first10')).xp, 440);
    assert.equal(result.achievements.length, 11);
    assert.equal((await journey('books3')).xp, 440, 'one book cannot unlock exploration');
    await db.query('select public.award_reading_pages(1001,$1)', [[0]]);
    await db.query('select public.award_reading_pages(1002,$1)', [[0]]);
    result = await journey('books3');
    assert.equal(result.xp, 530);
    assert.equal(result.achievements.find(a => a.id === 'books3').earned, true);
    assert.equal((await journey('books3')).xp, 530, 'exploration reward is granted once');
    assert.equal((await journey('pages1000')).xp, 530);
    await db.exec(`reset role; update public.reader_xp_ledger set created_at=now()-interval '1 day' where owner_id='alice';
      update public.reader_xp_ledger set reward_key='quest:'||(current_date-1)::text||':daily20' where owner_id='alice' and reward_key like 'quest:%'; set role authenticated;`);
    result = await journey();
    assert.equal(result.achievements.find(a => a.id === 'daily20').earned, false);
    assert.equal(result.achievements.find(a => a.id === 'daily20').progress, 0);
    await db.exec(`reset role; update public.reader_stats set last_visit_date=current_date-3 where id='alice'; set role authenticated;`);
    assert.equal((await journey()).streakDays, 1, 'a missed day resets the current streak');
    await db.exec(`select set_config('request.jwt.claims','{"sub":"bob"}',false);`);
    result = await journey();
    assert.equal(result.xp,10); assert.equal(result.streakDays,1);
    assert.ok(result.achievements.every(a=>!a.earned));
    await assert.rejects(db.exec("update public.reader_stats set xp=999999 where id='bob'"));
  } finally { await db.close(); }
});
