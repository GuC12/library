import React, { useEffect, useState, useRef } from 'react';
import {
  SPECIAL_BOOK_FRONT_COVER,
  SPECIAL_BOOK_BACK_COVER,
  SPECIAL_BOOK_SPINE_COVER,
} from '@/data/special-book';
import { Sparkles, BookOpen, Eye } from 'lucide-react';
import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import type { Book } from '@/data/books';
import { MISS_SHOPAHOLIC_FRONT_COVER, MISS_SHOPAHOLIC_BACK_COVER } from '@/data/miss-shopaholic-book';

interface Interactive3DBookProps {
  onOpenReader?: () => void;
  showDetailsButton?: boolean;
  showControls?: boolean;
  className?: string;
  compact?: boolean;
  initialRotation?: { x: number; y: number };
  book?: Book;
}

export function Interactive3DBook({
  onOpenReader,
  showDetailsButton = true,
  showControls = true,
  className = '',
  compact = false,
  initialRotation = { x: 6, y: -18 },
  book,
}: Interactive3DBookProps) {
  const { t } = useLanguage();
  const isShopaholic = book?.id === 1000;
  const frontCover = isShopaholic ? MISS_SHOPAHOLIC_FRONT_COVER : SPECIAL_BOOK_FRONT_COVER;
  const backCover = isShopaholic ? MISS_SHOPAHOLIC_BACK_COVER : SPECIAL_BOOK_BACK_COVER;
  // Углы вращения в градусах — сразу в 3D ракурсе со страницами и корешком
  const [rotation, setRotation] = useState<{ x: number; y: number }>(initialRotation);
  const [isDragging, setIsDragging] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startRotation = useRef(initialRotation);
  const returnTimer = useRef<number | null>(null);

  useEffect(() => {
    if (isDragging || isReturning) return;

    const interval = window.setInterval(() => {
      const time = Date.now();
      setRotation((prev) => ({
        x: startRotation.current.x + Math.sin(time / 1700) * 3,
        y: startRotation.current.y + Math.sin(time / 2100) * 13,
      }));
    }, 30);

    return () => window.clearInterval(interval);
  }, [isDragging, isReturning]);

  useEffect(() => {
    return () => {
      if (returnTimer.current) {
        window.clearTimeout(returnTimer.current);
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (returnTimer.current) {
      window.clearTimeout(returnTimer.current);
      returnTimer.current = null;
    }
    setIsReturning(false);
    setIsDragging(true);
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
    setIsReturning(true);
    setRotation(startRotation.current);
    returnTimer.current = window.setTimeout(() => {
      setIsReturning(false);
      returnTimer.current = null;
    }, 920);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
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
            transition: isDragging
              ? 'none'
              : isReturning
                ? 'transform 920ms cubic-bezier(0.19, 1, 0.22, 1)'
                : 'transform 80ms linear',
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
                backgroundImage: `url(${frontCover})`,
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
                <h4 className="font-serif text-sm font-semibold mt-1">{t('book3dEdition')}</h4>
                <p className="text-[10px] text-stone-300 mt-1 italic">
                  {t('book3dInnerQuote')}
                </p>
              </div>
              <div className="text-center font-mono text-[9px] text-[#B1844D]">
                {t('book3dCity')}
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
                  {t('book3dChapter')}
                </span>
                <span className="text-[9px] font-serif text-[#B1844D]">{t('book3dPage')}</span>
              </div>
              <p className="text-[10px] leading-relaxed text-[#2D2418] font-serif line-clamp-6">
                {isShopaholic ? book?.pages[0]?.text : t('book3dExcerpt')}
              </p>
            </div>
            <div className="flex items-center justify-center pt-2 border-t border-[#D9C7AA]">
              <span className="text-[9px] text-stone-500 font-serif italic">{t('book3dLove')}</span>
            </div>
          </div>

          {/* Задняя обложка (Back Cover) с полным текстом из PDF */}
          <div
            className="book-face book-back absolute inset-0 overflow-hidden rounded-l-[6px] shadow-2xl"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              transform: `translateZ(${-thickness / 2}px) rotateY(180deg)`,
              backgroundImage: `url(${backCover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow:
                'inset -4px 0 10px rgba(0,0,0,0.5), inset 2px 0 6px rgba(255,255,255,0.15)',
            }}
          >
            {/* На задней обложке аннотация уже нанесена. */}
            {!isShopaholic && <div className="absolute inset-0 p-3 sm:p-3.5 flex flex-col justify-between text-[#F4EEE3] bg-black/40 overflow-hidden">
              <div>
                <h3
                  className="font-serif text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-center text-[#9A2226] leading-tight"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 6px rgba(154,34,38,0.6)' }}
                >
                  {t('book3dBackTitle1')}<br />
                  {t('book3dBackTitle2')}
                </h3>
                <p className="mt-1 text-[7.5px] sm:text-[8px] italic text-[#D9C7AA] text-center leading-tight">
                  {t('book3dTagline')}
                </p>
                <p className="mt-1 text-[6.5px] sm:text-[7px] leading-[1.3] text-[#F4EEE3]/90 font-serif text-justify line-clamp-5">
                  {t('book3dBlurb')}
                </p>
                <p className="mt-1 text-[6.5px] sm:text-[7px] italic text-[#B1844D] text-center">
                  {t('book3dBackQuote')}
                </p>
                <div className="mt-1 text-[6px] sm:text-[6.5px] text-stone-300 leading-tight">
                  <p className="font-bold text-[#D9C7AA]">{t('book3dFeaturesTitle')}</p>
                  <ul className="list-disc pl-2.5 space-y-0.5 mt-0.5 text-stone-300">
                    <li>{t('book3dFeature1')}</li>
                    <li>{t('book3dFeature2')}</li>
                    <li>{t('book3dFeature3')}</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-center justify-center border-t border-[#B1844D]/30 pt-1 text-[7px] font-mono text-[#B1844D]">
                <span>Belladonna Press</span>
              </div>
            </div>}

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
              title={t('book3dToggleTitle')}
            >
              <BookOpen className="h-3.5 w-3.5 text-[#B1844D]" />
              <span>{isOpen ? t('book3dCloseCover') : t('book3dLookInside')}</span>
            </button>
          </div>

          {/* Подсказка */}
          <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#B1844D]" />
            <span>{t('book3dDragHint')}</span>
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-[10px] text-[#B1844D] flex items-center justify-center gap-1 font-mono uppercase tracking-wider">
          <Sparkles className="h-3 w-3" />
          <span>{t('book3dDragHintShort')}</span>
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
              <span>{t('book3dReadNovel')}</span>
            </button>
          ) : (
            <Link
              href="/library?book=100"
              className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-2.5 text-xs font-extrabold text-[hsl(var(--primary-foreground))] shadow-md transition hover:scale-105"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>{t('book3dOpenInLibrary')}</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
