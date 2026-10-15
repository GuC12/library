"""Extract both halves of the original spreads, preserving the full text layer."""
import sys, json, re
from pathlib import Path
import pymupdf

doc = pymupdf.open(sys.argv[1])
pages = []
for index in range(3, 19):
    page = doc[index]
    for side in range(2):
        clip = pymupdf.Rect(page.rect.width / 2 * side, 0, page.rect.width / 2 * (side + 1), page.rect.height)
        parts = []
        for block in page.get_text('blocks', clip=clip, sort=True):
            if block[6] != 0:
                continue
            raw = block[4].strip()
            if not raw or re.fullmatch(r'\d+', raw):
                continue
            # Soft hyphens belong to the printed line wrap, not the word.
            raw = re.sub(r'\u00ad\s*\n\s*', '', raw).replace('\u00ad', '')
            rows = raw.splitlines()
            text = ''
            previous = ''
            for row in rows:
                row = row.strip()
                if not row:
                    continue
                text += ('\n\n' if text and len(previous) < 45 and re.search(r'[.!?…»]$', text) else ' ' if text else '') + row
                previous = row
            if raw.startswith('Глава '):
                text = '# ' + ' '.join(rows)
            parts.append(text)
        pages.append({'kicker': 'Письма, которые не должны были дойти', 'title': '', 'text': '\n\n'.join(parts)})

assert len(pages) == 32
assert sum(len(p['text']) for p in pages) > 30000
target = Path(__file__).resolve().parent.parent / 'src/data/special-book-readable.json'
target.write_text(json.dumps(pages, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(f'Extracted {len(pages)} source pages, {sum(len(p["text"]) for p in pages)} characters')
