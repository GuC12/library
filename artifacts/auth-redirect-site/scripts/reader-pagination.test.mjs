import assert from 'node:assert/strict';
import test from 'node:test';
import { locateLeaf, paginateBookPages } from '../src/lib/reader-pagination.ts';
import { createPageFit } from '../src/lib/reader-measure.ts';

test('pagination accounts for short dialogue lines and preserves every source character', () => {
  const fits = createPageFit(240, 200, 20, text => text.length * 10);
  assert.equal(fits({ title: '', text: Array(7).fill('Yes.').join('\n\n') }), false);
  const pages = Array.from({ length: 250 }, (_, i) => ({ kicker: 'Book', title: '', text: `Source${i}: ` + 'a sentence with words. '.repeat(5) }));
  const leaves = paginateBookPages(pages, fits);
  assert.equal(leaves.map(p => p.text).join('').replace(/\s/g, ''), pages.map(p => p.text).join('').replace(/\s/g, ''));
  assert.ok(leaves.every(fits));
  for (let source = 0; source < pages.length; source++) {
    const leaf = leaves[locateLeaf(leaves, { source, offset: 3 })];
    assert.ok(leaf.source <= source && (leaf.sourceEnd ?? leaf.source) >= source);
  }
});

test('short source fragments with the same chapter fill normal reader pages without losing offsets', () => {
  const pages = [
    { kicker: 'Chapter 2', title: 'The meeting', text: 'Sofia entered the room and looked around.' },
    { kicker: 'Chapter 2', title: '', text: 'She raised her eyes and fell silent.' },
    { kicker: 'Chapter 2', title: '', text: '“Do you always remember other people’s bad purchases?”' },
  ];
  const leaves = paginateBookPages(pages, page => page.text.length <= 95);

  assert.ok(leaves.length < pages.length, 'adjacent fragments should share a fuller leaf');
  const output = leaves.map(leaf => leaf.text).join('').replace(/\s+/g, ' ');
  for (const page of pages) assert.ok(output.includes(page.text));
  assert.equal(leaves[0].source, 0);
  assert.ok(locateLeaf(leaves, { source: 2, offset: 5 }) >= 0, 'locations inside a merged source range remain reachable');
});

test('chapters flow as headings while scanned pages remain separate', () => {
  const pages = [
    { kicker: 'Chapter 1', title: '', text: 'First chapter text.' },
    { kicker: 'Chapter 2', title: '', text: 'Second chapter text.' },
    { kicker: 'Scanned page', title: '', text: 'image text', pageImage: '/page.png' },
    { kicker: 'Chapter 3', title: '', text: 'Third chapter text.' },
  ];
  const leaves = paginateBookPages(pages, () => true);
  assert.deepEqual(leaves.map(leaf => leaf.kicker), ['Chapter 1', 'Scanned page', 'Chapter 3']);
  assert.ok(leaves[0].text.includes('# Chapter 2'));
  assert.equal(locateLeaf(leaves, { source: 1, offset: 5 }), 0);
});
