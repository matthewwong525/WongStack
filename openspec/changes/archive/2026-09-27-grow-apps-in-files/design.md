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
