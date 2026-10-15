import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileCommunityBooks, removeSyncedRevisions } from '../src/lib/community-sync.ts';

test('cloud changes and deletions replace cached books while own drafts survive', () => {
  const remote = { id: 1, title: 'Revised', ownerId: 'alice' };
  const draft = { id: 2, title: 'Draft', ownerId: 'alice' };
  const other = { id: 3, title: 'Another account draft', ownerId: 'bob' };
  assert.deepEqual(reconcileCommunityBooks([remote], [draft, other], 'alice'), [draft, remote]);
  assert.deepEqual(reconcileCommunityBooks([], [], 'alice'), []);
});

test('pending edits override the cloud until their exact revision is saved', () => {
  const old = { id: 1, title: 'Old', ownerId: 'alice' };
  const edited = { ...old, title: 'New' };
  assert.deepEqual(reconcileCommunityBooks([old], [edited], 'alice'), [edited]);
  assert.deepEqual(removeSyncedRevisions([edited], [old]), [edited]);
  assert.deepEqual(removeSyncedRevisions([edited], [edited]), []);
});
