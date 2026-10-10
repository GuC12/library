# Cover restoration

Tool: built-in image_gen (image editing). Original assets retained.

## Letters

Source: src/assets/special-book/cover-front.jpg
Website asset: src/assets/special-book/cover-front-restored.jpg (JPEG quality 92); generated PNG master retained.

Prompt:
Edit target: the supplied existing Russian book cover. Faithful high-resolution restoration for website, portrait 226:320 aspect ratio. Preserve the EXACT original composition, dark wood, stacked aged envelopes, red wax seal, red heart-shaped thread, white quill. Improve crispness, reconstruct fine paper/wood/feather detail, remove jpeg artifacts and pixelation. Preserve red title at top, exactly: «ПИСЬМА КОТОРЫЕ НЕ ДОЛЖНЫ БЫЛИ ДОЙТИ», in same stacked bold lettering. Preserve handwritten «Я люблю тебя» on envelope. No new text, no redesign, no borders or mockup; full-bleed cover only. Save final high-resolution image and return its local path.

## Miss Shopaholic

Source: src/assets/miss-shopaholic/cover-front.png
Website asset: src/assets/miss-shopaholic/cover-front-restored.jpg (JPEG quality 92); generated PNG master retained.

Prompt:
Edit target: supplied existing Russian book cover, preserve exact full-bleed portrait composition and design. High-quality restoration: clean smooth silhouettes of skyline and lit windows, crisp typography, refine hair, clothing and shopping bags, remove pixelated edges and compression artifacts. Keep peach sunset sky, dark skyscrapers, blonde walking woman with shopping bags, red carpet and two glowing bollards. Preserve exact title «Мисс Шопоголик» at top and exact author «Стейси Крамер» at bottom. Do not crop, rearrange, change wording, add details or new design. Restore sharp original artwork faithfully for web book cover. Return final image local path.

## Guide

src/assets/library-ghost.svg is a native vector illustration based on the user's sketch, drawn directly as SVG; no bitmap embedded.

## Back covers

Tool: built-in image_gen (faithful restoration); JPEG quality 92 for website assets. PNG masters and original files retained.

### Letters

Website asset: src/assets/special-book/cover-back-restored.jpg

Prompt:
Edit target: supplied back cover for the Russian book Letters. Faithful high-resolution restoration, portrait ratio 561:842. Preserve the existing dark brown aged wood texture, exact grain direction, subtle illumination and knots. Improve natural crisp fine wood detail and remove blur and compression artifacts. Match the dark wooden front cover. This back cover contains NO typography or graphics: keep it entirely wood. Do not add text, symbols, borders, objects, mockup or redesign. Full-bleed flat cover only.

### Miss Shopaholic

Website asset: src/assets/miss-shopaholic/cover-back-restored.jpg

Prompt:
Edit target: supplied Miss Shopaholic back cover. Faithfully restore crisp high-quality artwork, portrait ratio 1054:1492. Preserve exact composition: peach orange sky, black skyscrapers with illuminated windows, gray paving, red carpet, two glowing black bollards, barcode at bottom. Smooth pixelated edges and reconstruct clean sharp window silhouettes and fine textures, matching the restored front cover. Preserve exact Russian text, same positions and white serif type: «Иногда одна встреча может изменить всё.» then a small heart divider then «Любовь, амбиции, большие мечты и город, который никогда не спит...». Keep barcode caption exactly «9781234567897». No new text, no additions, no rearranging or cropping, full-bleed flat cover only.

## Crisp back-cover lettering for Miss Shopaholic

Website image: src/assets/miss-shopaholic/cover-back-lettering-base.jpg. Built-in image_gen removes old raster lettering from the sky; the original words are rendered as crisp HTML text over the artwork with no opaque panel. PNG master retained.

Prompt:
Edit target: supplied existing Miss Shopaholic BACK cover. Remove ONLY the white Russian text in the upper peach sky (both paragraphs 'Иногда одна встреча может изменить всё.' and 'Любовь, амбиции, большие мечты и город, который никогда не спит...') and the small white heart with horizontal divider between them. Fill only those lettering marks with the matching uninterrupted peach/orange sky, preserving the exact skyline silhouettes, window locations, all buildings including uppermost tower tips, red carpet, paving, bollards, barcode caption 9781234567897, colors and portrait framing. The website will overlay crisp HTML text in this same sky area. Do NOT add text, do NOT crop or rearrange, no panels, no new skyline, no other changes. Preserve entire original artwork and dimensions as closely as possible.