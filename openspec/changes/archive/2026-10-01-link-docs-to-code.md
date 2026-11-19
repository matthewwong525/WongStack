<!-- openspec-archive v1 2026-10-01-link-docs-to-code -->
<!-- file proposal.md utf8 10049 -->
# One web of code, facts, wiki pages, specs, and past plans

**Status:** ready-to-ship

**Branch:** improvements-linking-facts-code

**Open questions:** none

## Why

Since 29.3.0, editing a part of the code brings up the saved warnings about it. The how-to page in the wiki, the record of what that part must keep doing, and the past plans that explain its shape don't come up. The assistant finds them only if it goes looking. On 2026-10-01 none of the 32 records of what shipped was linked from anywhere. Nothing checks the wiki for a page that nothing links to, or for a link to a page that's gone. And when the assistant moves a page, it can't see what links to it.

## What Changes

- **One lookup shows everything linked to a file, page, or topic.** Topics sit at the centre: the code, saved facts, wiki pages, specs, and past plans each link to their topic. Ask about any one of them and you get the rest: its topic, the wiki pages and spec that own it, the past plans that changed it, what links to it, and the saved warnings. Planning and building already run this lookup before the first edit, so they get all of it.
  ```text
   code ──┐               ┌── saved facts
          │               │
   wiki ──┼──── topic ────┼── specs
          │               │
   links ─┘               └── past plans
  ```
  ```text
   about app/worker/apps/hello/index.ts
   ─────────────────────────────────────
   topic   mini-apps, worker
   docs    wiki/stack/mini-apps.md
           spec: mini-apps
   past    Mini apps live in the main app
   linked  wiki/stack/mini-apps.md:40
   facts   "test every route, not only
            the new one" (9-30)
  ```
- **Past plans come back when you touch the same code.** Every finished plan names the files it changed. The lookup shows the newest five that touched this file first, then this topic, so the assistant sees why the code has its shape before changing it. It reads the plans fresh each time, so nothing has to be kept up to date.
- **Every spec belongs to a topic.** Each of the 32 records of what shipped is listed under a topic, with a few new topics where none fits, such as the browser and hand-over. The online check fails when a new record belongs to no topic, or a listed page no longer exists, so the links can't quietly go stale.
- **The online check catches a lost wiki page, in every install.** Each publish checks the wiki: every page is linked from another page, each section's main page links every page in it, and no link points to a page that's gone. It runs here and in every install, on that business's own wiki. A wiki save with a broken link won't publish until it's fixed, and the assistant fixes it.

Non-goals: hand-kept links from one item straight to another; a stored "linked from" list; links from wiki pages straight to specs, since installs don't get this repo's specs; matching by what a page says; checking a link's `#section` part; a graph database.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: an area may name the docs that own it; the area load also takes a topic, and prints a path's docs, past changes, and backlinks before its facts, even with the store unreachable; in this repo every capability spec is named by an area and every named doc exists.
- `knowledge-center`: the wiki tree's links are checked in CI in every repo (orphans, hub coverage, dead links).

## Impact

- `.agents/skills/memory/references/areas.json`: a `docs` list per area; new areas so every spec has one.
- `.agents/skills/memory/scripts/lib/areas.mjs`, `lib/links.mjs` (new), `memory.mjs`: `areas` takes a topic and prints `Docs:`, `Past changes:`, and `Linked from:`.
- `.github/scripts/wiki-links.mjs` (new, ships): the wiki check, on the same link library.
- `.github/workflows/test.yml`: a *Check the wiki's links* step.
- `.agents/skills/wong-sync/references/payload-files.json` and the payload manifest: the new script.
- `scripts/tests/memory-areas.test.mjs`, `scripts/tests/wiki-links.test.mjs` (new).
- `.agents/skills/memory/SKILL.md`, `.agents/skills/apply/references/build-helper.md`, `AGENTS.md`, `wiki/wiki-style.md`, `wiki/development/memory.md`: a line each, offset by equal cuts.
- `CHANGELOG.md`: a `## Next (minor)` entry.

## Decision log

