const USER_KEY_PREFIXES = [
  'library_user_nickname_',
  'library_user_avatar_',
  'library_reader_stats:',
  'library-reading-notes:',
  'library-reader-sync:',
  'library-reading-pages:',
  'library-reading-statuses:',
  'library-reading-progress:',
  'library-bookmarks:',
  'library-cart:',
  'library-book-draft-',
  'library-pending-book-sync:',
];

/** Remove only this account's app data; never clear Clerk or other site storage. */
export function clearAccountLocalData(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  const keys = USER_KEY_PREFIXES.map((prefix) => `${prefix}${userId}`);
  for (const key of keys) {
    try { window.localStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
  }
  // These browser caches are shared across accounts, so retain other authors' data.
  for (const key of ['library-user-books', 'library_readers_registry']) {
    try {
      const value = window.localStorage.getItem(key);
      if (!value) continue;
      const rows: unknown = JSON.parse(value);
      if (Array.isArray(rows)) {
        window.localStorage.setItem(key, JSON.stringify(rows.filter((row) => !row || typeof row !== 'object' || (row as { ownerId?: string; id?: string }).ownerId !== userId && (row as { id?: string }).id !== userId)));
      }
    } catch { /* Keep the cache intact if it cannot be parsed safely. */ }
  }
}
