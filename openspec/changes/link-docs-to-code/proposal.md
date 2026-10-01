# One web of code, facts, wiki pages, specs, and past plans

**Status:** in-progress

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
