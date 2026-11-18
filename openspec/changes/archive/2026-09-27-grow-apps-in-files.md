<!-- openspec-archive v1 2026-09-27-grow-apps-in-files -->
<!-- file proposal.md utf8 9704 -->
# The starter app is built to grow

**Status:** ready-to-ship
**Branch:** explore/wongstack-style-guide
**Open questions:** none

## Why

Today the starter app is one page in a flat folder, and the server answers every `/api` request with a leftover placeholder. When someone asks for a second page, nothing shows the agent where it goes, so code piles into the files that already exist. Mini apps are worse: page, styling, and script all sit in one file. You want the starter app to already be set up for growth, with a router, folders, and good conventions in place, so each new page or route follows the shape that's already there. You also want to keep WongStack's light, plain look.

## What Changes

- **Pages go through a router.** The home page is the router's only route today, with a "page not found" screen for anything else. Each page gets its own folder, holding the page's parts, and each part keeps its styles and tests beside it, so styles for one page never leak onto another. A new page is a new folder and one line in the route list.
  ```text
  app/src/
  ├─ main.tsx      starts the router
  ├─ router.tsx    route list:
  │                 "/"  → Home
  │                 "*"  → Not found
  ├─ Layout.tsx    frame around pages
  ├─ pages/
  │  ├─ home/      one folder per page
  │  │  ├─ Home.tsx
  │  │  ├─ Tutorial.tsx + .css
  │  │  └─ AppList.tsx + .css
  │  └─ not-found/
  └─ lib/          data and helpers
     └─ apps.ts
  ```
- **A page that doesn't exist says so.** Today any unknown address shows the home page. It will show a short "page not found" message with a link home.
  ```text
  ┌──────────────────────────┐
  │ Page not found           │
  │                          │
  │ Nothing lives at this    │
  │ address.                 │
  │                          │
  │ [ Go home ]              │
  └──────────────────────────┘
  ```
- **The server's API goes through a route list too.** It has one real route, a health check that says the app is up, and one file per handler. A new API route is a new file and one line in the list.
  ```text
  app/worker/
  ├─ index.ts      /api → API router
  └─ api/
     ├─ router.ts  "GET /api/health"
     └─ health.ts  → { ok: true }
  ```
- **Mini apps start with the same shape, kept light.** The example app, `hello`, has a route list in its API, and its page script in its own file. Every mini app copied from it grows the same way, still with no build step. This repo's tip calculator follows it too.
- **One shared look, in one file.** The home page and every mini app link the same stylesheet: the device's font, light or dark to match the device, and a narrow column. Each page's own styles sit beside it. The look stays as it is today, with no UI library.
  ```text
  /style.css  (the shared look)
     ├──▶ every page of the main app
     ├──▶ /apps/hello/
     └──▶ /apps/tips/ ──▶ its style.css
  ```
- **The conventions are written where agents already read them.** The code rule agents load when editing code gets a short "where things go" list, and it now loads for mini apps too. There is no separate guide page.

