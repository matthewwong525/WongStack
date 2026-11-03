# Design

## Context

The knowledge repo plan (workspace pale-parrot, not yet written) gives each install a second git repo on Cloudflare Artifacts, reached through the app's code address, saved live with a link check. It owns three things this change uses and does not define: where the knowledge repo is checked out on a computer, the link form a code-repo file uses for a knowledge page (and the reverse), and how WongStack's own readers (memory's digest of people pages, the document corpus, `/dream-memory`, the wiki tidy) find knowledge pages. This change starts building after that plan and the live reader ship. Its tasks name those forms as `<knowledge link>` and `<code link>`; `/apply` reads them from the shipped knowledge repo page.

Two installs need the move today (survey of 2026-11-03, read-only):

| | ClaymooApp (45.4.0) | WongOS (45.1.0) |
|---|---|---|
| Wiki root | `docs/` (`components.docsPath: docs/development`) | `wiki/` |
| Shipped pages | 23, flat in `docs/development/` | 51 (root 5, `development/` 20, `stack/` 26) |
| Own pages | ~265: `company/` 22, `grants/` 14, `marketing/` 68, `ops/` 54, `product/` 24, `team-roles/` 7, ~75 own in `development/`, `README.md`, `welcome.md` | ~45: 19 life pages, 6 root workflow pages, 14 own in `stack/`, 6 own in `development/` |
| Code reads at run time | `product/tutorials/` prompts and QC checklist (`?raw`), `marketing/ad-naming-convention.md` (`?raw`), `marketing/personas/*` (`scripts/seed-customer-brain.mjs`), the whole tree (`packages/worker-lib/docs-content.ts` glob, served at `/api/docs`) | `wiki/profile.md` (`.agents/daily/matthew.json` → `config.mjs`) |
| References into own pages | skills 68 files, code ~125 files, 68 doc slugs, `/docs/...` app routes, 143 `../ops/`-style wiki links, 47 knowledge → code links, 15 live specs | skills 5, `.agents/daily` 5, code comments 2, 8 wiki pages, 6 life → code links |
| Outside references | — | 7 files name `~/ClaymooApp/docs/...` |

ClaymooApp's `/api/docs` glob is the live reader plan's swap; this change keeps it from breaking only by moving in the same update as that swap.

## Goals / Non-Goals

**Goals:** one deterministic tool lists, moves and relinks an install's own pages; the sync plan carries only what the tool can't do; no edit is lost between build and publish; a stale branch can't put a page back.

**Non-Goals:** classifying pages by topic (every own page moves; only code-read pages stay); cutting code-only pages; carrying git history; rewriting archives or memory facts; the knowledge repo's provisioning, link check or reader.

## Decisions

### A page is "own" when the payload doesn't ship it

The tool reads the source's `payload-files.json` at the installed commit, as the preflight already does, and maps each payload `wiki/` path through the install's wiki root (`docsPath` flattening included). Every Markdown file and asset under the wiki root that maps to no payload path is own. A README hub that setup made counts as shipped and stays; it loses its links to moved pages. A folder the payload ships whole (WongOS's `wiki/stack/`) still yields own pages: the comparison is per file, not per folder. No topic classifier: the settled boundary moves every own page, so a classifier would only add a way to be wrong.

### Code-read pages stay, found by the reference scan

A page stays when a non-Markdown file reads it as it runs: an `import ... ?raw`, a `readFileSync`/`readFile` of its path, a glob that matches it, or a JSON/config value naming it. The scan finds these from the same reference pass as the relinking and lists them as `stays`, each with the reader's file and line. The plan proposes a destination next to the reader (for example `packages/worker-lib/prompts/` for ClaymooApp's tutorial prompts, `.agents/daily/profile.md` for WongOS's profile); the person sees it in the plan. A glob over the whole wiki (ClaymooApp's `docs-content.ts`) is not a stay: it is the docs view the live reader replaces, so the tool reports it as `replaced-reader` and the plan carries the live reader's swap.

Alternative rejected: reading these pages live from the knowledge repo. Each reader would need network code and a failure path, and prompts and naming rules are code inputs.

### One script, three modes

`.agents/skills/wong-sync/scripts/knowledge-move.mjs`, run from the source like the preflight:

- `plan --target <root> --source <src> --from <commit>`: writes nothing; prints versioned JSON: `moves` (old → new path), `stays` (path, reader, proposed place), `rewrites` (file, line, old, new), `hand` (file, line, text, reason), `outside` (paths into other repos), counts by folder.
- `move --target <root> --knowledge <clone>`: copies each move into the knowledge clone at its new path, records the code repo commit in `.moved-from` metadata the knowledge repo plan accepts (or the first save's message), `git rm`s the originals in the code repo, applies `rewrites`, and writes the moves list. It never writes `hand` items.
- `recopy --target <root> --knowledge <clone> --base <main>`: for each moved path, compares the code repo's `main` text with the text at the move's base and the knowledge clone's text with its first copy. One side changed → carry it to the knowledge clone. Both changed → exit non-zero naming each page; nothing written.

The new path drops the wiki root (`docs/ops/x.md` → `ops/x.md`; `wiki/carol/x.md` → `carol/x.md`); own pages from a docs-path folder keep their folder (`docs/development/architecture.md` → `development/architecture.md`). Collisions (two roots mapping to one path) stop `plan` with an error.

Reference forms rewritten: relative Markdown links, bare repo paths in prose, comments and string literals that equal a moved path, `/docs/<slug>` app routes and `slug:` values (rewritten to the live reader's address form), and links inside moved pages back into the code repo (`<code link>`). Anything built from parts, a glob, a template string with a variable, or a URL to a hosting site goes to `hand`. Archives (`openspec/changes/archive/`), `CHANGELOG.md` history and memory are skipped. Live specs are rewritten.

Deterministic code, not an AI pass: the same steps run per install, ClaymooApp alone has ~400 references, and a missed one fails silently.

### The moves list and the check

The moves list is `.agents/knowledge-moves.json`: `{ "version": 1, "base": "<commit>", "moves": { "<old path>": "<new path>" } }`. The wiki check in `.agents/skills/memory/scripts/lib/links.mjs` reads it if present and fails on any file at a listed old path, naming the new place by `<knowledge link>`. `memory.mjs areas <old path>` prints the new place from the same list, so an agent with an old path from a fact or archive finds the page. The list never shrinks: it is the only map from history to now.

### When things happen in an update

```text
/wong-sync → preflight: catch-up "own-pages" (paths)
  /plan: knowledge-move plan → moves, stays, hand steps in the plan
  /apply: knowledge repo set up (its plan's step) → move → hand steps
          → stays moved beside readers → checks
  before publish: recopy against main; stop on a page changed in both
  publish: code repo drops the pages; knowledge repo already has them
```

The knowledge clone is saved during `/apply`, so the preview's live reader shows the pages. If the update is abandoned, the knowledge repo holds copies nobody links to; the plan says so, and deleting them is one save there.

ClaymooApp: the same update runs `wiki-elsewhere` after the move, so its 23 shipped pages go to `wiki/` and `docsPath` leaves the record; the live reader's swap replaces `docs-content.ts`, `/api/docs` and `/public/api/docs`. Its local edits to WongStack scripts that hard-code `docs/` (`corpus.mjs`, `dream.mjs`, `delivery-safety.mjs`, `pickup.mjs`) take upstream's knowledge-repo-aware version through the normal merge.

WongOS: its 7 references to `~/ClaymooApp/docs/` are `outside` items; the plan maps each through ClaymooApp's moves list if that repo moved first, else leaves a hand step.

### Preflight

`catchUpNeeds` adds `{ code: 'own-pages', paths: [<top-level folders and files with own pages>] }` when the wiki root has own pages and `.agents/knowledge-moves.json` is absent or lists fewer moves than found. It stays lstat-and-list only; the full scan is `knowledge-move.mjs plan`'s job, run by the plan.

## Risks / Trade-offs

- **The knowledge repo's forms aren't fixed yet.** → The tool takes both link forms from one module the knowledge repo plan ships; the tasks start by reading it, and the tool's tests use that module.
- **A bare string equal to a path that is not a link** (a log line) gets rewritten. → Acceptable: it names the same page; tests cover it.
- **Open branches in other workspaces** hit modify/delete conflicts on moved pages. → The check names the new place; the conflict resolves by deleting in the code repo and saving the edit to the knowledge repo.
- **History** stays only in the code repo. → `git log -- <old path>` still works there; the moves list gives the old path.
- **Skill text budget** (`measure-context.mjs --check`): the catch-up step adds words. → Keep it to one short step; the script carries the detail.