- **2026-10-01** — Asked whether there was a third improvement after 29.3.0 → yes: the graph-engineering research's third idea, close the wiki's link gaps (a lost-page check and a "linked from" lookup), never built. The user asked to link specs and the wiki to the code as well, and to plan both as one change.
- **2026-10-01** — Asked whether the wiki link check runs in every install on its own wiki → yes, every install.
- **2026-10-01** — Asked to keep track of backlinks as another way for the assistant to search → a lookup that lists every page linking to a given path.
- **2026-10-01** — Asked whether every spec must belong to a topic → yes, the online check fails on one that doesn't.
- **2026-10-01** — Assumed: backlinks are computed from the files on each call, not stored in a list or on each page, because a stored copy goes stale ([one topic, one page](../../../wiki/wiki-style.md#one-topic-one-page)) and scanning the repo's Markdown is fast.
- **2026-10-01** — Assumed: the area list names docs by hand in a `docs` field, not found by the links pages hold, because a trial on 2026-10-01 found link-derived pages both noisy (11 pages for `memory`) and blind (none for `worker`, though `wiki/stack/mini-apps.md` owns it).
- **2026-10-01** — Assumed: the spec-coverage check runs only in this repo's tests, because installs don't get this repo's specs, and requiring an area per install capability would add a step to `/plan`. In an install the lookup skips a listed doc it doesn't have.
- **2026-10-01** — Assumed: wiki pages don't link straight to specs, because wiki pages ship and specs don't, so the link would break in every install; the area list is the one place they meet.
- **2026-10-01** — Assumed: the link check runs as a step in the shipped test workflow beside the loosened-checks step, on every run including docs-only ones, because that workflow already reaches every install and a wiki edit is often docs-only.
- **2026-10-01** — Assumed: the check covers `wiki/` only: dead relative links, pages no other wiki page links to (the root hub excepted), and hubs that miss a child page or folder; it skips `#section` parts and assets, because this repo's payload link check already covers anchors on shipped pages, and an image is not a page.
- **2026-10-01** — Assumed: each edited instruction file ends no longer in words or bytes than it started, which keeps `measure-context.mjs --check` passing without a new baseline.
- **2026-10-01** — Assumed: the check starts green, because a trial script on 2026-10-01 found 28 wiki pages, no lost page, one hub "miss" that is `wiki/assets/` (images, not a page), and 0 of 32 specs linked from any Markdown file.
- **2026-10-01** — Asked, after the review, whether to link everything into one web → yes, with topics at the centre and no hand-kept links between items: one lookup for any file, page, or topic that returns everything linked to it, and past plans as a fourth strand beside facts, wiki pages, and specs.
- **2026-10-01** — Assumed: the one lookup is the existing `memory.mjs areas`, widened, not a new or renamed command, because `/explore`, the build helper, the memory skill, the spec, and the wiki already name it, and a rename would touch them all for no gain.
- **2026-10-01** — Assumed: the link library lives in the memory skill and the shipped wiki check imports it, because `areas` needs backlinks too, and one copy of the link rules can't drift from another.
- **2026-10-01** — Assumed: past plans are found by the paths their proposal, design, and tasks name, newest five, plans naming the exact path first and then plans in the same topic, because a trial on 2026-10-01 read all 195 in 166 ms but found broad topics on most (`wiki` 130, `openspec` 106), so topic alone is noise.
- **2026-10-01** — Assumed: backlinks print only for paths asked about directly, not for every path a change names, because a change names dozens of paths and their backlinks would bury its facts.
- **2026-10-01** — Assumed: a topic is asked about by its bare name, such as `mini-apps`, when no file or folder has that name, because topic names never contain a slash and the rare clash resolves to the real path.
- **2026-10-01** — Check: `.github/scripts/wiki-links.mjs` is a new check that fails on a broken wiki link, a lost page, or a hub that skips a page, because a lost page was invisible before; it loosens nothing.
- **2026-10-01** — Check: `.github/workflows/test.yml` adds the *Check the wiki's links* step and a Summary sentence for it, because the wiki check must run in every install on every push; no existing step changes.
- **2026-10-01** — Assumed: checkpoint for gate task 4.2: tasks 1.1–4.1 are built and the related tests pass locally (250), along with the payload link, retired-name, config, and context checks; this save runs CI. The spec deltas were copied into the main memory and knowledge-center specs at this save. Past changes count a folder named in a plan as an exact match only when it is at least as deep as the path's area folder, so `wiki/` or `app/worker/` naming doesn't jump the queue.
- **2026-10-01** — Assumed: gate task 4.2 done: CI passed on PR #231 after merging main (#230; `wiki/development/memory.md` was the only conflict, keeping both edits), and the *Check the wiki's links* step ran and passed in the test workflow.
- **2026-10-01** — Assumed: archive checkpoint: all tasks ticked, CI passed on PR #231; the spec deltas were already copied into the main memory and knowledge-center specs at the earlier save, so the archive skipped specs. Released as 29.4.0.

<!-- end proposal.md -->
<!-- file design.md utf8 8095 -->
# Design

## Context

29.3.0 added `.agents/skills/memory/references/areas.json` (tag → `definition`, `paths`) and `memory.mjs areas <paths…> | --change <name>`, which prints `Areas: …` and then the live facts for those tags. `/explore` and the build helper already call it. Nothing links docs to areas, nothing checks the wiki's links in an install, and the payload link check (`scripts/check-payload-links.mjs`) runs only here and only on shipped files. The shipped `.github/workflows/test.yml` already runs `.github/scripts/loosened-checks.mjs` on every run, docs-only included. See [proposal.md](proposal.md) for why.

## Goals / Non-Goals

**Goals:** one lookup, `memory.mjs areas`, gives a path's or topic's areas, docs, past changes, backlinks, and facts; CI keeps the links honest.

**Non-Goals:** anchor checks in the wiki check; links out of `wiki/` (skills, specs) checked for orphans; a stored link index; spec coverage in installs; a new or renamed command.

## Decisions

### `docs` in `areas.json`

Each entry gains an optional `docs: [repo paths]`, wiki pages and `openspec/specs/<cap>/spec.md` files. `lib/areas.mjs` gets `areaDocs(tags, areas, root)`: the union of the matched tags' docs, in list order, deduplicated, filtered by `existsSync(join(root, doc))`. `areas` prints `Docs: a, b` right after the `Areas:` line and before it opens the store, so an unreachable store still shows them; it prints nothing when the list is empty.

Rejected: deriving docs from the links pages hold. A trial found 11 pages for `memory` and none for `worker`.

Every spec gets an area. The build assigns the 32 specs; where no area fits, it adds one with its folders, at least `browser` (`.agents/skills/browser/`, `.agents/skills/hand-over/`, `.agents/skills/agent-browser/`) for `browser-logins`. A starting map, which the build may correct:

```text
 spec                       area
───────────────────────────┼──────────────
 app-scaffold, stack-pack  │ stack-pack
 mini-apps                 │ mini-apps
 memory                    │ memory
 apply                     │ apply
 asking-the-user           │ explore
 other-work-check          │ explore
 change-loop, multi-part…  │ plan
 openspec-workflow         │ openspec
 ci-tests                  │ ci
 delivery-gate             │ save, ship
 staging-walkthrough       │ verify
 ux-wireframes             │ review
 wong-sync                 │ sync
 install-onboarding        │ setup
 cloudflare-provisioning   │ cloudflare
 payload-*, open-source…   │ payload
 knowledge-center          │ wiki
 repository-improvement    │ improve
 paseo-routines            │ routine
 workspace-cleanup         │ close
 browser-logins            │ browser (new)
```

The rest (`context-economy`, `dependencies`, `managed-workspace-access`, `paseo-defaults`, `secrets-convention`, `server-agent`) go to the closest area or a new one, read from each spec's purpose.

Wiki docs are added per area where a page owns it: `memory` → `wiki/development/memory.md`, `mini-apps` → `wiki/stack/mini-apps.md`, `wiki` → `wiki/wiki-style.md`, `save`/`ship`/`ci` → `wiki/development/the-change-loop.md`, and so on.

### Spec coverage is a test, not a CI step

`scripts/tests/memory-areas.test.mjs` asserts every `openspec/specs/*/spec.md` is named by some area's `docs` and every named doc exists. It runs in this repo's payload workflow with the other memory tests; `scripts/tests/` never ships, so installs are untouched.

### The link library: `lib/links.mjs`

A dependency-free module in the memory skill, used by `areas` and by the wiki check, so the link rules live once:

- **Scan.** Walk the repo's `.md` files, skipping `node_modules/`, `.git/`, and `openspec/changes/archive/`. Collect inline `](target)` links outside fenced code blocks, dropping external (`scheme:`), mailto, and pure `#` links; strip `#…` and `?…`; resolve against the file's folder; map `.claude/` and `.codex/` to `.agents/` through `normalizePath`. A folder target also counts as its `README.md`.
- **`backlinks(root, path)`** returns `file:line` for each link whose target is the path or under it.
- **`checkWiki(root)`** checks `wiki/**/*.md` only: (1) a relative link whose target does not exist; (2) a page other than `wiki/README.md` no *other* wiki page links to; (3) a `README.md` hub missing a link to a sibling `.md` page or a subfolder holding a `.md` page (so `wiki/assets/` is exempt). It returns the problems; no `wiki/` returns none.

### `areas`, widened

`memory.mjs areas [paths|topics…] [--change name]`, in this order, all before the store opens:

1. **Topics.** A positional with no `/`, no file or folder of that name, and an entry in `areas.json` is a topic: it adds that tag directly.
2. `Areas:` as today.
3. `Docs:` from `areaDocs`.
4. `Past changes:` from `pastChanges(root, paths, tags)`: each `openspec/changes/archive/*/`, its named paths read by the existing `changePaths` logic, ranked exact-path matches first then shared-area matches, each newest first by folder date, capped at 5; one per line as `<folder> — <proposal title>`, the folder linking `proposal.md`. With `--change`, the change itself is never listed (it isn't archived yet).
5. `Linked from:` from `backlinks`, for positional paths only, capped at 10 per path with a `+N more` line.

A section with nothing in it prints nothing. Then the facts, as today.

### `.github/scripts/wiki-links.mjs`

A thin shipped wrapper: imports `checkWiki` from `../../.agents/skills/memory/scripts/lib/links.mjs`, prints one line per problem, and exits 1; prints `Wiki links: N pages, all linked.` and exits 0 otherwise. Both files ship in `core`, so the import resolves in every install.

`test.yml` gets a step after *Check for loosened checks*, `if: ${{ !cancelled() }}`, `id: wiki`, running `node .github/scripts/wiki-links.mjs | tee -a "$GITHUB_STEP_SUMMARY"`, and the *Summary* step adds a sentence when it fails. It needs no `setup-node`: the runner's Node runs it, as it runs `loosened-checks.mjs`.

Rejected: extending `check-payload-links.mjs`. It never ships and checks the payload set, not an install's own wiki.

### Where agents learn about it

- `build-helper.md` step 1: the `areas --change` call also lists docs and past changes; read the ones the plan's tasks touch.
- Memory `SKILL.md` Read table: the `areas` row says it also takes a topic and returns docs, past changes, and backlinks.
- `AGENTS.md`, *Where context lives*: one sentence: `memory.mjs areas <path or topic>` shows everything linked to it.
- `wiki/wiki-style.md`: *Folders only for deep branches* — "Moving a page changes its URL: `memory.mjs areas <page>` lists what links to it"; *No orphans…* — "CI checks it."
- `wiki/development/memory.md`, *Facts by code area*: areas also name their docs, and the lookup shows past changes and backlinks.

Each file ends no longer than it started (`measure-context.mjs --json` before and after; AGENTS.md by its word count).

## Risks / Trade-offs

- [An install's existing wiki has a lost page or dead link, so its first publish after syncing fails] → The changelog's *Updating* note says so in plain words; the failure names each page, and the assistant links it in the same change.
- [A hand-kept `docs` list drifts as pages move] → The meta test fails on a missing doc; in installs a missing doc is skipped silently, never an error.
- [Link regex misreads unusual Markdown (reference links, HTML `<a>`)] → Inline links only, matching how the wiki writes links; reference links count as unlinked and a test pins that a `](…)` inside a code fence is ignored.
- [`areas` output grows] → Each section is paths or titles, capped (5 past changes, 10 backlinks per path); the reader opens only what it needs.
- [Past changes ranked by broad areas are noise: `wiki` matches 130 of 195 archives, `openspec` 106] → Exact-path matches rank first; area matches only fill the remaining slots, and a test pins the order.

<!-- end design.md -->
<!-- file tasks.md utf8 2893 -->
# Tasks

## 1. The link library and wiki check

- [x] 1.1 Write `.agents/skills/memory/scripts/lib/links.mjs` (`backlinks`, `checkWiki`) per design.md; verify `checkWiki` returns nothing on this repo.
- [x] 1.2 Write `.github/scripts/wiki-links.mjs` and its *Check the wiki's links* step and Summary sentence in `.github/workflows/test.yml`; add the script to `payload-files.json` and the payload manifest; verify `node .github/scripts/wiki-links.mjs` passes here and `node scripts/check-payload-links.mjs` passes.
- [x] 1.3 Write `scripts/tests/wiki-links.test.mjs` on temp fixtures: a dead link, an orphan page, a hub missing a page, an assets-only folder exempt, a link in a code fence ignored, `.claude/` read as `.agents/`, a folder target, archives skipped, no `wiki/` passes; verify each guard is seen refusing.

## 2. The one lookup (memory skill)

- [x] 2.1 Add a `docs` list to each entry in `.agents/skills/memory/references/areas.json`, naming every `openspec/specs/*/spec.md` under at least one area and the wiki pages that own each area; add new areas (at least `browser`) where no area fits; verify every spec is named and every named path exists.
- [x] 2.2 Widen `memory.mjs areas` per design.md: topic positionals, `Docs:`, `Past changes:`, and `Linked from:` before the store opens; verify `memory.mjs areas app/worker/apps/x.ts` lists `wiki/stack/mini-apps.md`, the mini-apps spec, and `2026-10-01-mini-apps-in-the-main-app`, and `memory.mjs areas mini-apps` lists the same docs.
- [x] 2.3 Extend `scripts/tests/memory-areas.test.mjs`: docs, past changes, and backlinks printed before facts and with an unreachable store; missing docs skipped; exact-path past changes ranked before area-only ones and capped at 5; backlinks only for positional paths; a topic name resolved; every spec named by an area; every named doc exists; verify the coverage test fails when a spec is removed from the list.
- [x] 2.4 Update the `areas` row in the memory `SKILL.md`, step 1 of `.agents/skills/apply/references/build-helper.md`, and *Facts by code area* in `wiki/development/memory.md`, each offset by an equal cut; verify with `node scripts/measure-context.mjs --json` that none grew.

## 3. Where agents learn about it

- [x] 3.1 Name the lookup in `AGENTS.md` *Where context lives* and add the move and orphan lines to `wiki/wiki-style.md`, each offset by an equal cut; verify AGENTS.md's word count did not grow and `node .github/scripts/wiki-links.mjs` still passes.

## 4. Release

- [x] 4.1 Add a `## Next (minor) — One web of code, facts, wiki pages, specs, and past plans` entry to `CHANGELOG.md`, with a plain *Updating* note that an install's wiki is now checked on each publish; verify `check-payload-links.mjs`, `check-retired-names.mjs`, and `measure-context.mjs --check` pass.
- [x] 4.2 Run `/save` and confirm CI passes on the pull request, the new wiki step included.

<!-- end tasks.md -->
<!-- file specs/knowledge-center/spec.md utf8 642 -->
## ADDED Requirements

### Requirement: The wiki's links are checked on every run

Every repo's test workflow SHALL check `wiki/` on every run, docs-only runs included, and fail when a link to a file in the repo points nowhere, when a page other than the root hub is linked from no other wiki page, or when a section's hub does not link one of its pages or subfolders. The failure SHALL name each page and link.

#### Scenario: A page nobody links to

- **WHEN** an install's wiki save adds `wiki/customers/acme.md` and no wiki page links to it
- **THEN** the check fails naming that page, and the save does not publish until a page links it

<!-- end specs/knowledge-center/spec.md -->
<!-- file specs/memory/spec.md utf8 1409 -->
## ADDED Requirements

### Requirement: One lookup shows everything linked to a path or topic

Each area in the `memory` skill's area list MAY name the wiki pages and specs that own it. Given paths, a topic name, or a change, the area load SHALL print, before its facts and even when the store is unreachable: the matched areas; their named docs that exist in the repo, skipping any it lacks; up to five archived changes, newest first, those naming a given path ahead of those sharing only an area; and, for each path asked about directly, the Markdown files and lines outside archived changes that link to it, read fresh on each call and never stored. In WongStack's own repo, every capability spec SHALL be named by at least one area and every named doc SHALL exist, or its tests fail.

#### Scenario: A mini-app file

- **WHEN** the lookup is asked about `app/worker/apps/hello/index.ts`, the `mini-apps` area names `wiki/stack/mini-apps.md` and `openspec/specs/mini-apps/spec.md`, and the archived change `mini-apps-in-the-main-app` names that folder
- **THEN** it prints `mini-apps` and `worker`, both docs, that change among its past changes, the pages linking to the file, then the `mini-apps` and `worker` facts

#### Scenario: A new spec with no area

- **WHEN** a change in WongStack's own repo adds `openspec/specs/reports/spec.md` and no area names it
- **THEN** the tests fail and name that spec

<!-- end specs/memory/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-01

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 43212 fence=~~~ -->
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
<title>Review · 2026-10-01-link-docs-to-code</title>
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
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-01-link-docs-to-code">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-01-link-docs-to-code</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Since 29.3.0, editing a part of the code brings up the saved warnings about it. The how-to page in the wiki, the record of what that part must keep doing, and the past plans that explain its shape don't come up. The assistant finds them only if it goes looking. On 2026-10-01 none of the 32 records of what shipped was linked from anywhere. Nothing checks the wiki for a page that nothing links to, or for a link to a page that's gone. And when the assistant moves a page, it can't see what links to it.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>One lookup shows everything linked to a file, page, or topic.</b> Topics sit at the centre: the code, saved facts, wiki pages, specs, and past plans each link to their topic. Ask about any one of them and you get the rest: its topic, the wiki pages and spec that own it, the past plans that changed it, what links to it, and the saved warnings. Planning and building already run this lookup before the first edit, so they get all of it.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0"> code ──┐               ┌── saved facts</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">        │               │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0"> wiki ──┼──── topic ────┼── specs</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">        │               │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0"> links ─┘               └── past plans</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-6" tabindex="0"> about app/worker/apps/hello/index.ts</span>
<span class="ln" data-note="item-1-line-7" tabindex="0"> ─────────────────────────────────────</span>
<span class="ln" data-note="item-1-line-8" tabindex="0"> topic   mini-apps, worker</span>
<span class="ln" data-note="item-1-line-9" tabindex="0"> docs    wiki/stack/mini-apps.md</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">         spec: mini-apps</span>
<span class="ln" data-note="item-1-line-11" tabindex="0"> past    Mini apps live in the main app</span>
<span class="ln" data-note="item-1-line-12" tabindex="0"> linked  wiki/stack/mini-apps.md:40</span>
<span class="ln" data-note="item-1-line-13" tabindex="0"> facts   &quot;test every route, not only</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">          the new one&quot; (9-30)</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Past plans come back when you touch the same code.</b> Every finished plan names the files it changed. The lookup shows the newest five that touched this file first, then this topic, so the assistant sees why the code has its shape before changing it. It reads the plans fresh each time, so nothing has to be kept up to date.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Every spec belongs to a topic.</b> Each of the 32 records of what shipped is listed under a topic, with a few new topics where none fits, such as the browser and hand-over. The online check fails when a new record belongs to no topic, or a listed page no longer exists, so the links can't quietly go stale.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The online check catches a lost wiki page, in every install.</b> Each publish checks the wiki: every page is linked from another page, each section's main page links every page in it, and no link points to a page that's gone. It runs here and in every install, on that business's own wiki. A wiki save with a broken link won't publish until it's fixed, and the assistant fixes it.</div></div></li>
</ol>
<p class="aside">Non-goals: hand-kept links from one item straight to another; a stored &quot;linked from&quot; list; links from wiki pages straight to specs, since installs don't get this repo's specs; matching by what a page says; checking a link's <code>#section</code> part; a graph database.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked whether there was a third improvement after 29.3.0 → yes: the graph-engineering research's third idea, close the wiki's link gaps (a lost-page check and a &quot;linked from&quot; lookup), never built. The user asked to link specs and the wiki to the code as well, and to plan both as one change.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked whether the wiki link check runs in every install on its own wiki → yes, every install.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked to keep track of backlinks as another way for the assistant to search → a lookup that lists every page linking to a given path.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked whether every spec must belong to a topic → yes, the online check fails on one that doesn't.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: backlinks are computed from the files on each call, not stored in a list or on each page, because a stored copy goes stale (<a href="../../../wiki/wiki-style.md#one-topic-one-page">one topic, one page</a>) and scanning the repo's Markdown is fast.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the area list names docs by hand in a <code>docs</code> field, not found by the links pages hold, because a trial on 2026-10-01 found link-derived pages both noisy (11 pages for <code>memory</code>) and blind (none for <code>worker</code>, though <code>wiki/stack/mini-apps.md</code> owns it).</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the spec-coverage check runs only in this repo's tests, because installs don't get this repo's specs, and requiring an area per install capability would add a step to <code>/plan</code>. In an install the lookup skips a listed doc it doesn't have.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: wiki pages don't link straight to specs, because wiki pages ship and specs don't, so the link would break in every install; the area list is the one place they meet.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the link check runs as a step in the shipped test workflow beside the loosened-checks step, on every run including docs-only ones, because that workflow already reaches every install and a wiki edit is often docs-only.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the check covers <code>wiki/</code> only: dead relative links, pages no other wiki page links to (the root hub excepted), and hubs that miss a child page or folder; it skips <code>#section</code> parts and assets, because this repo's payload link check already covers anchors on shipped pages, and an image is not a page.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: each edited instruction file ends no longer in words or bytes than it started, which keeps <code>measure-context.mjs --check</code> passing without a new baseline.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the check starts green, because a trial script on 2026-10-01 found 28 wiki pages, no lost page, one hub &quot;miss&quot; that is <code>wiki/assets/</code> (images, not a page), and 0 of 32 specs linked from any Markdown file.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked, after the review, whether to link everything into one web → yes, with topics at the centre and no hand-kept links between items: one lookup for any file, page, or topic that returns everything linked to it, and past plans as a fourth strand beside facts, wiki pages, and specs.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the one lookup is the existing <code>memory.mjs areas</code>, widened, not a new or renamed command, because <code>/explore</code>, the build helper, the memory skill, the spec, and the wiki already name it, and a rename would touch them all for no gain.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the link library lives in the memory skill and the shipped wiki check imports it, because <code>areas</code> needs backlinks too, and one copy of the link rules can't drift from another.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: past plans are found by the paths their proposal, design, and tasks name, newest five, plans naming the exact path first and then plans in the same topic, because a trial on 2026-10-01 read all 195 in 166 ms but found broad topics on most (<code>wiki</code> 130, <code>openspec</code> 106), so topic alone is noise.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: backlinks print only for paths asked about directly, not for every path a change names, because a change names dozens of paths and their backlinks would bury its facts.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: a topic is asked about by its bare name, such as <code>mini-apps</code>, when no file or folder has that name, because topic names never contain a slash and the rare clash resolves to the real path.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-01</p>Check: <code>.github/scripts/wiki-links.mjs</code> is a new check that fails on a broken wiki link, a lost page, or a hub that skips a page, because a lost page was invisible before; it loosens nothing.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-01</p>Check: <code>.github/workflows/test.yml</code> adds the <i>Check the wiki's links</i> step and a Summary sentence for it, because the wiki check must run in every install on every push; no existing step changes.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: checkpoint for gate task 4.2: tasks 1.1–4.1 are built and the related tests pass locally (250), along with the payload link, retired-name, config, and context checks; this save runs CI. The spec deltas were copied into the main memory and knowledge-center specs at this save. Past changes count a folder named in a plan as an exact match only when it is at least as deep as the path's area folder, so <code>wiki/</code> or <code>app/worker/</code> naming doesn't jump the queue.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: gate task 4.2 done: CI passed on PR #231 after merging main (#230; <code>wiki/development/memory.md</code> was the only conflict, keeping both edits), and the <i>Check the wiki's links</i> step ran and passed in the test workflow.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: archive checkpoint: all tasks ticked, CI passed on PR #231; the spec deltas were already copied into the main memory and knowledge-center specs at the earlier save, so the archive skipped specs. Released as 29.4.0.</li>
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
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
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
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
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
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
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

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
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
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
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
