import assert from 'node:assert/strict';
import test from 'node:test';
import { awardUniqueReadingPages, calculateLevel, getStoredReadingStats, setActiveReaderId } from '../src/lib/reading-system.ts';
import { clearAccountLocalData } from '../src/lib/account-storage.ts';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test('XP is awarded once per unique page, survives reloads, and is isolated by reader account', async () => {
  globalThis.window = { localStorage: memoryStorage(), dispatchEvent() {} };
  setActiveReaderId('reader-a');

  const first = awardUniqueReadingPages(42, [0, 1]);
  assert.equal(first.awardedPages, 2);
  assert.equal(first.gainedXp, 30);
  assert.equal(first.stats.pagesRead, 2);

  const revisit = awardUniqueReadingPages(42, [0, 1]);
  assert.equal(revisit.awardedPages, 0);
  assert.equal(revisit.gainedXp, 0);
  assert.equal(revisit.stats.xp, 30);

  const next = awardUniqueReadingPages(42, [1, 2]);
  assert.equal(next.awardedPages, 1);
  assert.equal(next.stats.xp, 45);

  const reloadedModule = await import('../src/lib/reading-system.ts?fresh-module');
  reloadedModule.setActiveReaderId('reader-a');
  const afterReload = reloadedModule.awardUniqueReadingPages(42, [0, 1, 2]);
  assert.equal(afterReload.gainedXp, 0);
  assert.equal(afterReload.stats.xp, 45);

  setActiveReaderId('reader-b');
  const otherReader = awardUniqueReadingPages(42, [0]);
  assert.equal(otherReader.gainedXp, 15);
  assert.equal(getStoredReadingStats().xp, 15);
  assert.equal(calculateLevel(20_605).level, 20);
});

test('account cleanup preserves other accounts and unrelated site storage', () => {
  const storage = memoryStorage();
  globalThis.window = { localStorage: storage };
  storage.setItem('library-reading-statuses:reader-a', '{"42":"done"}');
  storage.setItem('library-reading-statuses:reader-b', '{"51":"want"}');
  storage.setItem('library-sort-order', '"title"');
  storage.setItem('library-reader-sync:reader-a', '{"pending":{}}');
  storage.setItem('library-reader-sync:reader-b', '{"pending":{}}');
  storage.setItem('library-user-books', JSON.stringify([{ id: 10, ownerId: 'reader-a' }, { id: 11, ownerId: 'reader-b' }]));

  clearAccountLocalData('reader-a');

  assert.equal(storage.getItem('library-reading-statuses:reader-a'), null);
  assert.equal(storage.getItem('library-reader-sync:reader-a'), null);
  assert.ok(storage.getItem('library-reader-sync:reader-b'));
  assert.ok(storage.getItem('library-reading-statuses:reader-b'));
  assert.equal(storage.getItem('library-sort-order'), '"title"');
  assert.deepEqual(JSON.parse(storage.getItem('library-user-books')), [{ id: 11, ownerId: 'reader-b' }]);
});
