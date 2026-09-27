# Tasks

## 1. Main app pages

- [x] 1.1 Add `react-router` to `app/package.json` and update the lockfile; verify `npm ls react-router` resolves one version
- [x] 1.2 Move the page into folders per design.md: `pages/home/` (`Home.tsx`, `Tutorial.tsx`/`.css`/`.test.tsx`, `AppList.tsx`/`.css`), `lib/apps.ts`; delete `App.tsx`; update `Tutorial.tsx`'s removal comment to name its CSS file and its line in `Home.tsx`
- [x] 1.3 Add `router.tsx` (exported `routes`), `Layout.tsx`, and `pages/not-found/NotFound.tsx`; make `main.tsx` create the browser router and render `RouterProvider`
- [x] 1.4 Split `App.test.tsx` into `pages/home/Home.test.tsx` (loading, empty, failed, loaded) and `router.test.tsx` (`/` shows Home, `/nothing` shows Not found and links home); verify 100% coverage and a 100% mutation score in CI via `/save`

## 2. Shared look

- [x] 2.1 Create `app/public/style.css` with the shared rules, link it from `app/index.html`, and delete `index.css` and `App.css`; move the list and tutorial rules into their parts' CSS under `.app-list` and `.tutorial` class names, and add those classes to the markup
- [x] 2.2 Add `app/src/style.test.ts`: `app/index.html` links `/style.css`, and `app/public/style.css` exists and sets `color-scheme`

## 3. Worker API

- [x] 3.1 Add `worker/api/router.ts` (`API_PREFIX`, `handleApi` over a `Map`) and `worker/api/health.ts`; make `worker/index.ts` send `/api/` to `handleApi` and drop the placeholder
- [x] 3.2 Add `worker/api/router.test.ts` (health hit, unknown path, wrong method, `constructor`) and update `worker/index.test.ts` so `/api/health` answers `{ ok: true }` and `/api/nothing` answers 404

## 4. Mini apps

- [x] 4.1 Rework `mini-apps/apps/hello/`: `api.mjs` dispatches through a route list; `index.html` links `/style.css` and loads `app.js`, the moved inline script; add `page.test.mjs`; verify `(cd mini-apps/apps/hello && node --test)`
- [x] 4.2 Rework `mini-apps/apps/tips/` (not payload): `style.css`, `app.js`, and the `/style.css` link; verify `(cd mini-apps/apps/tips && node --test)`

## 5. Conventions and docs

- [x] 5.1 In `.agents/rules/code.md`, add `"mini-apps/**"` to `paths:` and the *Where things go* section from design.md
- [x] 5.2 Update `wiki/stack/mini-apps.md` (landing-page paragraph, one bullet in *The rules*), `wiki/ux-principles.md` (link the code rule's section for UI conventions), and the payload manifest's tutorial rule
- [x] 5.3 Add `app/src/App.tsx` and `app/src/index.css` to `scripts/retired-names.json`, allowing the manifest's flat-layout note; verify `node scripts/check-retired-names.mjs`
- [x] 5.4 Add a `## Next (minor) — The starter app is built to grow` entry to `CHANGELOG.md` with an **Updating** note: a starter-app target takes the move whole; a rebuilt app keeps its layout; existing mini apps keep working and can adopt `/style.css` and `app.js`

## 6. Verify

- [x] 6.1 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `openspec validate grow-apps-in-files --strict --no-interactive`
- [x] 6.2 `/save`, and confirm the test and payload checks pass in CI
- [x] 6.3 On the preview, at phone width in light and dark mode: `/`, `/apps/hello/`, and `/apps/tips/` look as before and load `/style.css`; `/nothing-here` shows Not found and *Go home* returns to `/`; `/api/health` answers `{ "ok": true }`
