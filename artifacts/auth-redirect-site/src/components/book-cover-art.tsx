import lettersBack from '@/assets/special-book/cover-back-restored.jpg';
import fashionBack from '@/assets/miss-shopaholic/cover-back-lettering-base.jpg';
import type { CSSProperties } from 'react';
import type { Book } from '@/data/books';
import './book-cover-art.css';

export function getBookArtwork(book: Book): string | undefined {
  return book.coverImage && !book.coverImage.startsWith('cover-') ? book.coverImage : undefined;
}

export function BookCoverArt({ book, side = 'front', compact = false, categoryLabel }: {
  book: Book; side?: 'front' | 'back'; compact?: boolean; categoryLabel?: string;
}) {
  const image = getBookArtwork(book);
  if (book.id === 100 || book.id === 1000) {
    const artwork = side === 'back' ? (book.id === 100 ? lettersBack : fashionBack) : image;
    return (
      <div className={`book-cover-art book-cover-original book-cover-art-${side}${compact ? ' is-compact' : ''}`}
        data-cover-side={side} style={{ '--cover-tone': book.spine } as CSSProperties}>
        <img className="book-cover-original-image" src={artwork} alt="" draggable={false} />
        {side === 'back' && book.id === 100 && (
          <div className="book-cover-letters-back-text">
            <strong className="book-cover-art-title">{book.title}</strong>
            <p className="book-cover-art-summary">Одно случайное письмо. Два сердца из прошлого. Тайна, способная изменить всё.</p>
            <span className="book-cover-art-author">{book.author}</span>
            <span className="book-cover-back-publisher">Belladonna Press</span>
          </div>
        )}
        {side === 'back' && book.id === 1000 && (
          <div className="book-cover-shop-back-text">
            <p className="book-cover-shop-tagline">Иногда одна встреча<br />может изменить всё.</p>
            <span className="book-cover-shop-divider" aria-hidden="true">— ♥ —</span>
            <p className="book-cover-shop-description">Любовь, амбиции, большие мечты и город, который никогда не спит...</p>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`book-cover-art book-cover-edition book-cover-art-${side}${compact ? ' is-compact' : ''}`}
      data-cover-side={side} style={{ '--cover-tone': book.spine } as CSSProperties}>
      {side === 'front' && image ? (
        <img className="book-cover-original-image" src={image} alt="" draggable={false} loading="lazy" />
      ) : (
        <div className="book-cover-art-content">
          <span className="book-cover-art-category">{categoryLabel || book.category}</span>
          <div className="book-cover-art-copy">
            <strong className="book-cover-art-title">{book.title}</strong>
            {side === 'back' && <p className="book-cover-art-summary">{book.summary}</p>}
            <span className="book-cover-art-author">{book.author}</span>
          </div>
        </div>
      )}
    </div>
  );
}
