import type { BookPage } from '../data/books';

export type ReaderLocation = { source: number; offset: number };
export type ReaderLeaf = BookPage & ReaderLocation & { end: number; sourceEnd?: number; endOffset?: number };

/** Source offsets always refer to the unchanged original text. */
export function paginateSource(page: BookPage, source: number, fits: (page: BookPage) => boolean): ReaderLeaf[] {
  if (page.pageImage || !page.text) return [{ ...page, source, offset: 0, end: page.text.length }];
  const leaves: ReaderLeaf[] = [];
  let offset = 0;
  while (offset < page.text.length) {
    const candidate = (end: number): BookPage => ({ ...page, title: offset === 0 ? page.title : '', text: page.text.slice(offset, end) });
    let low = offset + 1, high = Math.min(page.text.length, offset + 256), best = offset;
    while (high < page.text.length && fits(candidate(high))) high = Math.min(page.text.length, offset + (high - offset) * 2);
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (fits(candidate(middle))) { best = middle; low = middle + 1; }
      else high = middle - 1;
    }
    // Oversized atomic content still has a scrollable fallback; never drop text.
    let end = Math.max(offset + 1, best);
    if (end < page.text.length) {
      // Prefer paragraph boundaries, then word boundaries. Do not cut markdown
      // images or emphasis: move an atomic span to the next page instead.
      const segment = page.text.slice(offset, end);
      const paragraph = segment.lastIndexOf('\n\n');
      const whitespace = segment.search(/\s+\S*$/);
      const boundary = paragraph > segment.length * 0.88 ? paragraph + 2 : whitespace > 0 ? whitespace + 1 : segment.length;
      end = offset + boundary;
      for (const match of page.text.slice(offset, end + 2000).matchAll(/!\[[^\]]*\]\([^)]*\)|\*\*[^*]+\*\*|\*[^*]+\*/g)) {
        const start = offset + match.index!;
        const finish = start + match[0].length;
        if (start < end && finish > end) { end = start > offset ? start : finish; break; }
      }
      // Keep Unicode surrogate pairs together, including CJK extensions/emoji.
      if (end < page.text.length && /[\uD800-\uDBFF]/.test(page.text[end - 1])) end++;
    }
    leaves.push({ ...candidate(end), source, offset, end });
    offset = end;
  }
  return leaves;
}

/** Reflow the short source fragments used by many editions into fuller physical pages. */
export function paginateBookPages(pages: BookPage[], fits: (page: BookPage) => boolean): ReaderLeaf[] {
  type Span = { start: number; end: number; source: number; offset: number; sourceLength: number };
  type Flow = { kicker: string; title: string; text: string; spans: Span[]; lastTitle: string };
  const leaves: ReaderLeaf[] = [];
  let flow: Flow | undefined;

  const append = (value: string, source: number, offset: number, sourceLength = value.length) => {
    if (!flow || !value) return;
    const start = flow.text.length;
    flow.text += value;
    flow.spans.push({ start, end: flow.text.length, source, offset, sourceLength });
  };
  const locationAt = (position: number, end = false): ReaderLocation => {
    const spans = flow!.spans;
    const span = end
      ? spans.find(item => position > item.start && position <= item.end) ?? spans.find(item => item.start >= position) ?? spans.at(-1)!
      : spans.find(item => position >= item.start && position < item.end) ?? spans.find(item => item.start >= position) ?? spans.at(-1)!;
    return { source: span.source, offset: span.offset + Math.min(span.sourceLength, Math.max(0, Math.min(position, span.end) - span.start)) };
  };
  const flush = () => {
    if (!flow || !flow.text) { flow = undefined; return; }
    const page: BookPage = { kicker: flow.kicker, title: flow.title, text: flow.text };
    for (const leaf of paginateSource(page, flow.spans[0]?.source ?? 0, fits)) {
      const start = locationAt(leaf.offset);
      const finish = locationAt(leaf.end, true);
      leaves.push({ ...leaf, ...start, kicker: pages[start.source].kicker, end: finish.source === start.source ? finish.offset : leaf.end, sourceEnd: finish.source, endOffset: finish.offset });
    }
    flow = undefined;
  };

  pages.forEach((page, source) => {
    if (page.pageImage) {
      flush();
      leaves.push({ ...page, source, offset: 0, end: page.text.length, sourceEnd: source, endOffset: page.text.length });
      return;
    }
    if (!flow) {
      flow = { kicker: page.kicker, title: page.title, text: '', spans: [], lastTitle: page.title };
    } else if (page.title && page.title !== flow.lastTitle || flow.kicker !== page.kicker) {
      append(`\n\n# ${page.kicker !== flow.kicker ? page.kicker + (page.title ? ' · ' : '') : ''}${page.title}\n\n`, source, 0, 0);
      flow.lastTitle = page.title;
      flow.kicker = page.kicker;
    }
    if (flow.text) append('\n\n', source, 0, 0);
    append(page.text, source, 0);
  });
  flush();
  return leaves;
}

export function locateLeaf(leaves: ReaderLeaf[], location: ReaderLocation): number {
  const index = leaves.findIndex(page => {
    const startsBefore = page.source < location.source || page.source === location.source && page.offset <= location.offset;
    const endSource = page.sourceEnd ?? page.source;
    const endOffset = page.endOffset ?? page.end;
    const endsAfter = endSource > location.source || endSource === location.source && (endOffset > location.offset || endOffset === 0);
    return startsBefore && endsAfter;
  });
  if (index >= 0) return index;
  const last = leaves.findLastIndex(page => page.source <= location.source);
  return Math.max(0, last);
}
