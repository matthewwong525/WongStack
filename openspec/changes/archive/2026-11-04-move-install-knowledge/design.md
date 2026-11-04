# Design

## Context

The knowledge repo shipped as 45.8.0 ([company knowledge](../../../wiki/stack/company-knowledge.md)). The forms this change uses:

- **Place.** Each workspace has `knowledge/` beside `wiki/`: the primary checkout's git-ignored copy, linked into each worktree. `knowledge.mjs status` resolves it.
- **Links.** Ordinary relative Markdown links. A code-repo page links `../knowledge/<page>`; a knowledge page links code by its workspace path (`../app/x.ts` from `knowledge/a.md`). `knowledge/` sits at the same depth as `wiki/` and `docs/`, so a moved page's links back into the code need no rewrite. CI skips links into `knowledge/` (no copy there); `checkWiki(root, 'knowledge')` checks the copy with the same rules.
- **Save.** `knowledge.mjs save <pages> -m <message>` takes named pages and pictures only (`.md`, `.png`, `.jpg`, `.gif`, `.webp`), runs the link check, and goes live; `broken=` publishes nothing.
- **Readers.** Memory's digest and search already read `knowledge/` first, then `wiki/`.

The live reader (*A live reader in the app*) is not built. Matthew chose on 2026-11-04 to ship this anyway and hold the move of an install whose app shows its pages from the code repo until it ships.

Two installs need the move today (survey of 2026-11-03, read-only):

| | ClaymooApp (45.4.0) | WongOS (45.1.0) |
|---|---|---|
| Wiki root | `docs/` (`components.docsPath: docs/development`) | `wiki/` |
| Shipped pages | 23, flat in `docs/development/` | 51 (root 5, `development/` 20, `stack/` 26) |
| Own pages | ~265: `company/` 22, `grants/` 14, `marketing/` 68, `ops/` 54, `product/` 24, `team-roles/` 7, ~75 own in `development/`, `README.md`, `welcome.md` | ~45: 19 life pages, 6 root workflow pages, 14 own in `stack/`, 6 own in `development/` |
| Code reads at run time | `product/tutorials/` prompts and QC checklist (`?raw`), `marketing/ad-naming-convention.md` (`?raw`), `marketing/personas/*` (`scripts/seed-customer-brain.mjs`), the whole tree (`packages/worker-lib/docs-content.ts` glob, served at `/api/docs`) | `wiki/profile.md` (`.agents/daily/matthew.json` → `config.mjs`) |
| References into own pages | skills 68 files, code ~125 files, 68 doc slugs, `/docs/...` app routes, 143 `../ops/`-style wiki links, 47 knowledge → code links, 15 live specs | skills 5, `.agents/daily` 5, code comments 2, 8 wiki pages, 6 life → code links |
| Outside references | — | 7 files name `~/ClaymooApp/docs/...` |

ClaymooApp's `/api/docs` glob is the live reader plan's swap; its move is held until WongStack ships that reader, then moves in the same update as the swap.

## Goals / Non-Goals

**Goals:** one deterministic tool lists, moves and relinks an install's own pages; the sync plan carries only what the tool can't do; no edit is lost between build and publish; a stale branch can't put a page back.

**Non-Goals:** classifying pages by topic (every own page moves; only code-read pages stay); cutting code-only pages; carrying git history; rewriting archives or memory facts; the knowledge repo's provisioning, link check or reader.

## Decisions

### A page is "own" when the payload doesn't ship it

The tool reads the source's `payload-files.json` at the installed commit, as the preflight already does, and maps each payload `wiki/` path through the install's wiki root (`docsPath` flattening included). Every Markdown file and asset under the wiki root that maps to no payload path is own. An own file the knowledge repo refuses (not a page or a picture) stays, listed with the reason `not-a-page`. A README hub that setup made counts as shipped and stays; it loses its links to moved pages. A folder the payload ships whole (WongOS's `wiki/stack/`) still yields own pages: the comparison is per file, not per folder. No topic classifier: the settled boundary moves every own page, so a classifier would only add a way to be wrong.

### Code-read pages stay, found by the reference scan

A page stays when a non-Markdown file reads it as it runs: an `import ... ?raw`, a `readFileSync`/`readFile` of its path, a glob that matches it, or a JSON/config value naming it. The scan finds these from the same reference pass as the relinking and lists them as `stays`, each with the reader's file and line. The plan proposes a destination next to the reader (for example `packages/worker-lib/prompts/` for ClaymooApp's tutorial prompts, `.agents/daily/profile.md` for WongOS's profile); the person sees it in the plan. A glob over the whole wiki that code runs (ClaymooApp's `docs-content.ts`) is not a stay: it is the docs view the live reader replaces, so the tool reports it as `replaced-reader`, with `readerShipped` true only when the source ships the live reader's app (`app/src/apps/knowledge/App.tsx`). A `replaced-reader` with no shipped reader holds the whole move: the plan lists the pages and says the move waits; nothing moves and no moves list is written, so the next sync reports `own-pages` again. With the reader shipped, the plan carries its swap in the same update. A whole-wiki pattern only named in a comment reads nothing: it is a `hand` step and holds nothing.

