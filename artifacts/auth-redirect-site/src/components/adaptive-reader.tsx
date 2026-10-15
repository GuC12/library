import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { BookPage } from '@/data/books';
import { createPageFit } from '@/lib/reader-measure';
import { PageSheet } from './book-page-sheet';
import { locateLeaf, paginateBookPages, type ReaderLeaf, type ReaderLocation } from '@/lib/reader-pagination';
import { useLanguage } from '@/lib/i18n';

export type AdaptiveReaderHandle = { turn: (direction: 'next' | 'previous') => void };
type FlipState = { direction: 'next' | 'previous'; front: ReaderLeaf; back: ReaderLeaf; from: number; to: number; token: number };

export const AdaptiveReader = forwardRef<AdaptiveReaderHandle, {
  pages: BookPage[]; location: ReaderLocation; fontSize: number; width: 'narrow' | 'medium' | 'wide';
  theme: 'paper' | 'night'; onNavigate: (location: ReaderLocation) => void;
  onVisibleSources: (sources: number[]) => void;
}>(({ pages, location, fontSize, width, theme, onNavigate, onVisibleSources }, ref) => {
  const { t } = useLanguage();
  const container = useRef<HTMLDivElement>(null);
  const flipTimer = useRef<number | undefined>(undefined);
  const [size, setSize] = useState({ width: 0, height: 600 });
  const [flip, setFlip] = useState<FlipState | null>(null);
  const [jump, setJump] = useState('');
  const [zoomedPage, setZoomedPage] = useState<ReaderLeaf | null>(null);
  const [scanZoom, setScanZoom] = useState(100);
  const scanDialog = useRef<HTMLDialogElement>(null);
  const readingPages = pages;
  const columns = size.width >= 700 ? 2 : 1;
  const leafWidth = Math.floor(size.width / columns);
  const leafHeight = Math.max(380, Math.min(720, size.height, Math.round(leafWidth * 1.414)));
  const lineWidth = width === 'narrow' ? '28ch' : width === 'medium' ? '38ch' : '54ch';
  const textSize = Math.max(16, Math.min(28, fontSize));
  const textWidth = Math.max(100, Math.min(leafWidth - 64, (width === 'narrow' ? 28 : width === 'medium' ? 38 : 54) * textSize * .5));
  const leaves = useMemo<ReaderLeaf[]>(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) context.font = `${textSize}px Georgia`;
    const fits = createPageFit(textWidth - 4, leafHeight - 124, textSize,
      text => context?.measureText(text).width ?? text.length * textSize * .55);
    return paginateBookPages(readingPages, fits);
  }, [readingPages, textWidth, leafHeight, textSize]);
  const index = Math.floor(locateLeaf(leaves, location) / columns) * columns;
  const shownIndex = flip?.from ?? index;
  const last = Math.max(0, Math.floor((leaves.length - 1) / columns) * columns);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const update = () => setSize({ width: Math.floor(element.getBoundingClientRect().width), height: Math.max(380, window.innerHeight - 220) });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener('resize', update);
    update();
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  useEffect(() => () => window.clearTimeout(flipTimer.current), []);

  useEffect(() => {
    if (zoomedPage) scanDialog.current?.showModal();
    else scanDialog.current?.close();
  }, [zoomedPage]);

  const enlargePage = (page: ReaderLeaf) => { setScanZoom(100); setZoomedPage(page); };

  const navigate = (target: number) => {
    if (!leaves.length) return;
    window.clearTimeout(flipTimer.current);
    setFlip(null);
    const leaf = leaves[Math.min(Math.max(0, target), leaves.length - 1)];
    onNavigate({ source: leaf.source, offset: leaf.offset });
    setJump('');
  };

  const turn = (direction: 'next' | 'previous') => {
    if (flip || !leaves.length) return;
    const target = Math.min(Math.max(0, index + (direction === 'next' ? columns : -columns)), last);
    if (target === index) return;
    const frontIndex = direction === 'next' ? Math.min(index + columns - 1, leaves.length - 1) : index;
    // The reverse of a leaf is the first page of the next spread, or the last
    // page of the preceding spread when turning backwards.
    const backIndex = direction === 'next' ? target : Math.min(target + columns - 1, leaves.length - 1);
    const token = Date.now();
    setFlip({ direction, front: leaves[frontIndex], back: leaves[backIndex], from: index, to: target, token });
    window.clearTimeout(flipTimer.current);
    flipTimer.current = window.setTimeout(() => setFlip(current => current?.token === token ? null : current), 900);
    const targetLeaf = leaves[target];
    onNavigate({ source: targetLeaf.source, offset: targetLeaf.offset });
  };
  useImperativeHandle(ref, () => ({ turn }));

  const finishFlip = (token: number) => {
    window.clearTimeout(flipTimer.current);
    setFlip(current => current?.token === token ? null : current);
  };

  useEffect(() => {
    if (!flip && leaves.length) {
      const sources = leaves.slice(index, index + columns).flatMap(page => {
        const lastSource = page.sourceEnd ?? page.source;
        return Array.from({ length: lastSource - page.source + 1 }, (_, offset) => page.source + offset);
      });
      onVisibleSources([...new Set(sources)]);
    }
  }, [flip, columns, index, leaves, onVisibleSources]);

  const leftIndex = flip ? (flip.direction === 'next' ? flip.from : flip.to) : index;
  const rightIndex = flip ? (flip.direction === 'next' ? flip.to + 1 : flip.from + 1) : index + 1;
  const style = { '--leaf-height': `${leafHeight}px`, '--reader-font-size': `${fontSize}px`, '--reader-line-width': lineWidth, '--reader-text-width': `${textWidth}px` } as import('react').CSSProperties;

  return <div ref={container} className="library-adaptive-reader" style={style}>
    <div className={`library-book-spread${columns === 1 ? ' is-single-page' : ''}${flip ? ` turn-${flip.direction}` : ''}`} data-reader-theme={theme}>
      <div className="library-spread-static" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        <PageSheet page={leaves[leftIndex]} number={leftIndex + 1} side="left" onImageOpen={!flip && leaves[leftIndex]?.pageImage ? () => enlargePage(leaves[leftIndex]) : undefined} />
        {columns === 2 && <PageSheet page={leaves[rightIndex]} number={rightIndex + 1} side="right" onImageOpen={!flip && leaves[rightIndex]?.pageImage ? () => enlargePage(leaves[rightIndex]) : undefined} />}
      </div>
      {flip && <div key={flip.token} className={`library-flip-leaf${columns === 1 ? ' is-single-page' : ''}`} onAnimationEnd={event => {
        if (event.target === event.currentTarget && event.animationName.startsWith('library-flip-')) finishFlip(flip.token);
      }} aria-hidden="true">
        <div className="library-flip-face"><PageSheet page={flip.front} number={flip.direction === 'next' ? flip.from + columns : flip.from + 1} side={flip.direction === 'next' ? 'right' : 'left'} /></div>
        <div className="library-flip-face library-flip-back"><PageSheet page={flip.back} number={flip.direction === 'next' ? flip.to + 1 : flip.to + columns} side={flip.direction === 'next' ? 'left' : 'right'} /></div>
      </div>}
    </div>
    <div className="library-page-controls">
      <button type="button" disabled={shownIndex === 0 || Boolean(flip)} onClick={() => turn('previous')}>← {t('previous')}</button>
      <span aria-live="polite">{shownIndex + 1}{columns === 2 && shownIndex + 1 < leaves.length ? `–${shownIndex + 2}` : ''} / {leaves.length}</span>
      <button type="button" disabled={shownIndex >= last || Boolean(flip)} onClick={() => turn('next')}>{t('next')} →</button>
    </div>
    <form className="library-page-jump" onSubmit={event => { event.preventDefault(); const page = Number(jump); if (Number.isInteger(page) && page >= 1 && page <= leaves.length) navigate(Math.floor((page - 1) / columns) * columns); }}>
      <label>{t('page')} <input type="number" min={1} max={leaves.length} value={jump} placeholder={String(shownIndex + 1)} onChange={event => setJump(event.target.value)} required /></label>
      <button type="submit" className="library-outline-button">{t('readerGoToPage')}</button>
    </form>
    <dialog ref={scanDialog} className="library-scan-dialog" aria-label="Увеличенная страница книги" onClose={() => setZoomedPage(null)} onKeyDown={event => event.stopPropagation()}>
      <div className="library-scan-toolbar">
        <label>Масштаб <input type="range" min="100" max="200" step="25" value={scanZoom} onChange={event => setScanZoom(Number(event.target.value))} /> {scanZoom}%</label>
        <button type="button" onClick={() => setZoomedPage(null)}>Закрыть ×</button>
      </div>
      <div className="library-scan-viewport">{zoomedPage?.pageImage && <img src={zoomedPage.pageImage} alt={zoomedPage.title || 'Страница оригинального издания'} style={{ width: `${scanZoom}%` }} />}</div>
    </dialog>
  </div>;
});
