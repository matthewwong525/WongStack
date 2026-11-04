# Design

## Context

Company knowledge moves to its own Artifacts repo (the "Company knowledge in its own repo" part, workspace pale-parrot). A save there goes live with no CI. ClaymooApp's reader (`openspec/specs/wiki-content-delivery` in ClaymooApp) bundles `docs/` at build time: the admin Worker serves every page at `/api/docs`, the public Worker only `public: true` pages, and its browser draws mermaid and searches text. Its corpus: 290 pages, 15 with mermaid, one public page, no images.

Cloudflare's Artifacts Workers binding reads a repo without Git: `log({ ref, limit })`, `readCommit(hash)`, `readTree(hash)` (immediate children), `readFile({ ref, path })` (a typed `Blob`, `null` for a missing path or a folder), `readBlob(hash)` ([binding reference](https://developers.cloudflare.com/artifacts/api/workers-binding/)). The commit and tree entry shapes are not documented; `wrangler types` writes them.

## Goals / Non-Goals

**Goals:** a page shows the newest save; ClaymooApp swaps with no loss (list, page, links, diagrams, search, public pages); access follows the Access page; a page's content never runs code.

**Non-goals:** editing in the app; the knowledge repo, its link check and its setup; moving pages; WongStack's own `wiki/` pages; images on public pages.

## Decisions

### The source: the knowledge part's binding and name

