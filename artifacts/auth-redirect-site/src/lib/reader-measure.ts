import type { BookPage } from '../data/books';

/** Match the reader's fixed typography, including short dialogue paragraphs. */
export function createPageFit(width: number, height: number, fontSize: number, measure: (text: string) => number) {
  const cache = new Map<string, number>();
  const pixels = (text: string) => {
    let value = cache.get(text);
    if (value === undefined) { value = measure(text); cache.set(text, value); }
    return value;
  };
  const lines = (text: string, scale = 1) => {
    let total = 0;
    for (const row of text.split('\n')) {
      let used = fontSize * 1.2;
      total++;
      for (const token of row.split(/(\s+)/).filter(Boolean)) {
        const length = pixels(token) * scale;
        if (used + length <= width) { used += length; continue; }
        if (/^\s+$/.test(token)) continue;
        if (length <= width) { total++; used = length; }
        else {
          for (const char of token) {
            const size = pixels(char) * scale;
            if (used + size > width) { total++; used = 0; }
            used += size;
          }
        }
      }
    }
    return total;
  };
  return (page: BookPage) => {
    let used = page.title ? lines(page.title, 1.2) * fontSize * 1.5 + 18 : 0;
    for (const block of page.text.split(/\n\s*\n/)) {
      const text = block.trim();
      if (!text) continue;
      if (/^!\[/.test(text)) used += 180;
      else if (/^---+$/.test(text)) used += 34;
      else if (/^#{1,2} /.test(text)) used += lines(text.replace(/^#+ /, ''), 1.12) * fontSize * 1.5 + 26;
      else used += lines(text.replace(/\*+/g, '').replace(/^> /, ''), text.includes('**') ? 1.08 : 1) * fontSize * 1.6 + fontSize * .25;
      if (used > height) return false;
    }
    return used <= height;
  };
}
