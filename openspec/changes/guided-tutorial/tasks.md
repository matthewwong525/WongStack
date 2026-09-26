# Tasks

## 1. Landing page (app/)

- [x] 1.1 Rewrite `app/src/Tutorial.tsx`: "Learn the development loop", the intro line, the message block, a Copy button with `Copied` and copy-by-hand states in an `aria-live` status, and no step list
- [x] 1.2 Add the message block and button styles to `app/src/App.css`, phone first, grouped as tutorial styles
- [x] 1.3 Tests: move the tutorial test from `App.test.tsx` to a new `Tutorial.test.tsx` (heading, exact message, no step list, copy success, clipboard rejecting, clipboard absent); keep one ordering check in `App.test.tsx`; keep 100% coverage and the Stryker bar on changed files

## 2. Setup and sync (.agents/skills)

- [x] 2.1 `wong-setup/references/cloudflare.md` Step 5: end on the URL and "open it and copy the message in the box at the top"
- [x] 2.2 `wong-sync/references/payload-manifest.md` scaffold section: describe the new tutorial, and that it is copied only when `App.tsx` still renders `<Tutorial />`

## 3. Docs

- [x] 3.1 `wiki/stack/getting-started.md`: after step 5, say to open the site and copy the message
- [x] 3.2 `wiki/stack/mini-apps.md`: update the landing-page paragraph

## 4. Release

- [x] 4.1 Bump `VERSION` to 24.1.0 and add the `CHANGELOG.md` entry
- [x] 4.2 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`
- [ ] 4.3 `/save` for CI and the preview; on the preview, check the box at phone width and press Copy

## 5. One home page (mini-apps/, scripts/, app/)

- [x] 5.1 `scripts/mini-dashboard.mjs`: stop writing `index.html` and drop `dashboardHtml`; update the header comment
- [x] 5.2 `mini-apps/router.mjs`: answer `/apps/` with a 302 to `/`; update its header comment
- [x] 5.3 `hello/index.html` and `tips/index.html`: the back link reads Home and points at `/`
- [x] 5.4 `app/src/index.css` and `App.css`: the mini apps' plain style (system font, `color-scheme: light dark`, system colors, 1px outlines) for the page, list, tutorial box, and Copy button
- [x] 5.5 `AppList.tsx`: the failure state says to reload, with no `/apps/` link
- [x] 5.6 Tests: `scripts/tests/mini-apps.test.mjs` (no list page; `/apps/` redirects; files lists), `App.test.tsx` failure state; keep 100% coverage and the Stryker bar
- [x] 5.7 Docs and sync: `wiki/stack/mini-apps.md`, `wiki/stack/README.md`, `save/references/mini-app-save.md`, the payload manifest note for older landing pages, and the 24.1.0 changelog entry
