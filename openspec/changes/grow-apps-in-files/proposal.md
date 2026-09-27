# The starter app is built to grow

**Status:** in-progress
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
