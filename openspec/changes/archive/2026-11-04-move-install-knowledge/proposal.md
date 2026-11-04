# Proposal

**Status:** ready-to-ship
**Branch:** decent-shark
**Open questions:** none

## Why

Company knowledge gets its own repo, but older installs keep theirs in the code repo today: ClaymooApp has about 265 such pages, WongOS about 45. Without help, each install must move hundreds of pages by hand and fix hundreds of links to them. If one link is missed, a skill or a check reads a page that is gone.

## What Changes

- **One update moves your pages, after one yes.** When you run `/wong-sync`, the update plan lists each of your own pages that moves to the knowledge repo, by folder, with the count. When you say yes, the build moves them. Pages that WongStack ships stay in the code repo. Your own pages move as they are, also the pages that only explain code. The weekly tidy cuts these later.
  ```text
  Moves to the knowledge repo   pages
    company/                      22
    marketing/                    68
    ops/                          54
    development/ (your own)       75
    ...
  Stays with the code
    WongStack's pages             23
    tutorials/ prompts (app)       6
  ```
- **Every link to a moved page is fixed.** The update fixes each link that names a moved page: in skills, rules, code comments, other pages, and in the moved pages' links back to the code. A link that the update can't fix safely, such as a path that code builds as it runs, goes on the plan as a step to do by hand.
  ```mermaid
  flowchart TD
    s[sync] --> l[list pages]
    l --> y{yes?}
    y -->|yes| m[move pages]
    m --> f[fix links]
    f --> h[hand steps]
    h --> c[checks]
  ```
- **An install whose app shows its pages waits for the live reader.** ClaymooApp's app shows its pages from the code repo today. Its update lists the pages and says the move waits until WongStack ships the live reader, so its docs view never goes empty. WongOS has no such view and moves at its next update.
  ```text
  Your pages wait to move: 265 pages
  Your app shows them from the code today.
  They move when the live reader is ready.
  ```
- **Pages that your app reads stay with the code.** A page that the app or a script reads as it runs, such as ClaymooApp's tutorial prompts or WongOS's profile, goes to a folder next to the code that reads it. The app keeps working the same, and an edit to it goes through the checks, as a code edit does.
  ```text
  docs/product/tutorials/script-prompt.md
    → packages/worker-lib/prompts/script-prompt.md
  wiki/profile.md   (the daily reads it)
    → .agents/daily/profile.md
  ```
- **No edit is lost while the update waits.** The pages go to the knowledge repo when the update is built. Teammates can still edit the old copies until the update goes live. Just before it goes live, the update copies each page that changed since then. If the same page changed in both places, the update stops and names the page.
  ```mermaid
  flowchart TD
    b[build: copy] --> w[wait for publish]
    w --> r[copy changed pages]
    r --> both{changed in both?}
    both -->|no| p[publish]
    both -->|yes| ask[stop and name it]
  ```
- **An old chat can't bring a page back.** A chat opened before the move may still edit a moved page. Its check then fails and names the page's new home, so the edit goes to the knowledge repo, not back into the code.
  ```text
  ✗ docs/ops/cashflow-forecast.md moved to the
    knowledge repo: ops/cashflow-forecast.md
  ```
- **Old records still find their pages.** Past plans, finished changes and memory still name the old paths, and stay as they are. A list of moves in the code repo maps each old path to its new place, so an agent that reads an old path finds the page.
  ```text
  docs/ops/cashflow-forecast.md
    → ops/cashflow-forecast.md
  docs/development/architecture.md
    → development/architecture.md
  ```
- **What you do.** Say yes to the update plan. The knowledge repo needs Cloudflare's paid plan; the update sets it up first if you have none. The page history stays in the code repo's history; the knowledge repo starts from today's text.
  ```text
  1. /wong-sync
  2. Read the list of pages, say yes
  3. Look at the preview, publish
  ```

Non-goals: no change to what a page says; no cut of pages that only explain code (the weekly tidy does that later); no change to past plans or finished changes; no history carried into the knowledge repo; new installs (the knowledge repo plan sets them up); the app's live reader (its own plan).

Builds on: *The knowledge repo* (shipped, 45.8.0). An install whose app shows its pages also needs *A live reader in the app* (workspace "Live reader for company knowledge", not built yet).

## Capabilities

### New Capabilities

### Modified Capabilities
- `wong-sync`: an old install's catch-up also moves its own wiki pages into the knowledge repo, fixes links to them, keeps pages its code reads with the code, keeps edits made while the update waits, and keeps a list of moved paths that a check enforces.

## Impact

