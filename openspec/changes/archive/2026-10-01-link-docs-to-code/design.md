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
