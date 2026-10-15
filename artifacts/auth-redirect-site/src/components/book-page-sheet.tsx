import type { ReactNode } from 'react';
import type { BookPage } from '@/data/books';

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const tokens = /(!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)|\*\*(.+?)\*\*|\*(.+?)\*)/g;
  const output: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = tokens.exec(text))) {
    if (match.index > cursor) output.push(text.slice(cursor, match.index));
    if (match[0].startsWith('![')) {
      output.push(<img className="library-inline-image" key={`${keyPrefix}-${key++}`} src={match[3]} alt={match[2]} title={match[4]} loading="lazy" />);
    } else if (match[5] !== undefined) {
      output.push(<strong key={`${keyPrefix}-${key++}`}>{match[5]}</strong>);
    } else {
      output.push(<em key={`${keyPrefix}-${key++}`}>{match[6]}</em>);
    }
    cursor = tokens.lastIndex;
  }

  if (cursor < text.length) output.push(text.slice(cursor));
  return output;
}

function renderPageText(text: string): ReactNode[] {
  return text.split(/\n\s*\n/).flatMap((block, index) => {
    const value = block.trim();
    if (!value) return [];
    if (value.startsWith('# ')) return [<h4 key={index}>{renderInline(value.slice(2), `heading-${index}`)}</h4>];
    if (value.startsWith('## ')) return [<h4 key={index}>{renderInline(value.slice(3), `heading-${index}`)}</h4>];
    if (value.startsWith('> ')) return [<blockquote key={index}>{renderInline(value.slice(2).replace(/\n> ?/g, '\n'), `quote-${index}`)}</blockquote>];
    if (/^---+$/.test(value)) return [<hr key={index} />];
    const image = value.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)$/);
    if (image) {
      return [
        <figure className="library-inline-illustration" key={index}>
          <img src={image[2]} alt={image[1]} loading="lazy" />
          {image[3] ? <figcaption>{image[3]}</figcaption> : null}
        </figure>,
      ];
    }
    return [<p key={index}>{renderInline(value, `paragraph-${index}`).map((node, nodeIndex) => <span key={nodeIndex}>{node}</span>)}</p>];
  });
}

export function PageSheet({
  page,
  number,
  side,
  onTurn,
  disabled,
  onImageOpen,
}: {
  page?: BookPage;
  number: number;
  side: 'left' | 'right';
  onTurn?: () => void;
  disabled?: boolean;
  onImageOpen?: () => void;
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
          {onImageOpen && <button type="button" className="library-scan-enlarge" onClick={onImageOpen} aria-label={`Увеличить страницу ${number}`}>Увеличить страницу ↗</button>}
        </div>
      ) : (
        <>
          {page.kicker && <span>{page.kicker}</span>}
          {page.title && <h3>{page.title}</h3>}
          <div className="library-book-content">{renderPageText(page.text)}</div>
          <small>{number}</small>
        </>
      )}
    </article>
  );
}

