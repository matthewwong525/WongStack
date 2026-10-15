# Tasks

## 1. Landing page

- [x] 1.1 Replace the rotator with the plain headline and new hero lede in `site/src/Landing.tsx`; delete `site/src/Rotator.tsx` and its `.rotator*` CSS. Source review confirms the hero keeps its picture, caption and actions.
- [x] 1.2 Rewrite `site/src/Story.tsx` as the six scenes in design (same three, Data, Process with `YourApps embedded`, Reason, ad example, team), with the deck's words; add the setup section before install and set the order in `Landing.tsx`. Source review confirms short labels, no "remember" request, and the SOP card reads as crossed out without color.
- [x] 1.3 Style the new figures with the existing story styles and accents in `site/src/index.css`, phone first; remove selectors left unused.
- [x] 1.4 Update `site/src/App.test.tsx`, `site/src/Landing.test.tsx` and `site/src/Site.test.tsx` for the new headline, heading order and scenes, beside the source; drop the rotator tests; add assertions for the spec's two scenarios.

## 2. Shared text

- [x] 2.1 Update the descriptions and image alt text in `site/index.html`, the line in `site/brand/share-image.svg`, re-render `site/public/share.png`, and update `site/src/shareCard.test.ts`. If no renderer is available, keep the old picture and alt text and report it.
- [x] 2.2 Change README's opening bold line to **Self-drive your business.**; add a patch CHANGELOG entry.

## 3. Verify

- [x] 3.1 Run the local pre-check (`checks.mjs --worktree`) and `openspec validate self-drive-landing-page --strict --no-interactive`; fix failures.
- [ ] 3.2 (superseded by 5.3) Preview the landing page at phone and desktop widths: section order, no sideways scroll, sample tools still work, install copy works.

## 4. Revision: shorter, slide pictures, comparison chart

- [x] 4.1 Remove the hero screenshot, the example tools in Process, and the team section; delete code, styles and tests nothing else uses. Source review confirms the page order in the proposal.
- [x] 4.2 Add the car and road pictures from the deck as WebP under `site/public/art/`, and redraw slides 3, 4, 5, 7 and 8 with the slide colors and inline icons.
- [x] 4.3 Open each source in design and set every chart mark in `site/src/compare.ts` only from a confirmed quote; render the chart after the ad example. Source review confirms no mark says another product lacks something.
- [x] 4.4 Replace the comparison guard in `site/src/Site.test.tsx` with tests of the new requirement; update `App.test.tsx`, `Landing.test.tsx` and the wiki page beside the source.

## 5. Verify the revision

- [x] 5.1 Run the site's `npm test` and `npm run build`, the local pre-check, and `openspec validate self-drive-landing-page --strict --no-interactive`.
- [x] 5.2 Report the loosened comparison check with its `Check:` bullet.
- [ ] 5.3 Preview at phone and desktop widths: section order, no sideways page scroll, the chart readable, install copy works.