The app's core makes a read-only reader, `knowledgeReader(env)` in `app/worker/employee-access/knowledge-reader.ts`, from `knowledgeSource(env)` in `app/worker/employee-access/knowledge.ts`, shipped by the knowledge part (`company-knowledge-repo`, v45.8.0): the `ARTIFACTS` binding and `WONG_KNOWLEDGE_REPOSITORY`, on the live app alone, `null` on a preview or an install with none (the screen says knowledge is not set up). Branch `main`. Pages sit at the repo's root (the computer's copy is the `knowledge/` folder), `README.md` as each folder's page; pictures are `.png`, `.jpg`, `.gif`, `.webp`, the only other files a save takes. A link that leaves the repo, such as `../wiki/x.md`, shows as plain text.

The reader holds three reads of the knowledge repo and nothing else: `head()` (main's newest commit, through `log`), `readTree(hash)` and `readFile({ ref, path })`, plus the repo's committed name. It is frozen, and the Artifacts handle stays in its closure: no call makes a token, saves, or names another repo. `handleApp` puts it on the call (`call.knowledge`) for the `knowledge` app's routes alone; every other app's call has no `knowledge`. `index.ts` builds the same reader for `publicKnowledge`. `app/worker/apps/knowledge/source.ts` takes that reader, and its type from the shared contract, so the app's server folder imports nothing from core but the contract, with no lint allow.

A route's env never holds `ARTIFACTS`: the Project code key is `alone: true`, so `scopedEnv` drops its bindings from every app route, and that one binding can also reach and save the code repo. Rejected: listing the Project code key on the routes (the handler could then make a write token for the code repo), and a second copy of the preview rule in the app (it could drift and open knowledge on a preview).

### Newest save, kept per save

Each request reads the head once: `log({ ref: "main", limit: 1 })[0]`. Everything after is keyed by that commit hash, so it never goes stale and an edit shows at the next request:

- **Page:** `readFile({ ref: <head>, path })` → render, on each open. Not kept: one read and one render are cheap, and keeping every page would grow the Worker's memory.
- **List:** the head commit's `treeHash` → `readTree` per folder, depth-first, `.md` only, capped at 2,000 pages and 200 folders. Kept under `<repo>@<head>/list`. Titles come from each page's first `#` line, read when the search index is built; the list alone shows file names until then.
- **Search index:** on the first search after a save, read every listed page (bounded by the same cap, 6 reads at a time), keep `{ path, title, text }` with Markdown stripped, under `<repo>@<head>/index`, about 1.5 MB for ClaymooApp. Search scans it in the Worker and returns at most 20 hits, each with its title and the first matching line.

"Kept" is a memo in the Worker's own memory (`source.ts`'s `kept`), emptied when the head changes, so it holds one save at most. The Cache API was the plan, but Cloudflare's Workers docs say it does not work on a hostname behind Access, which every install's app is. A new Worker instance only costs a rebuild. Rejected: building an index on push (no hook on an Artifacts push this part owns), and Workers KV (a new binding and setup step for what a cache does).

Task 1.2 read a real repo: `log` answers with each commit's `treeHash`, so the list starts with no `readCommit`.

### One renderer, on the server

`render.ts` turns Markdown into HTML with `marked` (GFM), used by the app and the public address alike:

- Raw HTML in a page renders as text (the `html` token is escaped), so no page runs a script.
- A link or image URL keeps only `https:`, `http:`, `mailto:`, a relative path, or `#anchor`; anything else becomes plain text.
- A relative `.md` link resolves against the page's folder and becomes `/apps/knowledge/<path>` (in the app) or `/public/<path>` (public), anchor kept. `README.md` maps to its folder.
- A `mermaid` fence becomes `<pre class="mermaid">` with escaped text.
- Leading frontmatter is parsed (the same bare `public: true` rule as ClaymooApp) and removed from the body.
- A relative image becomes `/apps/knowledge/api/file?path=…` in the app, and alt text on the public address.

The app's page sets that HTML into a container. The browser loads `mermaid` with `import()` only when the page holds a `pre.mermaid`, at `securityLevel: 'strict'`, and draws each in place.

### Routes

`app/worker/apps/knowledge/api.ts`, each described with the shared contract so it is a company action:

| Route | Answers |
|---|---|
| `GET pages` | `{ commit, pages: [{ path, title }] }` |
| `GET page?path=` | `{ commit, path, title, public, html, markdown, saved }`; 404 when missing |
| `GET search?q=` | `{ commit, hits: [{ path, title, line }] }`; `q` 2–100 characters |
| `GET file?path=` | an image (`png`, `jpg`, `gif`, `webp`), its type from the blob; any other file 404; `svg` refused, since it can hold a script |

`path` is repo-relative, with no `..`, no leading `/`, and no `.git`. `saved` is the head commit's date. Each route needs the `knowledge` app, by the mini-app rule; no saved key.

### The public address

`app/worker/index.ts` answers `/public/<path>` before the sign-in check, through `publicKnowledge(request, env)` from the knowledge app's folder: `GET` only; `<path>` maps to `<path>.md` (or `<path>/README.md`); the page shows only when its frontmatter has `public: true`. Every other case, including a missing page, a private page, a folder, any other file, or no knowledge repo, gets one fixed 404 page. The answer is a self-contained HTML page with its own small `<style>`, the page's title, and a `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'` header: it loads nothing from the app. `Cache-Control: no-store`, so a page made private stops at once.

Access gets a third public route on both apps, `{ behavior: 'public', path_pattern: '/public/*' }`, written by `private-access.mjs` and expected by `check-private-access.mjs`. An install's Access step runs once more at its sync to add it; until then `/public/*` stays behind the wall, which fails closed.

Importing from the app folder into `index.ts` breaks the "an app keeps to its folder" direction the other way round (core imports an app). The lint rule covers only files inside an app's folder, so this import needs no allow. Rejected alternative: a core route under `app/worker/api/`, which would put the knowledge reader in two places.

## UX

### Use-case brief

A team member, on a computer or a phone, looks up how the company does something: a refund rule, a customer's terms, who handles what. Done means they read the current page in a few seconds. They read a few times a week; the owner reads after a chat saved a page, to check it. The common case is search, then one page. The edge case is a page that was renamed, which shows *not there* and the list. It mirrors ClaymooApp's docs browser, inside the app's frame like Access.

### Flow

Home → Knowledge → type in search → open a result → read, follow a link. Or Home → Knowledge → pick a page from the list.

### Hierarchy

The list screen's one primary action is search. On a page, *All pages* is a ghost button back to the list; a *Public* tag shows when the page is public, with its public address as a link.

### Review

[review.html](review.html), What Changes items 1 (the list and a page), 2 (search) and 4 (the public address).

### Components

The app's `Card`, `Input`, `Button` (ghost), `Badge`, `Skeleton`. The page body uses the app's typography classes on the rendered HTML; no new part.

## Risks / Trade-offs

- **The first search after a save reads every page.** For 290 pages that is about 290 reads, once per save per data centre. Bounded by the 2,000-page cap; past it, search covers the first 2,000 and says so.
- **The knowledge part is not built yet.** Names and folder layout are assumed; task 1.1 reconciles them, and a mismatch is a plan note, not a guess.
- **Artifacts read calls are new to this repo.** The undocumented shapes are checked first (task 1.2).
- **A public page can't show images or draw diagrams.** ClaymooApp's only public page has neither; a later change can add a reviewed rule for public pictures.

## Migration

WongStack installs get the app at sync: the owner ticks it for people, and runs the Access step once to open `/public/*`. ClaymooApp, at its next sync, removes its own docs reader and points its public docs address at `/public/`; that removal is ClaymooApp's own change, in its repo.
