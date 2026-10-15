import { parse } from 'parse5';

const excluded = /(?:mw-editsection|mw-jump-link|ws-noexport|catlinks|noprint|mw-references-wrap|references|reflist|licensebox|sistersitebox|authority-control|metadata|navbox|toc|infobox|ws-author)/i;
const blockTags = new Set(['address', 'article', 'blockquote', 'br', 'dd', 'div', 'dl', 'dt', 'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'li', 'ol', 'p', 'pre', 'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul']);

function textContent(node) {
  if (node.nodeName === '#text') return node.value;
  if (!node.tagName) return (node.childNodes || []).map(textContent).join('');
  const tag = node.tagName.toLowerCase();
  const classes = node.attrs?.find(attribute => attribute.name === 'class')?.value || '';
  if (['script', 'style', 'noscript', 'form', 'nav'].includes(tag) || excluded.test(classes)) return '';
  const children = (node.childNodes || []).map(textContent).join('');
  if (tag === 'br' || tag === 'hr') return '\n';
  return blockTags.has(tag) ? `\n\n${children}\n\n` : children;
}

export function extractWikisourceText(markup) {
  const document = parse(markup);
  const pending = [document];
  let content;
  while (pending.length) {
    const node = pending.pop();
    const classes = node.attrs?.find(attribute => attribute.name === 'class')?.value || '';
    if (node.tagName === 'div' && classes.split(/\s+/).includes('mw-parser-output')) { content = node; break; }
    pending.push(...(node.childNodes || []).slice().reverse());
  }
  if (!content) throw new Error('Wikisource page has no mw-parser-output body');
  return textContent(content).replace(/\u00a0/g, ' ').replace(/[\t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