Alternative rejected: reading these pages live from the knowledge repo. Each reader would need network code and a failure path, and prompts and naming rules are code inputs.

### One script, three modes

`.agents/skills/wong-sync/scripts/knowledge-move.mjs`, run from the source like the preflight:

- `plan --target <root> --source <src>`: writes nothing; prints versioned JSON: `moves` (old → new path), `stays` (path, reason, reader, proposed place), `replacedReaders`, `readerShipped`, `held`, `rewrites` (file, line, old, new), `hand` (file, line, text, reason), `outside` (paths into other repos), counts by folder.
- `move --target <root> --source <src>`: copies each move into `knowledge/` at its new path, removes the originals from the code repo's working tree, applies `rewrites`, adds the knowledge root hub's missing links to moved top-level pages and folders, writes the moves list with the code repo's `HEAD` as `base`, and runs `checkWiki` on both roots, printing problems. It refuses a held move and never writes `hand` items or makes a git commit or a knowledge save: the plan's task runs `knowledge.mjs save` once the checks pass, with a message naming the code repo commit.
- `recopy --target <root> --main <ref>`: for each moved path, compares the code repo's `<ref>` text with the text at `base`, and the knowledge copy's text with the `base` text. One side changed → carry the code repo's newer text to `knowledge/` and list it for the next save. Both changed → exit non-zero naming each page; nothing written.

The new path swaps the wiki root for `knowledge/` (`docs/ops/x.md` → `knowledge/ops/x.md`; `wiki/carol/x.md` → `knowledge/carol/x.md`); own pages in a docs-path folder keep their folder (`docs/development/architecture.md` → `knowledge/development/architecture.md`). A wiki-root `README.md` that is own becomes the knowledge root hub, merged into an existing one. Collisions (two sources mapping to one path, or a path the knowledge copy already holds with other text) stop `plan` with an error.

Reference forms rewritten: relative Markdown links (recomputed from the linking file to `knowledge/…`), bare repo paths in Markdown and other prose, paths in code comments (`//`, `#`, `/** */`, JSON `$comment`), and links between moved pages (their relative form is unchanged). A string literal in code that equals a moved path is `hand`, not rewritten: code may read it on another line (a list of pages a script loads, a test fixture), and a rewrite there would point the reader at a path the code repo no longer holds. `/docs/<slug>` app routes and `slug:` values belong to the docs view the live reader replaces; they go to `hand` until that reader ships. Anything built from parts, a glob, a template string with a variable, or a URL to a hosting site goes to `hand`. Archives (`openspec/changes/archive/`), `CHANGELOG.md` history and memory are skipped. Live specs are rewritten.

Deterministic code, not an AI pass: the same steps run per install, ClaymooApp alone has ~400 references, and a missed one fails silently.

### The moves list and the check

The moves list is `.agents/knowledge-moves.json`: `{ "version": 1, "base": "<commit>", "moves": { "<old path>": "<new path>" }, "copied": { "<new path>": { "hash", "from" } } }`. `copied` holds each page's text hash as `move` wrote it (after its link fixes) and the commit it came from, so `recopy` tells a knowledge-side edit from the move's own rewrites, carries a code-side edit by a three-way merge onto the relinked text, and a second `recopy` carries nothing twice. The wiki check in `.agents/skills/memory/scripts/lib/links.mjs` reads it if present and fails on any file at a listed old path, naming the new place as `knowledge/<page>`. `memory.mjs areas <old path>` prints the new place from the same list, so an agent with an old path from a fact or archive finds the page. The list never shrinks: it is the only map from history to now.

### Measured on the two installs (2026-11-04, read-only)

