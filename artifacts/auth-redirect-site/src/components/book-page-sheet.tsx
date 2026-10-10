import type { BookPage } from '@/data/books';

export function PageSheet({
  page,
  number,
  side,
  onTurn,
  disabled,
}: {
  page?: BookPage;
  number: number;
  side: 'left' | 'right';
  onTurn?: () => void;
  disabled?: boolean;
}) {
  if (!page) {
    return <article className={`library-page library-page-${side} library-page-empty`} aria-hidden="true" />;
  }

  const interactive = Boolean(onTurn) && !disabled;

  return (
    <article
      className={`library-page library-page-${side}${interactive ? ' is-interactive' : ''}${page.pageImage ? ' library-page-has-image' : ''}`}
      onClick={interactive ? onTurn : undefined}
      onKeyDown={interactive ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onTurn?.(); } } : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {page.pageImage ? (
        <div className="library-page-image-wrapper">
          <img
            src={page.pageImage}
            alt={page.title || `Страница ${number}`}
            className="library-page-pdf-image"
            loading="eager"
          />
        </div>
      ) : (
        <>
          <span>{page.kicker}</span>
          {page.title && <h3>{page.title}</h3>}
          <p>{page.text}</p>
          <small>{number}</small>
        </>
      )}
    </article>
  );
}