Non-goals: no Tailwind, shadcn, or other UI library; no size limit for mini apps; no empty folders waiting for code; no change to how pages look.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-scaffold`: adds *The starter app is set up to grow* (router, not-found page, page folders, API route list) and *The code rule says where things go*.
- `mini-apps`: adds *Every page shares one stylesheet* and *The example mini app is set up to grow*.

## Impact

- `app/package.json`: adds `react-router`.
- `app/src/`: new `router.tsx`, `Layout.tsx`, `pages/home/` (`Home.tsx`, `Tutorial.tsx`/`.css`, `AppList.tsx`/`.css`, tests), `pages/not-found/`, `lib/apps.ts`; `App.tsx`, `App.css`, `AppList.tsx`, `Tutorial.tsx`, `apps.ts`, and `index.css` move or go; `main.tsx` mounts the router.
- `app/public/style.css`: new, served at `/style.css`; `app/index.html` links it.
- `app/worker/`: new `api/router.ts` and `api/health.ts` with tests; `index.ts` sends `/api/` to the router, and the `{ name: "Cloudflare" }` placeholder goes.
- `mini-apps/apps/hello/`: `api.mjs` gets a route list; new `app.js` and `page.test.mjs`; `index.html` links `/style.css`.
- `mini-apps/apps/tips/` (not payload): gains `style.css` and `app.js`, and links `/style.css`.
- `.agents/rules/code.md`: `paths:` adds `mini-apps/**`; a "where things go" list.
- `.agents/skills/wong-sync/references/payload-manifest.md` and `wiki/stack/mini-apps.md`: the tutorial and landing page's new paths; `wiki/ux-principles.md` points at the code rule for UI conventions.
- `CHANGELOG.md`: a `## Next (minor)` entry.

## Decision log

- **2026-09-27** — Asked whether WongStack should adopt Tailwind or shadcn, or keep its light style → chose keep it light.
- **2026-09-27** — Asked whether to say when to move up to Tailwind or shadcn → chose no; teach how an app grows in code and styling without one huge file.
- **2026-09-27** — Asked whether mini apps get an automatic size check → chose no; mini apps can be really big when needed.
- **2026-09-27** — Asked at the first plan whether a written guide is the right shape → chose show it through the code instead: a router with one route, folders, and conventions already in place.
- **2026-09-27** — Asked which router the main app uses → chose React Router.
- **2026-09-27** — Asked whether mini apps get the same growth-ready setup → chose yes, a light version.
- **2026-09-27** — Assumed: the layout follows [Bulletproof React](https://github.com/alan2207/bulletproof-react) cut down to what exists: `pages/` per route, `lib/` for data, and a `components/` folder only once two pages share a part, because empty folders are seeded structure nobody asked for.
- **2026-09-27** — Assumed: a part used by one page lives in that page's folder, because it moves with the page and is deleted with it.
- **2026-09-27** — Assumed: each part's styles sit in a CSS file beside it, under class names named for the part, with no styles for whole elements outside `/style.css`, because today's `main ul a` rules would restyle every list on a new page; plain class names work the same in mini apps, where CSS Modules would not.
- **2026-09-27** — Assumed: React Router in data mode (a route list of objects), because it reads as a list and makes adding a page one line.
- **2026-09-27** — Assumed: a not-found page is part of the router setup, because the Worker already sends every unknown address to the app, and React Router's default error screen is a developer message.
- **2026-09-27** — Assumed: the API's one route is `GET /api/health` returning `{ ok: true }`, because the old `/api/*` placeholder serves nothing and no script or check calls it.
- **2026-09-27** — Assumed: the conventions live in `.agents/rules/code.md`, because it loads when an agent edits code; the wiki guide from the first plan is dropped.
- **2026-09-27** — Assumed: the shared stylesheet stays, as `app/public/style.css` served at `/style.css`, because mini apps have no build step and share the main app's hostname.
- **2026-09-27** — Assumed: mini-app handlers stay inside `api.mjs` behind its route list, because the build copies every other `.mjs` file in the folder into the public pages.
- **2026-09-27** — Assumed: `tips` is converted too, though it is not payload, because the source repo should follow its own conventions.
- **2026-09-27** — Assumed: installed repos whose app or mini apps changed keep their layout, because the scaffold changes only through a reviewed sync plan; the changelog says how to adopt the new shape.
- **2026-09-27** — Assumed: a minor release, because it adds structure and removes only the unused API placeholder.
- **2026-09-27** — Assumed: the design's UX section covers only the not-found page, because it is the one new screen; the home page looks the same.
- **2026-09-27** — Built all non-gate tasks: `react-router` 8.4, the route list, not-found page, page folders, `/style.css`, the API route list with `GET /api/health`, `hello` and `tips` split, and the code rule's *Where things go*. Every local check passed (100% coverage and mutation score, knip, jscpd, payload links, retired names). Beyond the tasks: `scripts/tests/mini-apps.test.mjs` expects `hello/app.js` in the build output; `style.test.ts` loads Node's types itself, since Vitest's `?raw` returns an empty string for CSS; the third "UI conventions" mention in `ux-principles.md` sits in a code-block template and stays unlinked; `tips/style.css` keeps its own 26rem column, so the page looks as before.
- **2026-09-27** — Gate tasks done: CI passed on PR #172 (coverage, mutation, payload checks). On the staging preview, `/`, `/apps/hello/`, `/apps/tips/`, and `/nothing-here` look as before at 390px in light and dark; each loads `/style.css`; the hello form answers "Hello, Ada!"; *Go home* returns to `/`; `GET /api/health` answers `{"ok":true}`, and `/api/nothing` and `POST /api/health` answer 404.
- **2026-09-27** — Distill: no repeatable fact; the two session facts (no UI library, conventions shown in code) are already carried by the code rule's *Where things go* and the `mini-apps` spec.
- **2026-09-27** — Archive checkpoint: archived by `/ship`, released as 26.13.0; the `app-scaffold` and `mini-apps` specs gained their four requirements.

<!-- end proposal.md -->
<!-- file design.md utf8 8309 -->
# Design

## Context

See proposal.md for why. Today:

- `app/src/` is flat: `App.tsx` renders `<Tutorial />` and `<AppList />`. `App.css` styles whole elements (`main ul a`, `main section`, `main button`), so any list, section, or button on a new page would pick those rules up. `index.css` holds the base look.
- `app/worker/index.ts` answers every `/api/*` path with `{ name: "Cloudflare" }`, a leftover from the Vite template; `index.test.ts` pins it. No script, workflow, or skill calls it.
- `wrangler.jsonc` serves static assets first, with `not_found_handling: "single-page-application"`, so every unknown address loads the app, which today shows the home page.
- The app suite enforces 100% coverage (`vitest.config.ts`) and a 100% mutation score (`stryker.conf.json`, which skips `src/main.tsx`). New code needs tests that kill every mutant.
- Mini apps have no build step. `scripts/mini-dashboard.mjs` copies every file in an app's folder into the public pages, except `api.mjs`, tests, TypeScript files, and dotfiles. `.agents/rules/code.md` loads only for `app/**`, `scripts/**`, and `.github/workflows/**`.

## Goals / Non-Goals

**Goals:**
- A second page, API route, or mini-app route is an obvious copy of the first.
- Styles can't leak from one page to another.
- The conventions are stated once, in the code rule, and shown by the files.

**Non-Goals:**
- No empty folders, and no `components/`, `hooks/`, or `features/` until something needs one.
- No data loaders, auth, or nested layouts; the router starts with what the one page needs.

## Decisions

**React Router, data mode, with the route list in its own module.** `src/router.tsx` exports `routes: RouteObject[]`: a root route with `Layout` as its element, an index child for `Home`, and a `*` child for `NotFound`. `main.tsx` calls `createBrowserRouter(routes)` and renders `<RouterProvider>`. Keeping `routes` separate from `createBrowserRouter` lets tests mount it with `createMemoryRouter(routes, { initialEntries })`, and keeps the browser-only code in `main.tsx`, which Stryker already skips. Alternatives: declarative `<Routes>` JSX reads less like a list and is harder to test in isolation; TanStack Router adds code generation and a steeper learning curve for a one-page start; a hand-written router is code we own and must mutation-test, which every agent would also have to learn.

**`Layout.tsx` is the one frame.** It renders `<main><Outlet /></main>`. It is where a header or nav goes when a second page needs one, and not before.

**Folders.**
```text
src/
├─ main.tsx, router.tsx, Layout.tsx (+ tests)
├─ pages/<page>/   <Page>.tsx, its parts, tests, CSS
└─ lib/            data and helpers with no UI
```
`pages/home/` holds `Home.tsx` (renders `<Tutorial />`, the "Your apps" heading, and `<AppList />`, as `App.tsx` does today), `Tutorial.tsx`/`.css`/`.test.tsx`, and `AppList.tsx`/`.css`. `apps.ts` moves to `lib/apps.ts`, since it is data with no UI. `pages/not-found/NotFound.tsx` is the new screen. `App.tsx`'s tests split into `Home.test.tsx` (the list's loading, empty, failed, and loaded states, as today) and `router.test.tsx` (`/` shows Home, `/nothing` shows Not found).

**Styles: a shared sheet plus class-scoped part styles.** `app/public/style.css`, served at `/style.css` and linked from `app/index.html`, holds only what every page shares: `color-scheme: light dark`, `system-ui` font, line height, the `32rem` centered body column, and `font: inherit` with padding on form controls. It is the only file that styles whole elements. Each part's CSS sits beside it and uses class names named for the part (`.app-list`, `.tutorial`), carrying today's rules unchanged. `index.css` and `App.css` are deleted. Alternatives: CSS Modules scope automatically in the main app, but mini apps have no build step, so the two would follow different conventions; `/style.css` via a JS import gets a hashed name that mini apps can't link to.

**The Worker's API router.** `worker/api/router.ts` exports `API_PREFIX` and `handleApi(request, env)`. It looks up `` `${method} ${pathname}` `` in a `Map` of handlers and answers 404 JSON on a miss. A `Map` avoids matching inherited keys like `constructor`, the case `mini-apps/router.mjs` already guards. `worker/api/health.ts` exports a handler returning `Response.json({ ok: true })`. `index.ts` replaces the placeholder branch with `handleApi`, in the same place in the dispatch order. Tests: `router.test.ts` (hit, unknown path, wrong method, `constructor`) and `index.test.ts` updated to prove `/api/` reaches the router.

**Mini apps, light.** `hello/api.mjs` keeps its handler in the file behind `const routes = new Map([["GET greeting", greeting]])`. Handler files are not split out, because the build would publish them as pages. `hello/index.html` keeps the markup, links `/style.css`, and loads `app.js`, the inline script moved unchanged. It has no `style.css`, since the shared sheet covers its look. `page.test.mjs` asserts the page links `/style.css` and `app.js`, and that `app.js` exists. `tips/` (not payload) moves its inline style to `style.css` and its script to `app.js`, which imports `tip.mjs`. Its API needs no change, since it has none.

**The conventions live in `.agents/rules/code.md`.** `paths:` adds `"mini-apps/**"`, and a *Where things go* section follows the rule's opening:
- A page: a folder in `app/src/pages/`, and one entry in `app/src/router.tsx`.
- A part used by one page: in that page's folder. It moves to `app/src/components/` when a second page uses it.
- Data and helpers with no UI: `app/src/lib/`.
- Styles: the shared look is `app/public/style.css`, the only file that styles whole elements. A part's CSS sits beside it, under class names named for the part.
- An API route: a handler file in `app/worker/api/`, and one entry in its router.
- A mini app: copy `mini-apps/apps/hello/`, then page markup in `index.html`, the page script in `app.js`, tested logic in named `.mjs` modules, API routes in `api.mjs`'s route list, and its own styles in `style.css`.
- Split by job, not by size: each file does one thing and is named for it.

`wiki/ux-principles.md`'s three "UI conventions" mentions link that section. `wiki/stack/mini-apps.md` updates its landing-page paragraph (`pages/home/`, `/style.css`), and *The rules* gains one bullet linking the code rule. The payload manifest's tutorial rule names `app/src/pages/home/Tutorial.tsx` and checks whether `Home.tsx` renders `<Tutorial />`, or `App.tsx` in a target still on the flat layout.

## UX

### Use-case brief
Who: anyone who follows a stale link or mistypes an address on the app, on a phone as often as a desk. Job: realize the address is wrong and get back. Done: they're on the home page. Common case: rare, a few times ever per person. Mirrors the home page's column and link style.

### Flow
Unknown address → Not found page → *Go home* → `/`.

### Hierarchy
One primary action: the *Go home* link. The heading says what happened; one muted sentence says why.

### Review
[review.html](review.html). The *A page that doesn't exist says so* item sketches the one new screen.

### Components
`NotFound.tsx` in `pages/not-found/`, a React Router `<Link>`, and the shared sheet. No new CSS file, since the shared look covers it.

## Risks / Trade-offs

- [A new dependency the checks must keep current] → React Router is the most-used React router, and `/update-dependencies` already surveys `app/package.json`.
- [Mutation testing demands tests for the route list and API router] → Both are small maps. The planned tests cover each entry and the miss.
- [A target's starter app moves under its feet] → Only through the sync plan, which the scaffold's existing-app rule already requires. The changelog tells a starter-app target to take the whole move together, and a target that rebuilt its app to keep its own layout.
- [Class-named styles need a matching class in markup] → The moved parts get their class names in the same commit, and the preview check in the tasks confirms the look is unchanged.

## Migration Plan

A minor release. `/wong-sync` plans the new files, the moves, `react-router` in `app/package.json`, the removed API placeholder, the `hello` split, and the code-rule update. Rollback is reverting the merge.

<!-- end design.md -->
<!-- file tasks.md utf8 3360 -->
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

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 1346 -->
# Spec Delta

## ADDED Requirements

### Requirement: The starter app is set up to grow

The starter app SHALL route its pages through a route list, with the home page as its only page and a not-found page for every other address. Each page SHALL live in its own folder with its parts, styles, and tests; a part used by one page SHALL live in that page's folder. The Worker SHALL route `/api/` requests through a route list of handlers, one per file, starting with `GET /api/health`. An unknown API route SHALL answer 404. The scaffold SHALL ship no empty folders.

#### Scenario: An unknown address

- **WHEN** a person opens `/nothing-here` on the app
- **THEN** they see a "page not found" message with a link home, not the home page

#### Scenario: The health route

- **WHEN** a caller sends `GET /api/health`
- **THEN** the Worker answers 200 with `{ "ok": true }`, and `GET /api/nothing` answers 404

### Requirement: The code rule says where things go

The code rule SHALL load when an agent edits the main app or a mini app, and SHALL say where a new page, API route, shared part, helper, and style go, pointing at the files that already follow it.

#### Scenario: A second page

- **WHEN** the agent adds a page to the main app
- **THEN** it adds a folder under the pages folder and one entry in the route list, following the home page

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/mini-apps/spec.md utf8 1109 -->
# Spec Delta

## ADDED Requirements

### Requirement: Every page shares one stylesheet

The main app SHALL serve one shared stylesheet at `/style.css`, holding the look every page shares: the device's font, light or dark to match the device, and a narrow column. The starter app and the example mini app SHALL link it rather than copy its rules. A page's own rules SHALL live beside it. The shared look SHALL use no UI library or CSS framework.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's landing page and then `/apps/hello/`
- **THEN** both pages load `/style.css` and show the same font and light or dark colors

### Requirement: The example mini app is set up to grow

The example mini app SHALL keep its page markup, page script, and API in separate files, and its API SHALL dispatch through a route list, with no build step. An unknown API route SHALL answer 404.

#### Scenario: A copied app gains a route

- **WHEN** the agent adds an API route to a mini app copied from the example
- **THEN** it adds one entry to the route list and a handler, without touching the page

<!-- end specs/mini-apps/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 43942 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-27-grow-apps-in-files</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-27-grow-apps-in-files">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-grow-apps-in-files</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Today the starter app is one page in a flat folder, and the server answers every <code>/api</code> request with a leftover placeholder. When someone asks for a second page, nothing shows the agent where it goes, so code piles into the files that already exist. Mini apps are worse: page, styling, and script all sit in one file. You want the starter app to already be set up for growth, with a router, folders, and good conventions in place, so each new page or route follows the shape that's already there. You also want to keep WongStack's light, plain look.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Pages go through a router.</b> The home page is the router's only route today, with a &quot;page not found&quot; screen for anything else. Each page gets its own folder, holding the page's parts, and each part keeps its styles and tests beside it, so styles for one page never leak onto another. A new page is a new folder and one line in the route list.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">app/src/</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">├─ main.tsx      starts the router</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">├─ router.tsx    route list:</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│                 &quot;/&quot;  → Home</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│                 &quot;*&quot;  → Not found</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">├─ Layout.tsx    frame around pages</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">├─ pages/</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">│  ├─ home/      one folder per page</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">│  │  ├─ Home.tsx</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">│  │  ├─ Tutorial.tsx + .css</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">│  │  └─ AppList.tsx + .css</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">│  └─ not-found/</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">└─ lib/          data and helpers</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">   └─ apps.ts</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A page that doesn't exist says so.</b> Today any unknown address shows the home page. It will show a short &quot;page not found&quot; message with a link home.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">┌──────────────────────────┐</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">│ Page not found           │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│                          │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│ Nothing lives at this    │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│ address.                 │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">│                          │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">│ [ Go home ]              │</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">└──────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The server's API goes through a route list too.</b> It has one real route, a health check that says the app is up, and one file per handler. A new API route is a new file and one line in the list.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">app/worker/</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">├─ index.ts      /api → API router</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">└─ api/</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">   ├─ router.ts  &quot;GET /api/health&quot;</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">   └─ health.ts  → { ok: true }</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Mini apps start with the same shape, kept light.</b> The example app, <code>hello</code>, has a route list in its API, and its page script in its own file. Every mini app copied from it grows the same way, still with no build step. This repo's tip calculator follows it too.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>One shared look, in one file.</b> The home page and every mini app link the same stylesheet: the device's font, light or dark to match the device, and a narrow column. Each page's own styles sit beside it. The look stays as it is today, with no UI library.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">/style.css  (the shared look)</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">   ├──▶ every page of the main app</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">   ├──▶ /apps/hello/</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">   └──▶ /apps/tips/ ──▶ its style.css</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The conventions are written where agents already read them.</b> The code rule agents load when editing code gets a short &quot;where things go&quot; list, and it now loads for mini apps too. There is no separate guide page.</div></div></li>
</ol>
<p class="aside">Non-goals: no Tailwind, shadcn, or other UI library; no size limit for mini apps; no empty folders waiting for code; no change to how pages look.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether WongStack should adopt Tailwind or shadcn, or keep its light style → chose keep it light.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether to say when to move up to Tailwind or shadcn → chose no; teach how an app grows in code and styling without one huge file.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether mini apps get an automatic size check → chose no; mini apps can be really big when needed.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked at the first plan whether a written guide is the right shape → chose show it through the code instead: a router with one route, folders, and conventions already in place.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked which router the main app uses → chose React Router.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether mini apps get the same growth-ready setup → chose yes, a light version.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the layout follows <a href="https://github.com/alan2207/bulletproof-react">Bulletproof React</a> cut down to what exists: <code>pages/</code> per route, <code>lib/</code> for data, and a <code>components/</code> folder only once two pages share a part, because empty folders are seeded structure nobody asked for.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a part used by one page lives in that page's folder, because it moves with the page and is deleted with it.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: each part's styles sit in a CSS file beside it, under class names named for the part, with no styles for whole elements outside <code>/style.css</code>, because today's <code>main ul a</code> rules would restyle every list on a new page; plain class names work the same in mini apps, where CSS Modules would not.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: React Router in data mode (a route list of objects), because it reads as a list and makes adding a page one line.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a not-found page is part of the router setup, because the Worker already sends every unknown address to the app, and React Router's default error screen is a developer message.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the API's one route is <code>GET /api/health</code> returning <code>{ ok: true }</code>, because the old <code>/api/*</code> placeholder serves nothing and no script or check calls it.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the conventions live in <code>.agents/rules/code.md</code>, because it loads when an agent edits code; the wiki guide from the first plan is dropped.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the shared stylesheet stays, as <code>app/public/style.css</code> served at <code>/style.css</code>, because mini apps have no build step and share the main app's hostname.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: mini-app handlers stay inside <code>api.mjs</code> behind its route list, because the build copies every other <code>.mjs</code> file in the folder into the public pages.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>tips</code> is converted too, though it is not payload, because the source repo should follow its own conventions.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: installed repos whose app or mini apps changed keep their layout, because the scaffold changes only through a reviewed sync plan; the changelog says how to adopt the new shape.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a minor release, because it adds structure and removes only the unused API placeholder.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the design's UX section covers only the not-found page, because it is the one new screen; the home page looks the same.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Built all non-gate tasks: <code>react-router</code> 8.4, the route list, not-found page, page folders, <code>/style.css</code>, the API route list with <code>GET /api/health</code>, <code>hello</code> and <code>tips</code> split, and the code rule's <i>Where things go</i>. Every local check passed (100% coverage and mutation score, knip, jscpd, payload links, retired names). Beyond the tasks: <code>scripts/tests/mini-apps.test.mjs</code> expects <code>hello/app.js</code> in the build output; <code>style.test.ts</code> loads Node's types itself, since Vitest's <code>?raw</code> returns an empty string for CSS; the third &quot;UI conventions&quot; mention in <code>ux-principles.md</code> sits in a code-block template and stays unlinked; <code>tips/style.css</code> keeps its own 26rem column, so the page looks as before.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Gate tasks done: CI passed on PR #172 (coverage, mutation, payload checks). On the staging preview, <code>/</code>, <code>/apps/hello/</code>, <code>/apps/tips/</code>, and <code>/nothing-here</code> look as before at 390px in light and dark; each loads <code>/style.css</code>; the hello form answers &quot;Hello, Ada!&quot;; <i>Go home</i> returns to <code>/</code>; <code>GET /api/health</code> answers <code>{&quot;ok&quot;:true}</code>, and <code>/api/nothing</code> and <code>POST /api/health</code> answer 404.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distill: no repeatable fact; the two session facts (no UI library, conventions shown in code) are already carried by the code rule's <i>Where things go</i> and the <code>mini-apps</code> spec.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archive checkpoint: archived by <code>/ship</code>, released as 26.13.0; the <code>app-scaffold</code> and <code>mini-apps</code> specs gained their four requirements.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as a plain request to update the plan ──
  function notesText() {
    const lines = ['Update the plan ' + CHANGE + ' with these notes from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat to update the plan.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