`knowledge-move.mjs plan` against each install, source at this branch, rerun after the review fixes (code strings become `hand`, a comment's pattern holds nothing, one step per line and reason):

| | ClaymooApp | WongOS |
|---|---|---|
| Status | `held` (`packages/worker-lib/docs-content.ts:27` is the `replaced-reader`) | `ready` |
| Moves | 252: root 2, `company/` 22, `development/` 76, `grants/` 14, `marketing/` 60, `ops/` 53, `product/` 18, `team-roles/` 7 | 44: root 9, `assets/` 1, `carol/` 5, `development/` 6, `frisbee/` 4, `health/` 3, `mandarin/` 2, `stack/` 14 |
| Stays | 15: 6 `product/tutorials/` prompts and QC checklist (`?raw`), `marketing/ad-naming-convention.md` (`?raw`), 6 `marketing/personas/` (`seed-customer-brain.mjs`), and 3 pages a skill script or test reads | 2: `profile.md` and `daily.md` (`.agents/daily/matthew.json`) |
| Rewrites | 1,174 in 462 files | 241 in 74 files |
| Hand | 156: 86 docs routes and slugs, 37 paths in code strings, 12 built paths, 9 partly moved folders, 6 comments made too wide, 4 whole-wiki patterns, 1 hosting link, 1 page pattern | 1: a comment made too wide |
| Outside | 0 | 8 in 7 files, all `~/ClaymooApp/docs/…` |

`move` on a copy of WongOS with a scratch `knowledge/` left both wikis with no problems, and its own wiki check passed; its test suite failed on its comment lint, where `knowledge/` made one comment line 125 characters wide, and passed once that line was shortened, apart from one email test that fails in any copy under the system temporary folder; `recopy` carried a teammate's edit, then carried nothing, then stopped on a page changed in both. `move` on a copy of ClaymooApp stopped as `held` and wrote nothing. Three kinds the survey did not foresee, now handled by the scan: a rewrite that pushes a code comment past the 120-character lint width is a hand step; a path in a code comment (a JSDoc `/**` line included) or a JSON `$comment` is prose, not a reader; and the install record's `docsPath` is not a reader.

### When things happen in an update

```text
/wong-sync → preflight: catch-up "own-pages" (paths)
  /plan: knowledge-move plan → moves, stays, hand steps in the plan
  /apply: wiki-elsewhere first, if reported and the move isn't held
          → knowledge copy present (setup's step if not) → move
          → hand steps → stays moved beside readers → checks
          → knowledge.mjs save (live at once)
  before publish: recopy against main; stop on a page changed in both
  publish: code repo drops the pages; knowledge repo already has them
```

The knowledge clone is saved during `/apply`, so the preview's live reader shows the pages. If the update is abandoned, the knowledge repo holds copies nobody links to; the plan says so, and deleting them is one save there.

When both `wiki-elsewhere` and `own-pages` are reported, `wiki-elsewhere` runs first, then the move, so the moved pages link shipped pages at their final place in `wiki/`. While the knowledge move is held, `wiki-elsewhere` is held too: the held update moves no shipped page and keeps `docsPath`, because `wikiRoot` reads it, and without it the next update would look in `wiki/`, find no own pages in `docs/`, and never report `own-pages`. Both run together in the update that does the knowledge move. ClaymooApp: the same update runs `wiki-elsewhere` before the move, so its 23 shipped pages go to `wiki/` and `docsPath` leaves the record; the live reader's swap replaces `docs-content.ts`, `/api/docs` and `/public/api/docs`. Its local edits to WongStack scripts that hard-code `docs/` (`corpus.mjs`, `dream.mjs`, `delivery-safety.mjs`, `pickup.mjs`) take upstream's knowledge-repo-aware version through the normal merge.

WongOS: its 7 references to `~/ClaymooApp/docs/` are `outside` items; the plan maps each through ClaymooApp's moves list if that repo moved first, else leaves a hand step.

### Preflight

`catchUpNeeds` adds `{ code: 'own-pages', paths: [<top-level folders and files with own pages>] }` when the wiki root has own pages, `.agents/knowledge-moves.json` is absent, and either the installed version is below 45.8.0 or the record has `components.knowledgeMove: 'held'`. From 45.8.0 an install's own pages about its code stay in `wiki/` by design, so a count of own pages alone would move them. Once a moves list exists it never reports again: pages written after the move are the new normal. A held plan's install-record task sets `components.knowledgeMove: 'held'`, so the next update asks again past 45.8.0; the move's install-record task removes it. It stays lstat-and-list only; the full scan is `knowledge-move.mjs plan`'s job, run by the plan.

## Risks / Trade-offs

- **The live reader isn't shipped.** → An install with a whole-tree docs reader is held whole, never half moved; WongOS-like installs move now.
- **The knowledge link check is strict** (hubs, orphans) where the old wiki might not have been. → `move` prints both roots' problems; the plan fixes them before the one save, which refuses a broken tree anyway.
- **A string literal in code equal to a moved path** may be a reader the scan can't see (the read is on another line). → It is a `hand` step, never rewritten; ClaymooApp has 37, mostly page lists in skill scripts and test fixtures.
- **Open branches in other workspaces** hit modify/delete conflicts on moved pages. → The check names the new place; the conflict resolves by deleting in the code repo and saving the edit to the knowledge repo.
- **History** stays only in the code repo. → `git log -- <old path>` still works there; the moves list gives the old path.
- **Skill text budget** (`measure-context.mjs --check`): the catch-up step adds words. → Keep it to one short step; the script carries the detail.
