import { BookOpen, BookMarked, Library, Crown, Compass, Rocket, Flame, CalendarDays, Magnet, House, MoonStar, LockKeyhole, Check } from 'lucide-react';

const designs = {
  first10: { icon: BookOpen, color: '#448c85', title: 'Только одним глазком' },
  pages100: { icon: BookMarked, color: '#668443', title: 'Книжный червь' },
  pages500: { icon: Library, color: '#7961ac', title: 'Пожиратель сюжетов' },
  pages1000: { icon: Crown, color: '#b7822e', title: 'Хранитель библиотеки' },
  books3: { icon: Compass, color: '#3e869d', title: 'Разведчик миров' },
  books10: { icon: Rocket, color: '#7561b3', title: 'Путешественник между строк' },
  visits3: { icon: Flame, color: '#c67844', title: 'Снова в гостях' },
  visits7: { icon: CalendarDays, color: '#ae6586', title: 'Неделя с книгой' },
  visits14: { icon: Magnet, color: '#a66d45', title: 'Книжный магнит' },
  visits30: { icon: House, color: '#6f7c42', title: 'Здесь мой дом' },
  daily20: { icon: MoonStar, color: '#6276a8', title: 'Ещё одну главу — и спать' },
};
export function achievementTitle(id: string, fallback: string) {
  return designs[id as keyof typeof designs]?.title ?? fallback;
}
export function AchievementBadge({ id, earned, ready }: { id: string; earned: boolean; ready: boolean }) {
  const { icon: Icon, color } = designs[id as keyof typeof designs] ?? designs.first10;
  return <div className={`achievement-medal${earned || ready ? ' is-unlocked' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 120 132" fill="none">
      <path d="M29 78 23 125 43 115 57 130 61 83M91 78 97 125 77 115 63 130 59 83" fill={color} opacity=".8" />
      <path d="m60 5 14 7 16 1 9 13 13 9 1 16 7 14-7 14-1 16-13 9-9 13-16 1-14 7-14-7-16-1-9-13-13-9-1-16L0 65l7-14 1-16 13-9 9-13 16-1Z" fill={color} />
      <circle cx="60" cy="65" r="43" fill="#fff9e9" stroke="#edd4a0" strokeWidth="3" />
      <circle cx="60" cy="65" r="36" stroke={color} strokeDasharray="2 5" opacity=".5" />
      <path d="m60 30 2 5 5 1-5 2-2 5-2-5-5-2 5-1Z" fill={color} />
    </svg>
    <Icon className="achievement-medal-icon" style={{ color }} strokeWidth={1.7} />
    <span className="achievement-medal-status">{earned ? <Check size={15} /> : !ready ? <LockKeyhole size={13} /> : '★'}</span>
  </div>;
}
