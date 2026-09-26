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
