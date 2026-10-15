import { useEffect, useState } from 'react';
import { useUser } from '@clerk/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AchievementBadge, achievementTitle } from './achievement-badge';

type Achievement = { id: string; title: string; description: string; target: number; progress: number; reward: number; earned: boolean; ready: boolean };
export type ReaderJourney = { xp: number; level: number; streakDays: number; pagesRead: number; date: string; gainedXp: number; achievements: Achievement[] };
async function loadJourney(userId: string, claim: string | null = null): Promise<ReaderJourney> {
  const { data, error } = await supabase.rpc('reader_journey', { p_claim: claim, p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  if (error) throw new Error(error.message);
  if (!data || !Array.isArray(data.achievements)) throw new Error('Invalid journey response');
  window.dispatchEvent(new CustomEvent('library-journey-changed', { detail: { userId, journey: data } }));
  return data as ReaderJourney;
}

/** Counts a visit on every route, and rechecks when the tab wakes or midnight passes. */
export function DailyReaderVisit() {
  const { user } = useUser();
  const client = useQueryClient();
  useEffect(() => {
    if (!user?.id) return;
    let stopped = false, pending = false, successfulDay = '';
    const visit = async () => {
      const today = new Date().toLocaleDateString('en-CA');
      if (stopped || pending || successfulDay === today || document.visibilityState === 'hidden') return;
      pending = true;
      try {
        const result = await loadJourney(user.id);
        if (!stopped) { successfulDay = today; client.setQueryData(['reader-journey', user.id], result); }
      } catch { /* Retry on the next visit, reconnect or minute tick. */ }
      finally { pending = false; }
    };
    void visit();
    const timer = window.setInterval(visit, 60000);
    window.addEventListener('focus', visit);
    window.addEventListener('online', visit);
    document.addEventListener('visibilitychange', visit);
    return () => { stopped = true; window.clearInterval(timer); window.removeEventListener('focus', visit); window.removeEventListener('online', visit); document.removeEventListener('visibilitychange', visit); };
  }, [user?.id, client]);
  return null;
}

export function ReaderAchievements({ userId }: { userId?: string }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'earned'>('all');
  const query = useQuery({ queryKey: ['reader-journey', userId], queryFn: () => loadJourney(userId!), enabled: Boolean(userId), retry: 1 });
  useEffect(() => {
    if (!userId) return;
    const refresh = () => { void client.invalidateQueries({ queryKey: ['reader-journey', userId] }); };
    window.addEventListener('library-reading-awarded', refresh);
    return () => window.removeEventListener('library-reading-awarded', refresh);
  }, [userId, client]);
  const claim = async (id: string) => {
    if (!userId || busy) return;
    setBusy(id); setMessage('');
    try {
      const result = await loadJourney(userId, id);
      client.setQueryData(['reader-journey', userId], result);
      const item = result.achievements.find(item => item.id === id);
      setMessage(item?.earned ? `Ачивка «${achievementTitle(id, item.title)}» в коллекции!${result.gainedXp ? ` +${result.gainedXp} XP` : ''}` : 'Достигнут дневной лимит XP. Заберите награду позже.');
    } catch { setMessage('Награда пока не сохранена. Попробуйте ещё раз.'); }
    finally { setBusy(''); }
  };
  return <section className="library-achievements" aria-labelledby="achievements-title">
    <h3 id="achievements-title">Ваша коллекция ачивок</h3>
    <p>Заходите каждый день: +10 XP за визит. Читайте, выполняйте задания и забирайте награды.</p>
    {!userId ? <p>Войдите в аккаунт, чтобы сохранять достижения.</p> : query.isError ? <p>Не удалось загрузить достижения. <button onClick={() => query.refetch()}>Повторить</button></p> : !query.data ? <p>Загружаем прогресс…</p> : <>
      <p>Серия посещений: <strong>{query.data.streakDays} дн.</strong> · Сегодняшний вход засчитан</p>
      <div className="achievement-filters" aria-label="Фильтр достижений">{([
        ['all', 'Все'], ['available', 'Осталось открыть'], ['earned', 'В коллекции'],
      ] as const).map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label} · {query.data.achievements.filter(item => value === 'all' || (value === 'earned' ? item.earned : !item.earned)).length}</button>)}</div>
      {filter === 'earned' && !query.data.achievements.some(item => item.earned) && <p>Здесь появятся ваши медали. Начните с 10 новых страниц!</p>}
      {filter === 'available' && query.data.achievements.every(item => item.earned) && <p>Коллекция собрана! Завтра появится новое ежедневное задание.</p>}
      <div className="library-achievement-grid">{query.data.achievements.filter(item => filter === 'all' || (filter === 'earned' ? item.earned : !item.earned)).map(item => <article key={item.id} className={`library-achievement${item.earned ? ' is-earned' : item.ready ? ' is-ready' : ''}`}>
        <span className="achievement-category">{item.id === 'daily20' ? 'Каждый день' : item.earned ? 'В коллекции' : item.ready ? 'Можно забрать!' : 'Откройте медаль'}</span>
        <AchievementBadge id={item.id} earned={item.earned} ready={item.ready} />
        <strong>{achievementTitle(item.id, item.title)}</strong><small className="achievement-description">{item.description}</small>
        <progress value={item.earned ? item.target : Math.min(item.progress, item.target)} max={item.target} aria-label={achievementTitle(item.id, item.title)} />
        <small>{item.earned ? item.target : Math.min(item.progress, item.target)} / {item.target} <b>+{item.reward} XP</b></small>
        {item.earned ? <span className="achievement-collected">✓ {item.id === 'daily20' ? 'Готово! Повторите завтра' : 'Награда получена'}</span> : <button disabled={!item.ready || Boolean(busy)} onClick={() => claim(item.id)}>{busy === item.id ? 'Сохраняем…' : item.ready ? `Забрать +${item.reward} XP` : 'Продолжайте — всё получится'}</button>}
      </article>)}</div>
    </>}
    <p role="status">{message}</p>
  </section>;
}
