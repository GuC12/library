import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  SPECIAL_BOOK_FRONT_COVER,
  SPECIAL_BOOK_BACK_COVER,
  SPECIAL_BOOK_SPINE_COVER,
} from '@/data/special-book';
import { Sparkles, RotateCw, BookOpen, Eye } from 'lucide-react';
import { Link } from 'wouter';

interface Interactive3DBookProps {
  onOpenReader?: () => void;
  showDetailsButton?: boolean;
  showControls?: boolean;
  className?: string;
  compact?: boolean;
  initialRotation?: { x: number; y: number };
}

export function Interactive3DBook({
  onOpenReader,
  showDetailsButton = true,
  showControls = true,
  className = '',
  compact = false,
  initialRotation = { x: 8, y: -24 },
}: Interactive3DBookProps) {
  // Углы вращения в градусах — сразу в 3D ракурсе со страницами и корешком
  const [rotation, setRotation] = useState<{ x: number; y: number }>(initialRotation);
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);

  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const autoRotateRef = useRef<number | null>(null);

  // Мягкое вращение при включении пользователем
  useEffect(() => {
    if (!autoRotate || isDragging) return;

    const interval = window.setInterval(() => {
      setRotation((prev) => ({
        x: Math.sin(Date.now() / 1400) * 8 + 8,
        y: (prev.y + 0.35) % 360,
      }));
    }, 30);

    return () => window.clearInterval(interval);
  }, [autoRotate, isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setAutoRotate(false);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;

    lastMousePos.current = { x: e.clientX, y: e.clientY };

    setRotation((prev) => {
      // Ограничиваем наклон по вертикали, чтобы не выворачивать камеру наизнанку
      const newX = Math.max(-45, Math.min(45, prev.x - deltaY * 0.45));
      const newY = (prev.y + deltaX * 0.55) % 360;
      return { x: newX, y: newY };
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const resetView = (angleY: number) => {
    setAutoRotate(false);
    setRotation({ x: angleY === 0 ? 0 : 10, y: angleY });
  };

  const width = compact ? 170 : 210;
  const height = compact ? 245 : 300;
  const thickness = compact ? 34 : 44;

  return (
    <div
      className={`interactive-3d-book-container select-none flex flex-col items-center justify-center ${className}`}
      style={{ perspective: '1200px' }}
    >
      {/* 3D Сцена */}
      <div
        className={`relative cursor-grab active:cursor-grabbing ${compact ? 'p-1 sm:p-2' : 'p-6 sm:p-10'} flex items-center justify-center touch-none`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Книга в 3D */}
        <div
          className="book-3d transition-transform ease-out"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          {/* Передняя обложка (Front Cover) */}
          <div
            className="book-face book-front absolute inset-0 overflow-hidden rounded-r-[6px] shadow-2xl origin-left"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              transform: isOpen
                ? `translateZ(${thickness / 2}px) rotateY(-130deg)`
                : `translateZ(${thickness / 2}px)`,
              transformStyle: 'preserve-3d',
              transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
              backfaceVisibility: 'visible',
            }}
          >
            {/* Наружная сторона передней обложки */}
            <div
              className="absolute inset-0 bg-cover bg-center rounded-r-[6px] overflow-hidden"
              style={{
                backgroundImage: `url(${SPECIAL_BOOK_FRONT_COVER})`,
                boxShadow:
                  'inset 4px 0 10px rgba(0,0,0,0.5), inset -2px 0 6px rgba(255,255,255,0.15), 0 15px 35px rgba(0,0,0,0.45)',
              }}
            >
              {/* Корешковая тень сгиба */}
              <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-black/45 via-black/15 to-transparent pointer-events-none" />
              {/* Легкий отблеск света */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-amber-200/10 pointer-events-none" />
            </div>

            {/* Внутренняя сторона передней обложки (когда открыта) */}
            <div
              className="absolute inset-0 bg-[#35151A] rounded-l-[6px] p-5 flex flex-col justify-between text-[#F4EEE3]"
              style={{
                transform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.7)',
              }}
            >
              <div className="border border-[#B1844D]/30 p-3 rounded-lg bg-black/20 text-center">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#B1844D]">
                  Belladonna Press
                </span>
                <h4 className="font-serif text-sm font-semibold mt-1">Особое 3D-издание</h4>
                <p className="text-[10px] text-stone-300 mt-1 italic">
                  «Эти письма не должны были дойти тогда — они были предназначены для вас»
                </p>
              </div>
              <div className="text-center font-mono text-[9px] text-[#B1844D]">
                Астана · 2026 год
              </div>
            </div>
          </div>

          {/* Внутренние страницы (Блок страниц) */}
          <div
            className="book-pages-block absolute inset-0 bg-[#F4EEE3] rounded-r-[4px] p-4 flex flex-col justify-between shadow-inner"
            style={{
              width: `${width - 4}px`,
              height: `${height - 4}px`,
              top: '2px',
              left: '2px',
              transform: `translateZ(0px)`,
              boxShadow:
                'inset 5px 0 12px rgba(0,0,0,0.18), inset 0 0 4px rgba(60,40,20,0.2)',
            }}
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#D9C7AA] pb-1.5 mb-2">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#5A422B]">
                  Глава 1 · Эхо из прошлого
                </span>
                <span className="text-[9px] font-serif text-[#B1844D]">стр. 8</span>
              </div>
              <p className="text-[10px] leading-relaxed text-[#2D2418] font-serif line-clamp-6">
                Библиотека Королевской Академии всегда жила собственной, строго размеренной жизнью...
                Когда Майя аккуратно поддела пальцами тяжелую обложку, из самой глубины страниц
                выскользнул плотный конверт с темным сургучным оттиском и серебряный ключ с лилиями...
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#D9C7AA]">
              <span className="text-[9px] text-stone-500 font-serif italic">«Я люблю тебя»</span>
              <span className="text-[10px] font-bold text-[#8C1D24]">3 000 ₸</span>
            </div>
          </div>

          {/* Задняя обложка (Back Cover) с полным текстом из PDF */}
          <div
            className="book-face book-back absolute inset-0 overflow-hidden rounded-l-[6px] shadow-2xl"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              transform: `translateZ(${-thickness / 2}px) rotateY(180deg)`,
              backgroundImage: `url(${SPECIAL_BOOK_BACK_COVER})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow:
                'inset -4px 0 10px rgba(0,0,0,0.5), inset 2px 0 6px rgba(255,255,255,0.15)',
            }}
          >
            {/* Текст задней обложки из оригинального файла */}
            <div className="absolute inset-0 p-3 sm:p-3.5 flex flex-col justify-between text-[#F4EEE3] bg-black/40 overflow-hidden">
              <div>
                <h3
                  className="font-serif text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-center text-[#9A2226] leading-tight"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 6px rgba(154,34,38,0.6)' }}
                >
                  ПИСЬМА<br />
                  КОТОРЫЕ НЕ ДОЛЖНЫ БЫЛИ ДОЙТИ
                </h3>
                <p className="mt-1 text-[7.5px] sm:text-[8px] italic text-[#D9C7AA] text-center leading-tight">
                  Одно случайное письмо. Два разбитых сердца из прошлого. И тайна, способная изменить всё.
                </p>
                <p className="mt-1 text-[6.5px] sm:text-[7px] leading-[1.3] text-[#F4EEE3]/90 font-serif text-justify line-clamp-5">
                  Майя привыкла к тишине академического архива и запаху старой бумаги. Но когда из пожелтевшего фолианта XVIII века выпадает нераспечатанное письмо с темной сургучной печатью и серебряным ключом, её привычная жизнь рушится. Послание адресату содержит отчаянную просьбу о помощи и шифр, ведущий к загадочному Особняку с белыми арками...
                </p>
                <p className="mt-1 text-[6.5px] sm:text-[7px] italic text-[#B1844D] text-center">
                  «Любовь не пропадает бесследно. Она лишь ждет тех, кто сможет повторить наш путь...»
                </p>
                <div className="mt-1 text-[6px] sm:text-[6.5px] text-stone-300 leading-tight">
                  <p className="font-bold text-[#D9C7AA]">В этой книге вас ждут:</p>
                  <ul className="list-disc pl-2.5 space-y-0.5 mt-0.5 text-stone-300">
                    <li>Атмосферный роман с готическим флером</li>
                    <li>Шифры, тайники и заброшенные ротонды</li>
                    <li>Трогательная любовь сквозь эпохи</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[#B1844D]/30 pt-1 text-[7px] font-mono text-[#B1844D]">
                <span>Belladonna Press</span>
                <span className="font-bold text-white">3 000 ₸</span>
              </div>
            </div>

            <div className="absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-l from-black/45 to-transparent pointer-events-none" />
          </div>

          {/* Корешок (Spine - Левая грань) */}
          <div
            className="book-spine absolute top-0 bottom-0 left-0 bg-[#35151A] overflow-hidden"
            style={{
              width: `${thickness}px`,
              height: `${height}px`,
              transform: `translateX(${-thickness / 2}px) rotateY(-90deg)`,
              backgroundImage: `url(${SPECIAL_BOOK_SPINE_COVER})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow:
                'inset 0 0 10px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.4)',
            }}
          >
            {/* Тиснение по краям корешка */}
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-r from-black/60 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-black/60 to-transparent" />
          </div>

          {/* Правый срез страниц (Right Edge - бумага) */}
          <div
            className="book-edge-right absolute top-[2px] bottom-[2px] right-0"
            style={{
              width: `${thickness - 4}px`,
              height: `${height - 4}px`,
              transform: `translateX(${thickness / 2 - 2}px) rotateY(90deg)`,
              background:
                'repeating-linear-gradient(to right, #F4EEE3 0px, #E9DFCE 2px, #D9C7AA 3px, #F4EEE3 4px)',
              boxShadow: 'inset 0 0 8px rgba(0,0,0,0.3)',
            }}
          />

          {/* Верхний срез страниц (Top Edge) */}
          <div
            className="book-edge-top absolute left-[2px] top-0"
            style={{
              width: `${width - 4}px`,
              height: `${thickness - 4}px`,
              transform: `translateY(${-thickness / 2 + 2}px) rotateX(90deg)`,
              background:
                'repeating-linear-gradient(to bottom, #F4EEE3 0px, #E9DFCE 2px, #D9C7AA 3px, #F4EEE3 4px)',
              boxShadow: 'inset 0 0 8px rgba(0,0,0,0.35)',
            }}
          />

          {/* Нижний срез страниц (Bottom Edge) */}
          <div
            className="book-edge-bottom absolute left-[2px] bottom-0"
            style={{
              width: `${width - 4}px`,
              height: `${thickness - 4}px`,
              transform: `translateY(${thickness / 2 - 2}px) rotateX(-90deg)`,
              background:
                'repeating-linear-gradient(to top, #F4EEE3 0px, #E9DFCE 2px, #D9C7AA 3px, #F4EEE3 4px)',
              boxShadow: 'inset 0 0 8px rgba(0,0,0,0.35)',
            }}
          />
        </div>

        {/* Реалистичная тень книги */}
        <div
          className="absolute -bottom-4 h-8 w-44 rounded-full bg-black/45 blur-xl pointer-events-none transition-transform"
          style={{
            transform: `scale(${1 + Math.abs(rotation.x) / 60}) rotateZ(${rotation.y / 8}deg)`,
          }}
        />
      </div>

      {/* Панель управления 3D-книгой */}
      {showControls ? (
        <>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--foreground))] shadow-sm transition hover:bg-[hsl(var(--secondary))]"
              title="Открыть / закрыть обложку книги"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#B1844D]" />
              <span>{isOpen ? 'Закрыть обложку' : 'Заглянуть внутрь'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoRotate((prev) => {
                  const next = !prev;
                  if (next && rotation.x === 0 && rotation.y === 0) {
                    setRotation({ x: 12, y: -28 });
                  }
                  return next;
                });
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                autoRotate
                  ? 'border-[#B1844D] bg-[#B1844D]/15 text-[hsl(var(--foreground))]'
                  : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'
              }`}
              title="Включить / остановить 3D-вращение"
            >
              <RotateCw className={`h-3.5 w-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
              <span>{autoRotate ? 'Остановить 3D' : 'Включить 3D'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-1 bg-[hsl(var(--secondary)/.6)] p-0.5 rounded-full border border-[hsl(var(--border))]">
              <button
                type="button"
                onClick={() => resetView(0)}
                className="px-2 py-1 text-[11px] font-bold rounded-full hover:bg-[hsl(var(--card))] transition"
                title="Спереди"
              >
                Лицо
              </button>
              <button
                type="button"
                onClick={() => resetView(-90)}
                className="px-2 py-1 text-[11px] font-bold rounded-full hover:bg-[hsl(var(--card))] transition"
                title="Корешок"
              >
                Корешок
              </button>
              <button
                type="button"
                onClick={() => resetView(180)}
                className="px-2 py-1 text-[11px] font-bold rounded-full hover:bg-[hsl(var(--card))] transition"
                title="Задняя сторона (Аннотация)"
              >
                Сзади
              </button>
            </div>
          </div>

          {/* Подсказка */}
          <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#B1844D]" />
            <span>Зажмите и тяните мышь/палец, чтобы покрутить книгу</span>
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-[10px] text-[#B1844D] flex items-center justify-center gap-1 font-mono uppercase tracking-wider">
          <Sparkles className="h-3 w-3" />
          <span>3D-книга · потяните, чтобы покрутить</span>
        </p>
      )}

      {/* Кнопка перехода к чтению */}
      {showDetailsButton && (
        <div className="mt-4 flex items-center gap-3">
          {onOpenReader ? (
            <button
              type="button"
              onClick={onOpenReader}
              className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-2.5 text-xs font-extrabold text-[hsl(var(--primary-foreground))] shadow-md transition hover:scale-105"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Читать роман (3 000 ₸)</span>
            </button>
          ) : (
            <Link
              href="/library?book=100"
              className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-2.5 text-xs font-extrabold text-[hsl(var(--primary-foreground))] shadow-md transition hover:scale-105"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Открыть в библиотеке · 3 000 ₸</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
