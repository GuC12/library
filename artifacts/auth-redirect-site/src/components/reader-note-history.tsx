import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n';

export function ReaderNoteHistory({ owner, noteKey, onRestore }: { owner: string; noteKey: string; onRestore: (text: string) => void }) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<{ revision: string; value: string; saved_at: string }[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [before, setBefore] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    if (!open || !owner) return;
    let active = true;
    setState('loading');
    let query = supabase.from('reader_note_history').select('revision,value,saved_at')
      .eq('owner_id', owner).eq('item_key', noteKey).order('revision', { ascending: false }).limit(30);
    if (before) query = query.lt('revision', before);
    void query
      .then(({ data, error }) => {
        if (!active) return;
        if (error) { setState('error'); return; }
        const rows = (data || []).filter(row => typeof row.value === 'string');
        setVersions(current => before ? [...current, ...rows] : rows);
        setHasMore(rows.length === 30);
        setState('ready');
      });
    return () => { active = false; };
  }, [owner, noteKey, open, retry, before]);
  return <div className="library-note-history">
    <button type="button" aria-expanded={open} onClick={() => { setBefore(null); setOpen(value => !value); }}>{t('readerNoteHistory')}</button>
    {open && <div>
      {state === 'loading' && <p role="status">{t('readerSyncing')}</p>}
      {state === 'error' && <button type="button" onClick={() => setRetry(value => value + 1)}>{t('readerSyncError')} · {t('readerSyncRetry')}</button>}
      {state === 'ready' && !versions.length && <p>{t('readerNoVersions')}</p>}
      {state === 'ready' && versions.map(version => <details key={version.revision}>
        <summary>{new Date(version.saved_at).toLocaleString(language)} · {version.value.slice(0, 60) || t('readerEmptyNote')}</summary>
        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{version.value || t('readerEmptyNote')}</p>
        <button type="button" onClick={() => { onRestore(version.value); setOpen(false); }}>{t('readerRestoreNote')}</button>
      </details>)}
      {state === 'ready' && hasMore && <button type="button" onClick={() => setBefore(versions.at(-1)?.revision || null)}>{t('readerMoreVersions')}</button>}
    </div>}
  </div>;
}