- `.agents/skills/wong-sync/scripts/preflight.mjs`: a new catch-up code, `own-pages`, from the install's wiki root and the payload file list.
- New `.agents/skills/wong-sync/scripts/knowledge-move.mjs`: dry run, move, and recopy; tests in `scripts/tests/`.
- `.agents/skills/wong-sync/references/catch-up.md`: the new step.
- `.agents/skills/memory/scripts/lib/links.mjs` (the wiki check): fails on a page at a moved path.
- `wiki/stack/company-knowledge.md`: moving an older install's pages, and old paths.
- `openspec/specs/wong-sync/spec.md`, `CHANGELOG.md` (major).
- Downstream: ClaymooApp and WongOS run the move through their next `/wong-sync`; WongOS's 7 links into ClaymooApp's pages get a hand step.

## Decision log

- **2026-11-03** — Asked where pages that the app or a script reads as it runs go → chose to keep them with the code, next to the code that reads them.
- **2026-11-03** — Assumed: each moved page starts in the knowledge repo from today's text, with one first save that names the code repo's commit, because carrying history needs a history-rewrite tool on every computer, and the old history stays readable in the code repo.
- **2026-11-03** — Assumed: links use the forms and the local place of the knowledge repo that the knowledge repo plan sets, because that plan owns how the two repos name each other.
- **2026-11-03** — Assumed: people pages move, because WongStack's own readers of them (memory's digest) follow the knowledge repo in that plan; only an install's own code keeps its pages.
- **2026-11-03** — Assumed: ClaymooApp's shipped pages in `docs/development/` move to `wiki/` in the same update, by the existing catch-up step, because after the move `docs/` holds only those pages.
- **2026-11-03** — Assumed: the move goes to the knowledge repo during the build and is recopied just before publish, because the knowledge repo goes live at once and the code repo waits for checks.
- **2026-11-03** — Assumed: a script does the move and the link fixes, and the plan does only what it lists for hand fixes, because the same steps run on each install and hundreds of links are too many to fix by reading.
- **2026-11-03** — Assumed: WongOS's links into ClaymooApp's pages are a hand step on WongOS's plan, because one repo's move can't see another repo.
- **2026-11-03** — Assumed: past plans, finished changes and memory facts keep their old paths, and the moves list resolves them, because records are never changed.
- **2026-11-03** — Assumed: a `major` release, because pages leave the code repo and paths that install code reads change.
- **2026-11-03** — Asked, at `/ship`, what to do while the two parts this builds on are unshipped plans → chose to save only the plan now and build after both go live.
- **2026-11-04** — Asked, at `/ship` after the knowledge repo shipped (45.8.0) and the live reader had not, whether to build now → chose to build and publish now, and hold the move of an install whose app shows its pages from the code repo until the live reader ships.
- **2026-11-04** — Assumed: pages move to `knowledge/<same path below the wiki root>` with ordinary relative links, by 45.8.0's shipped forms; a moved page's links into the code need no rewrite, because `knowledge/` sits at the wiki root's depth.
- **2026-11-04** — Assumed: an own file that is not a page or a picture stays in the code repo, because the knowledge repo refuses it.
- **2026-11-04** — Assumed: the script makes no git commit and no knowledge save; the update's task saves once the link checks pass, because `/save` owns git and the knowledge save refuses a broken tree.
- **2026-11-04** — Assumed: the update asks to move own pages only for an install from before 45.8.0, or one whose record says `components.knowledgeMove: 'held'`, and never once a moves list exists, because from 45.8.0 an install keeps its own pages about its code in `wiki/` by design, and a count of own pages would move them.
- **2026-11-04** — Assumed: when the update also moves WongStack's pages out of `docs/`, that step runs first and the knowledge move second, so moved pages link shipped pages at their final place in `wiki/`; this replaces the 2026-11-03 order.
- **2026-11-04** — Assumed: a string in code equal to a moved path is a hand step, not rewritten, because code may read it on another line, where the scan can't see the read; comments and prose still get rewritten.
- **2026-11-04** — Assumed: a whole-wiki pattern holds the move only when code runs it, because a comment that names such a pattern reads nothing; JSDoc `/**` lines count as comments, and the plan lists one hand step per line and reason.
- **2026-11-04** — Assumed: while the knowledge move is held, moving WongStack's pages out of `docs/` is held too, and the record keeps `docsPath`, because without it the next update looks for own pages in `wiki/`, finds none, and never moves the pages in `docs/`; both moves run together in the update that does the knowledge move.
- **2026-11-04** — Archive checkpoint: all tasks done, CI passed on e56d09c; released as 46.0.0; renumbered after 45.10.1 shipped, still 46.0.0.
