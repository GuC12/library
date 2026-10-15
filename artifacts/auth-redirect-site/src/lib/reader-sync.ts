import { createId } from './create-id.ts';

export type ReaderKind = 'progress' | 'bookmark' | 'note';
export type Position = { title: string; page: number; offset?: number };
export type ReaderEntry = { kind: ReaderKind; item_key: string; revision: string; value: Position | string };
export type ReaderEntries = Record<string, ReaderEntry>;
export const entryId = (entry: Pick<ReaderEntry, 'kind' | 'item_key'>) => `${entry.kind}:${entry.item_key}`;

export function isReaderEntry(value: unknown): value is ReaderEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as ReaderEntry;
  if (!['progress', 'bookmark', 'note'].includes(e.kind) || typeof e.item_key !== 'string' || !e.item_key || e.item_key.length > 100
    || typeof e.revision !== 'string' || !/^\d{13}-[a-zA-Z0-9-]{1,40}$/.test(e.revision)) return false;
  return e.kind === 'note' ? typeof e.value === 'string' && e.value.length <= 4000
    : !!e.value && typeof e.value === 'object' && typeof e.value.title === 'string'
      && Number.isSafeInteger(e.value.page) && e.value.page > 0 && e.value.page < 100000000
      && (e.value.offset === undefined || Number.isSafeInteger(e.value.offset) && e.value.offset >= 0);
}

export function mergeReaderEntries(...groups: ReaderEntry[][]): ReaderEntries {
  const result: ReaderEntries = {};
  for (const entries of groups) for (const entry of entries) {
    if (!isReaderEntry(entry)) continue;
    const key = entryId(entry);
    if (!result[key] || entry.revision > result[key].revision) result[key] = entry;
  }
  return result;
}

export function nextReaderRevision(entries: ReaderEntries, now = Date.now(), id = createId()): string {
  const maximum = Object.values(entries).reduce((max, e) => Math.max(max, Number(e.revision.slice(0, 13))), 0);
  return `${Math.max(now, maximum + 1).toString().padStart(13, '0')}-${id}`;
}

export function readerValues(entries: ReaderEntries) {
  const progress: Record<string, Position> = {}, bookmarks: Record<string, Position> = {}, notes: Record<string, string> = {};
  for (const e of Object.values(entries)) {
    if (e.kind === 'note') notes[e.item_key] = e.value as string;
    else (e.kind === 'progress' ? progress : bookmarks)[e.item_key] = e.value as Position;
  }
  return { progress, bookmarks, notes };
}

