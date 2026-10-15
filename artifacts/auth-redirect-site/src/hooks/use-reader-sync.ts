import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createId } from '@/lib/create-id';
import { entryId, isReaderEntry, mergeReaderEntries, nextReaderRevision, readerValues,
  type ReaderEntries, type ReaderEntry, type ReaderKind, type Position } from '@/lib/reader-sync';

type Cache = { entries: ReaderEntries; pending: Record<string, ReaderEntry> };
export type ReaderSyncStatus = 'syncing' | 'saved' | 'pending' | 'offline' | 'error' | 'setupRequired' | 'storageError';
const empty = (): Cache => ({ entries: {}, pending: {} });
function readCache(key: string): Cache {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || 'null');
    if (!raw) return empty();
    const entries = Object.values(raw.entries || {}).filter(isReaderEntry);
    const pending = Object.values(raw.pending || {}).filter(isReaderEntry);
    return { entries: mergeReaderEntries(entries, pending), pending: Object.fromEntries(pending.map(e => [e.revision, e])) };
  } catch { return empty(); }
}
function initialCache(owner: string, key: string): Cache {
  const cached = readCache(key);
  // Only migrate this account's legacy data, at the lowest precedence.
  for (const [kind, prefix] of [['progress', 'library-reading-progress:'], ['bookmark', 'library-bookmarks:'], ['note', 'library-reading-notes:']] as const) {
    try {
      const values = JSON.parse(localStorage.getItem(prefix + owner) || '{}');
      for (const [item_key, value] of Object.entries(values)) {
        const entry = { kind, item_key, value, revision: '0000000000000-' + createId() };
        if (isReaderEntry(entry) && !cached.entries[entryId(entry)]) {
          cached.entries[entryId(entry)] = entry;
          cached.pending[entry.revision] = entry;
        }
      }
    } catch { /* Ignore malformed legacy data, retain the original keys. */ }
  }
  return cached;
}

export function useReaderSync(owner: string) {
  const key = `library-reader-sync:${owner}`;
  const [cache, setCache] = useState(() => initialCache(owner, key));
  const current = useRef(cache);
  const [status, setStatus] = useState<ReaderSyncStatus>('syncing');
  const client = useRef(createId());
  const flushRef = useRef<() => void>(() => {});
  const storageFailed = useRef(false);
  const publish = useCallback((next: Cache) => {
    current.current = next;
    setCache(next);
    try {
      const ordered = (values: Record<string, ReaderEntry>) => Object.fromEntries(Object.entries(values).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
      const raw = JSON.stringify({ entries: ordered(next.entries), pending: ordered(next.pending) });
      if (localStorage.getItem(key) !== raw) localStorage.setItem(key, raw);
      storageFailed.current = false;
    }
    catch { storageFailed.current = true; setStatus('storageError'); }
  }, [key]);

  const setEntry = useCallback((kind: ReaderKind, item_key: string, value: Position | string) => {
    const disk = readCache(key);
    const entries = mergeReaderEntries(Object.values(current.current.entries), Object.values(disk.entries));
    const previous = entries[`${kind}:${item_key}`];
    if (previous && JSON.stringify(previous.value) === JSON.stringify(value)) return;
    const entry: ReaderEntry = { kind, item_key, value, revision: nextReaderRevision(entries, Date.now(), client.current) };
    if (!isReaderEntry(entry)) return;
    const pending = { ...disk.pending, ...current.current.pending };
    // Coalesce this tab's keystrokes; preserve concurrent edits from other tabs.
    for (const [revision, e] of Object.entries(pending)) {
      if (entryId(e) === entryId(entry) && revision.endsWith(client.current)) delete pending[revision];
    }
    pending[entry.revision] = entry;
    publish({ entries: mergeReaderEntries(Object.values(entries), [entry]), pending });
    if (!storageFailed.current) setStatus(navigator.onLine ? 'pending' : 'offline');
  }, [key, publish]);

  useEffect(() => {
    // A guest has no cloud identity. Keep reading progress locally without
    // issuing anonymous requests that are guaranteed to fail RLS checks.
    if (!owner || owner === 'guest') {
      flushRef.current = () => {};
      setStatus('saved');
      return;
    }
    let active = true, busy = false, again = false;
    const readRemote = async () => {
      const rows: ReaderEntry[] = [];
      for (let from = 0; ; from += 500) {
        const { data, error } = await supabase.from('reader_state').select('kind,item_key,revision,value')
          .eq('owner_id', owner).order('kind').order('item_key').range(from, from + 499);
        if (error) throw error;
        rows.push(...(data || []).filter(isReaderEntry));
        if (!data || data.length < 500) return rows;
      }
    };
    const flush = async () => {
      if (!active || !owner) return;
      if (busy) { again = true; return; }
      if (!navigator.onLine) { setStatus(storageFailed.current ? 'storageError' : 'offline'); return; }
      busy = true; setStatus('syncing');
      try {
        const remote = await readRemote();
        if (!active) return;
        publish({ ...current.current, entries: mergeReaderEntries(Object.values(current.current.entries), remote) });
        const batch = Object.values(current.current.pending).slice(0, 100);
        if (batch.length) {
          const { error } = await supabase.rpc('save_reader_state', { entries: batch });
          if (error) throw error;
          if (!active) return;
          const pending = { ...current.current.pending };
          for (const entry of batch) delete pending[entry.revision];
          publish({ ...current.current, pending });
          const refreshed = await readRemote();
          if (!active) return;
          publish({ ...current.current, entries: mergeReaderEntries(Object.values(current.current.entries), refreshed) });
        }
        const left = Object.keys(current.current.pending).length > 0;
        setStatus(storageFailed.current ? 'storageError' : left ? 'pending' : 'saved');
        if (left) again = true;
      } catch (error) {
        if (!active) return;
        const code = (error as { code?: string } | null)?.code;
        if (storageFailed.current) setStatus('storageError');
        else if (!navigator.onLine) setStatus('offline');
        else if (code === 'PGRST202' || code === 'PGRST205') setStatus('setupRequired');
        else setStatus('error');
      }
      finally {
        busy = false;
        if (active && again) { again = false; void flush(); }
      }
    };
    flushRef.current = () => { void flush(); };
    publish(current.current);
    void flush();
    const interval = window.setInterval(flush, 30000);
    const storage = (event: StorageEvent) => {
      if (event.key !== key || !event.newValue) return;
      const disk = readCache(key);
      const next = { entries: mergeReaderEntries(Object.values(current.current.entries), Object.values(disk.entries)),
        pending: { ...current.current.pending, ...disk.pending } };
      current.current = next; setCache(next);
      if (Object.keys(next.pending).length) void flush();
    };
    window.addEventListener('online', flush);
    window.addEventListener('focus', flush);
    window.addEventListener('storage', storage);
    return () => {
      active = false;
      flushRef.current = () => {};
      window.clearInterval(interval);
      window.removeEventListener('online', flush);
      window.removeEventListener('focus', flush);
      window.removeEventListener('storage', storage);
    };
  }, [owner, key, publish]);

  useEffect(() => {
    if (!Object.keys(cache.pending).length) return;
    const timer = window.setTimeout(() => flushRef.current(), 1200);
    return () => window.clearTimeout(timer);
  }, [cache.pending]);

  return { ...readerValues(cache.entries), status, setEntry, retry: () => flushRef.current() };
}
