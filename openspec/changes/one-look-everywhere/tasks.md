# Tasks

## 1. The shared look

- [x] 1.1 Write `.agents/skills/plan/references/look.css`: shadcn's neutral light and dark tokens as the fallback `:root` sets, then the parts from [design.md](design.md#lookcss-holds-shadcns-parts-as-plain-classes) (button variants, field, card, tag, focus ring), on element selectors and classes. Verify by reading it against `app/src/components/ui/{button,input,card,badge}.tsx`.
- [x] 1.2 Write `.agents/skills/plan/scripts/look.mjs` exporting `lookCss(root)`: read both colour sets from `<root>/app/src/index.css`, fall back per set to `look.css`'s, and return tokens followed by parts. Verify with 1.3.
- [x] 1.3 Add `scripts/tests/look.test.mjs`: it reads both sets from the shipped `app/src/index.css`; a changed `--primary` in a temp copy shows up in the output in light and dark; a missing file or set falls back and names the set; the output holds no `url(` or `@import`. Verify with `node --test scripts/tests/look.test.mjs`.

## 2. The review page

- [x] 2.1 Restyle `review-kit.html`'s one `<style>` by the [colour mapping](design.md#review-kit-colour-mapping): a `/* look */` marker first, every hard-coded colour a token, a dark mode through the tokens, Pele's variables on tokens, and sentence-case muted labels. Keep every size the touch-target and desktop tests pin. Verify the kit still has one `<style>` and one `<script>`.
- [x] 2.2 In `build-review.mjs`, replace the marker with `lookCss(repoRoot)` and fail when the marker is missing. Verify in `scripts/tests/review.test.mjs`: the built page carries the tokens and parts, still fetches nothing, and a kit without the marker throws.
- [x] 2.3 Update `scripts/tests/review-browser.test.mjs` wherever it asserts old colours, and add a dark-mode case: with `prefers-color-scheme: dark` emulated, the body, a card, and the bar have dark backgrounds and readable text (contrast at least 4.5:1). Verify with the browser suite.
- [x] 2.4 Update the review-file paragraph in `wiki/ux-principles.md` to say the page follows the device's light or dark setting in the app's colours. Verify with the wiki checks.

## 3. The private pages

- [x] 3.1 Cut `private-page.css` down to page-only rules (steps, tick, `Private link` tag, actions, missing mark) drawn from the tokens, with the blue removed, the tick on `--primary`, and the missing mark on `--destructive`. Keep 16px fields and the 3rem main button. Restyle the per-page `<style>` blocks in `keys-page.html`, `passwords-page.html`, `form-page.html`, and `view-page.html` the same way. Verify no `#`-hex colour remains outside a fallback.
- [x] 3.2 Serve `/page.css` from `hand-over.mjs` as `lookCss()` of the scripts' own checkout plus `private-page.css`. Verify in `scripts/tests/hand-over.test.mjs` that `/page.css` carries the tokens, then the page rules.
- [x] 3.3 Rebuild `reply-link.mjs`'s `CLOSED_PAGE` as a small centred card from `lookCss`. Verify in `scripts/tests/reply-link.test.mjs` that a closed link's page holds the tokens and still says *This link has closed*.
- [x] 3.4 Update `scripts/tests/form-page.test.mjs` and `scripts/tests/view-page.test.mjs` where they read `private-page.css` alone or pin old colours. Verify with `node --test` on both.

## 4. The app

- [x] 4.1 Polish `app/src/index.css`'s base layer and `app/src/Layout.tsx`'s bar as [design.md](design.md#app-polish) says. Update `app/src/style.test.ts` if it pins heading sizes. Verify with `npm test` in `app/` (coverage stays 100%).
- [x] 4.2 Extend the shared-look paragraph in `wiki/stack/mini-apps.md`: the review page and private pages take their colours from `app/src/index.css` through `look.mjs`, so a rebrand reaches them. Verify with the wiki checks.

## 4b. Skeletons

- [x] 4b.1 Run `npx shadcn@latest add skeleton` in `app/` and leave the part as written; stop its pulse under reduced motion in `index.css`. Verify the part is unchanged from the command's output.
- [x] 4b.2 Replace each loading line in `Home.tsx`, `AppPage.tsx`, `access/App.tsx`, `access/Owner.tsx`, and `AssistantSetup.tsx` with the [skeletons](design.md#skeletons), keeping the words in an `sr-only` span inside the `role="status"` element. Add or update tests so each loading state shows `aria-hidden` skeleton blocks and its status still reads the words. Verify with `npm test` in `app/` (coverage stays 100%).
- [x] 4b.3 Add `.skeleton` to `look.css` and a skeleton card to `keys-page.html` that shows until `/keys` answers. Verify in `scripts/tests/hand-over.test.mjs` or the key page's test that the card is present before the list and gone after.
- [x] 4b.4 Mention the skeletons in the shared-look paragraph of `wiki/stack/mini-apps.md` (a loading state shows skeletons shaped like what loads), and in the CHANGELOG entry. Verify with the wiki checks.

## 5. Release notes and records

- [x] 5.1 Add a `## Next (minor) — One calm look on every page` entry at the top of `CHANGELOG.md`, in plain words, with an **Updating** line: a rebranded `app/src/index.css` now colours the review and private pages too. Verify the payload checks pass.
- [x] 5.2 Add `.agents/skills/plan/references/look.css` to the `review` area's paths in `.agents/skills/memory/references/areas.json`, and plan to add `openspec/specs/shared-look/spec.md` to its docs at archive. Verify with `node --test scripts/tests/memory-areas.test.mjs`.

## 6. Final checks

- [ ] 6.1 Run the local pre-check (`node scripts/payload-checks.mjs` and the changed suites), then `/save` and open the preview. Take phone and desktop pictures in light and dark of a built review page, a key link, and Home, plus a loading skeleton, and show them in the chat with a link to an example of each page.
