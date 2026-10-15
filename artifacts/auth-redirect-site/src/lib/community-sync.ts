import type { Book } from '../data/books';

/** Cloud is authoritative; only this account's unsent drafts override it. */
export function reconcileCommunityBooks(remote: Book[], pending: Book[], ownerId: string): Book[] {
  const drafts = pending.filter(book => book.ownerId === ownerId);
  const pendingIds = new Set(drafts.map(book => book.id));
  return [...drafts, ...remote.filter(book => !pendingIds.has(book.id))];
}

/** Do not discard an edit made while an older revision was being uploaded. */
export function removeSyncedRevisions(pending: Book[], saved: Book[]): Book[] {
  return pending.filter(book => !saved.some(revision => revision === book));
}
