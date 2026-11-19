<!-- openspec-archive v1 2026-09-27-reliability-housekeeping -->
<!-- file proposal.md utf8 7675 -->
# Reliability fixes and housekeeping

**Status:** ready-to-ship
**Branch:** loud-walrus
**Open questions:** none

## Why

Four small things quietly tell the wrong story. The memory's background run can say it saved sessions when it saved nothing. Publishing can miss the notes a chat left if its branch was renamed. The guide to adding a skill doesn't say what a skill kept only in WongStack skips. And the link check never looks at the setup skill, so a broken link there slips through.

## What Changes

- **The memory report counts what was really saved.** The background run no longer reports its own numbers. The memory tool tallies what each save actually stored, and the report shows that tally. When the run's claim differs, the report says so.
  ```text
  run saves sessions
        │
        ▼
  tool tallies each save
        │
        ▼
  report = the tally
  (+ "claim differed")
  ```
- **Publishing finds a chat's notes after a rename.** When it gathers notes to keep, publishing also looks up every chat that wrote a note about the change, not only chats that began on the current branch name.
  ```text
  notes to keep =
    chats on this branch
    + chats with a note
      on this change
  ```
- **The add-a-skill guide covers WongStack-only skills.** A skill that stays in WongStack, like the dependency updater, does only the first step. It skips the install list, setup, and the release notes.
- **The link check covers the setup skill.** Links from the setup skill, and the dependency updater, are checked against WongStack itself, headings included. A renamed heading they point at now fails the check.

**Non-goals:** changing how `/ship` treats local branches; checking heading links across the rest of the payload; the other two parts of this request (Codex reading the rules, memory security).

**Separately, with your OK:** clear the 142 old local branches in the main copy whose online copy is gone. This is a one-time cleanup, listed as the last step; it changes no file and nothing is deleted before you confirm.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: search gains a filter for facts from the sessions that worked on a change; the background run's recorded counts come from what the store wrote, not from the model.
- `delivery-gate`: the distill step also reads facts from sessions that wrote a fact on the change, so a renamed branch loses none.
- `payload-checks`: the link check also resolves links and heading anchors in source-only skills against the source repo.

## Impact

- Memory: `.agents/skills/memory/scripts/memory.mjs` (`search --change`, a run tally written by `put-facts` and `strip`, read by `finish-run`), `.agents/skills/memory/scripts/run.mjs` (starts and removes the tally), `.agents/skills/memory/scripts/lib/digest.mjs` (the run line notes a differing claim), `.agents/skills/memory/SKILL.md` (Read table and runbook step 4).
- Ship: `.agents/skills/ship/SKILL.md` (distill commands).
- Link check: `scripts/check-payload-links.mjs`, `scripts/tests/payload-links.test.mjs`.
- Tests: `scripts/tests/memory-capture.test.mjs`, `scripts/tests/memory-store.test.mjs`.
- Wiki: `wiki/development/adding-a-skill.md`, `wiki/development/memory.md` if it restates the run's counts.
- `CHANGELOG.md` gets a `## Next (patch)` entry; `/ship` numbers it.
- Outward, outside the change: local branches in `/root/WongStack`.

## Decision log

- **2026-09-27** — Asked for the scope of this part → chose the five settled items: honest capture counts (fact #169), distill after a branch rename (#178), the source-only skill note (#60), link-check coverage of wong-setup (#55), and a one-time cleanup of gone local branches (#87) as an outward step with a confirm, outside the change.
- **2026-09-27** — Assumed: the run's counts come from a tally the memory script writes as each `put-facts` and `strip` returns, in the clone's state folder, rather than a store query by time window, because a user's own `/save` can write session rows during a run and a time window would count them.
- **2026-09-27** — Assumed: `finish-run` records the tally and ignores the model's numbers, noting in the run's reason when they differ, because the fact (#169) asks that a hedging model cannot report a false success; the model still calls `finish-run` so it can report a failure.
- **2026-09-27** — Assumed: consolidation counts come from the same tally (facts written with source `consolidation`), because `stats` reads them for the embeddings trigger and has the same trust gap.
- **2026-09-27** — Assumed: the rename fix matches the change slug's sessions, not old branch names from the reflog, because a session that worked on the change writes a fact on its slug wherever the rename happened, and the reflog is local and absent after a Paseo rename in another checkout.
- **2026-09-27** — Assumed: on `main`, distill also runs the slug-session search, because unlike `--branch main` it is bounded to the change.
- **2026-09-27** — Assumed: source-only skills are derived as the skill folders no manifest category lists (today `wong-setup` and `update-dependencies`), so a new one is covered with no list to keep.
- **2026-09-27** — Assumed: heading anchors are checked only for source-only skills, because the fact names anchors as the gap there, and turning anchor checks on across the payload may surface unrelated breakage in a housekeeping change.
- **2026-09-27** — Assumed: a patch release, because each item fixes or documents existing behavior.
- **2026-09-27** — Assumed: the branch cleanup deletes only branches not checked out in any worktree and whose tip matches a merged pull request's head, and lists the rest for you, because a gone upstream alone does not prove the work landed.
- **2026-09-27** — Assumed: a `put-facts --home` that finds no home recorded counts every fact in its input as dropped, and a home write adds nothing else to the tally, because the runbook counts `no home recorded` as dropped and home facts are not this repo's capture.
- **2026-09-27** — Assumed: the model's `--counts` is compared only on known count keys, and on a failed run its own reason comes first with the differing-counts note after, so no free text from the model reaches the note.
- **2026-09-27** — Local checks: lint and the c8-wrapped script suite pass (484 tests: 475 pass, 9 skip, 0 fail); the payload link check, now reading 33 heading links in `wong-setup` and `update-dependencies`, found none broken; the OpenSpec config check, the retired-names check, strict spec validation, and the context check pass.
- **2026-09-27** — Asked whether to delete the gone local branches in the main checkout → chose the 138 whose tip equals a merged pull request's head; deleted all 138. Kept `server-setup-script` and `update-openspec` (checked out in worktrees), `explore/setup-usage-ux` (one unpushed renumber commit; its work shipped as #150), and `climu-dev-vars-commands` (PR #17 closed unmerged).
- **2026-09-27** — Distilled facts before the archive: no repeatable fact; the store had no facts for this change or its branch.
- **2026-09-27** — Archived by `/ship` and saved as one checkpoint on `loud-walrus`; the specs synced `memory` (2 modified), `delivery-gate` (1 modified), and `payload-checks` (1 modified). Before it, `main` shipped 26.10.0 (`3aee591`, Codex reads the rules): merged it in, kept both `CHANGELOG.md` entries with this one on top, and kept its simpler `checkSymlinked()` call beside the new source-only check. This change is 26.10.1. After the merge the link tests (12), memory tests (47), lint, and the link check pass.

<!-- end proposal.md -->
<!-- file design.md utf8 6409 -->
# Design

## Context

See proposal.md — Why. Four independent fixes, one per surface:

- **Run counts.** `run.mjs` starts the headless model with `WONG_MEMORY_RUN=1` and holds `run.lock` in the clone's state folder, so at most one run per clone is live. The model ends with `finish-run --kind capture --status ok --counts '{…}'`, and `finishRun` in `memory.mjs` stores that JSON as given. `digest.mjs`'s `formatRun` prints it as the "Last background capture run" line. `stats` reads consolidation `merged` counts for the embeddings trigger.
- **Distill search.** `/ship` Step 2 runs `show "$CHANGE_NAME"` and `search --branch "$BRANCH"`. `search --branch` joins `sessions.branch`, which is the branch at session start.
- **Link check.** `checkDead` scans only files a target receives. `wong-setup` and `update-dependencies` are in no manifest category, so their links are never read. No link check reads anchors.
- **Adding a skill.** `wiki/development/adding-a-skill.md` lists five steps with no note for a source-only skill.

## Goals / Non-Goals

**Goals:** a run's recorded counts cannot exceed what it stored; distill survives a branch rename with no git history; broken paths and anchors from source-only skills fail CI.

**Non-Goals:** recording a run the model never finishes (the existing failure path in `run.mjs` stays as is); anchor checks for shipped payload files; any change to how `/ship` handles local branches.

## Decisions

### The run keeps a tally file, and `finish-run` records it

`run.mjs`, holding the lock, writes an empty `run-tally.json` in the state folder before it spawns the model and removes it in its `finally`. When `WONG_MEMORY_RUN=1` and the tally file exists, `memory.mjs` adds to it:

- `put-facts`, after a successful store write: by the returned `status` (`captured` or `skipped`), and `added`, `superseded`, `dropped` from `putFacts`'s result. A write with `source: "consolidation"` adds to `merged` (its kept facts) and `consolidationSuperseded` instead.
- `strip`, on `private:` → `private`; on `not recognized:` → `unrecognized`.
- `put-facts --home` adds only `dropped` for a `no home recorded` result, matching the runbook's rule.

`finish-run --kind capture` records the tally's capture counts; `--kind consolidation` records `{ merged, superseded }` from its consolidation counts. `--counts`, when given, is parsed and compared: any key that differs puts `model reported other counts: <keys>` in the run's `reason` (values are counts, never text from a transcript). With no tally file (a hand-run `finish-run`, or an older `run.mjs`), `--counts` is recorded as today, so nothing breaks mid-upgrade.

`formatRun` appends `(the run's own report differed)` to an `ok` line whose reason starts `model reported other counts`.

*Alternative:* count store rows by `sessions.updated_at >= WONG_MEMORY_RUN_STARTED` and `machine`. Rejected: a user's `/save` in another chat on the same machine writes session rows in that window and would be counted. *Alternative:* drop `--counts` from the runbook. Kept it, because the comparison is what exposes a hedging model, and `--status failed --reason` still needs the call.

A spooled write sent in runbook step 1 counts like any `put-facts`: it is work the run did.

### `search --change <slug>` unions session sets

`search` gains `--change <slug>`: facts whose `session_id` is in `SELECT DISTINCT session_id FROM facts WHERE slug = ? AND session_id IS NOT NULL`. With `--branch` too, the session filter is `s.branch = ? OR f.session_id IN (…)`, so one query returns both sets and the existing limit and ranking apply once. The team filter applies as today. `/ship` runs:

```bash
node "$M" show "$CHANGE_NAME"
node "$M" search --branch "$BRANCH" --change "$CHANGE_NAME" --limit 200   # feature branch
node "$M" search --change "$CHANGE_NAME" --limit 200                      # main
```

*Alternative:* old names from `git reflog` (`Branch: renamed refs/heads/A to refs/heads/B`). Rejected: Paseo may rename in another checkout, and a reflog is local.

### Source-only skills are checked against the source tree, anchors included

`check-payload-links.mjs` gains a third check. Source-only skills are the folders under `.agents/skills/` that no manifest category's `skillDirs` lists. For each Markdown file in them, every relative link (code masked, as today) resolves against the working tree: the path must exist, and a `#anchor` on a Markdown target must match one of its headings.

Heading slugs follow GitHub: lowercase, drop characters other than letters, digits, spaces, hyphens, and underscores, spaces to hyphens, and `-1`, `-2` for repeats. `#step-5--the-closing-report` (from `Step 5 — the closing report`) is the case that proves the em dash rule. An anchor on a non-Markdown target, or a link to a directory, checks the path only. A failure prints `file:line -> target` under its own heading, like the other two checks.

*Alternative:* add wong-setup to the target file set. Rejected: it does not ship, and its links to `wiki/` pages a target lacks are correct in the source.

### Adding-a-skill gets one opening note

A short paragraph after the step list's lead-in: a skill that stays in WongStack (today `wong-setup` and `update-dependencies`) does step 1 only; it is not added to `payload-files.json`, no setup surface names it, and its edits need no changelog entry of their own. The manifest guide already lists which skills are source-only, so the note links there instead of restating the list.

## Risks / Trade-offs

- [The model skips `finish-run` entirely] → The tally is discarded with the run and no row is written, as today. Out of scope; the digest keeps showing the previous run.
- [Codex's sandbox writes the tally] → `run.mjs` already grants the state folder as a writable root for Codex.
- [Turning on the source-only check finds broken links today] → Fix them in the same change (task 3.3); none were seen in a survey of about 40 targets.
- [A heading-slug edge case GitHub handles differently, such as emoji] → The slug rule is tested on this repo's real headings; a false failure names the anchor and is fixed by linking the exact slug.

## Migration Plan

No store migration: the `runs` table and its `counts` JSON are unchanged. An installed repo gets the fix on its next `/wong-sync`; a run started by an older `run.mjs` makes no tally file and records as before.

<!-- end design.md -->
<!-- file tasks.md utf8 3875 -->
# Tasks

## 1. Memory: run counts come from what was stored (script, skill, docs)

- [x] 1.1 `run.mjs`: under the lock, write an empty `run-tally.json` in the state folder before spawning the model and remove it in `finally`; verify with a `memory-capture.test.mjs` case that the file exists during a fake agent run and is gone after
- [x] 1.2 `memory.mjs`: when `WONG_MEMORY_RUN=1` and the tally exists, add to it after a successful `put-facts` (captured or skipped, added, superseded, dropped; `source: "consolidation"` to merged and consolidation superseded; `--home` to dropped only) and after `strip` (private, unrecognized); verify with tests that a hand run without the env var or without the file writes no tally
- [x] 1.3 `finishRun`: with a tally, record its capture or consolidation counts; compare any `--counts` and put `model reported other counts: <keys>` in the reason when they differ; with no tally, record `--counts` as today; verify with tests for the false-success case (tally empty, `--counts` says private 4 → recorded counts empty, reason set) and the no-tally case
- [x] 1.4 `digest.mjs` `formatRun`: append `(the run's own report differed)` to an ok line with that reason; verify with a digest test
- [x] 1.5 `.agents/skills/memory/SKILL.md` runbook steps 3.3 and 4 and `wiki/development/memory.md`: say the script records what it stored and compares the model's counts; verify the runbook still renders in `runbook()` (existing run test)

## 2. Memory search and ship distill (script, skill)

- [x] 2.1 `memory.mjs search`: add `--change <slug>` (sessions that wrote a fact on the slug), unioned with `--branch` in one query; add it to `OPTIONS` and `USAGE`; verify with `memory-store.test.mjs` cases for the renamed-branch scenario, `--change` alone, and the team filter still applying
- [x] 2.2 `.agents/skills/memory/SKILL.md` Read table: list `--change`; verify `node scripts/measure-context.mjs --check` passes
- [x] 2.3 `.agents/skills/ship/SKILL.md` distill: feature branch runs `search --branch "$BRANCH" --change "$CHANGE_NAME"`, main runs `search --change "$CHANGE_NAME"`; verify the text matches the `delivery-gate` delta

## 3. Link check covers source-only skills (script)

- [x] 3.1 `scripts/check-payload-links.mjs`: derive source-only skills as `.agents/skills/*` folders in no category's `skillDirs`; resolve each relative link in their Markdown against the working tree, and check a `#anchor` on a Markdown target against GitHub-style heading slugs (repeats get `-1`, `-2`); report `file:line -> target` under its own heading and exit 1
- [x] 3.2 `scripts/tests/payload-links.test.mjs`: cases for a missing path and a renamed heading from a fixture `wong-setup` (fail), a valid em-dash anchor like `#step-5--the-closing-report` (pass), a repeated heading's `-1` anchor (pass), and a shipped skill's anchor staying unchecked
- [x] 3.3 Run `node scripts/check-payload-links.mjs` here and fix any broken link it finds in `wong-setup` or `update-dependencies`; verify it exits 0

## 4. Adding a skill (wiki)

- [x] 4.1 `wiki/development/adding-a-skill.md`: add the source-only note (step 1 only; no manifest entry, setup surface, or changelog entry of its own), linking the manifest guide's [Not copied](../../../.agents/skills/wong-sync/references/payload-manifest.md#not-copied) section; verify the link check passes

## 5. Release

- [x] 5.1 Add a `## Next (patch) — <Title>` entry to `CHANGELOG.md` covering all four fixes, with an **Updating** note: nothing to do by hand
- [x] 5.2 Run the script tests as `payload.yml` does (lint and the c8-wrapped suite, `TMPDIR=/var/tmp`), `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, `openspec validate --specs --strict --no-interactive`, and `node scripts/measure-context.mjs --check`; CI on `/save` confirms

<!-- end tasks.md -->
<!-- file specs/delivery-gate/spec.md utf8 960 -->
## MODIFIED Requirements

### Requirement: Ship distills the change's facts into the wiki

Before archiving, `/ship` SHALL read the facts recorded on the change, on its branch, and by any session that wrote a fact on the change, so a renamed branch loses none. It SHALL keep only repeatable knowledge and write it into the owning wiki pages in the same pull request (`knowledge-center`), noting the pages or "no repeatable fact" in the Decision log. A private-life fact SHALL NOT move into the repo's wiki, and an unreachable store SHALL skip the step without blocking the ship.

#### Scenario: A reusable convention

- **WHEN** a change's facts record a convention for future work
- **THEN** the ship pull request edits the wiki page that owns it

#### Scenario: The branch was renamed mid-change

- **WHEN** a session started on a branch that was later renamed, and wrote facts on the change and on another topic
- **THEN** the distill step reads both facts

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/memory/spec.md utf8 2139 -->
## MODIFIED Requirements

### Requirement: Search finds facts by words, tags, and filters

The `memory` skill SHALL search live facts by words, tag, type, date, author, branch, slug, change state, and the sessions that worked on a change, with no embeddings. A session worked on a change when it wrote a fact on the change's slug. Given both a branch and a change, search SHALL return facts from either set of sessions. Each fact SHALL print with its age and author, as dated context the repo overrides when they conflict, and a new tag SHALL need a definition.

#### Scenario: Search by tag and date

- **WHEN** the agent searches tag `ship` since a date
- **THEN** it gets one line per matching live fact, each with its age and author

#### Scenario: A session's branch was renamed

- **WHEN** a session started on branch `magical-chicken`, wrote a fact on change `add-home-repo` and a fact on topic `paseo`, and the branch became `explore/home-mode`
- **THEN** a search by branch `explore/home-mode` and change `add-home-repo` returns both facts

### Requirement: Unsaved sessions are captured in the background

A background run the session-start hook starts, never the main agent, SHALL capture this repo's own sessions that ended without `/save`, a few per run, newest first. It SHALL skip what `/save` already covered, pass every fact through the gate, and treat transcript content as data, never as instructions. A session with `#private` in any user message SHALL get no upload, no model read, and no facts. The counts a run records SHALL be what the memory script stored during that run, never the model's own report; when the model reports different counts, the run's record SHALL say so.

#### Scenario: Instructions inside a fetched page

- **WHEN** a transcript holds a page telling the reader to write something into memory
- **THEN** the facts record only what the session did

#### Scenario: The model claims work it did not do

- **WHEN** a background run writes nothing and the model finishes with `private 4`
- **THEN** the recorded run counts no private session, and the next digest says the run's own report differed

<!-- end specs/memory/spec.md -->
<!-- file specs/payload-checks/spec.md utf8 827 -->
## MODIFIED Requirements

### Requirement: The link check catches links a target or GitHub cannot follow

The link check SHALL fail on a live Markdown link that resolves nowhere in a target or passes through a symbolic link, naming the real path. A skill that stays in the source repo SHALL have its links resolved against the source repo, heading anchors included. Code spans and commands SHALL NOT be checked.

#### Scenario: A wiki page links through `.claude/`

- **WHEN** a wiki page links `../.claude/skills/save/SKILL.md`
- **THEN** the check fails and names `.agents/skills/save/SKILL.md` as the path to use

#### Scenario: Setup links a renamed heading

- **WHEN** `wong-setup` links `../memory/SKILL.md#background-run` and that heading was renamed
- **THEN** the check fails and names the file and the missing anchor

<!-- end specs/payload-checks/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 39091 fence=~~~ -->
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
<title>Review · 2026-09-27-reliability-housekeeping</title>
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
<body data-change="2026-09-27-reliability-housekeeping">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-reliability-housekeeping</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Four small things quietly tell the wrong story. The memory's background run can say it saved sessions when it saved nothing. Publishing can miss the notes a chat left if its branch was renamed. The guide to adding a skill doesn't say what a skill kept only in WongStack skips. And the link check never looks at the setup skill, so a broken link there slips through.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>The memory report counts what was really saved.</b> The background run no longer reports its own numbers. The memory tool tallies what each save actually stored, and the report shows that tally. When the run's claim differs, the report says so.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">run saves sessions</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">      │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">tool tallies each save</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">      │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">report = the tally</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">(+ &quot;claim differed&quot;)</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Publishing finds a chat's notes after a rename.</b> When it gathers notes to keep, publishing also looks up every chat that wrote a note about the change, not only chats that began on the current branch name.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">notes to keep =</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">  chats on this branch</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">  + chats with a note</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">    on this change</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The add-a-skill guide covers WongStack-only skills.</b> A skill that stays in WongStack, like the dependency updater, does only the first step. It skips the install list, setup, and the release notes.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The link check covers the setup skill.</b> Links from the setup skill, and the dependency updater, are checked against WongStack itself, headings included. A renamed heading they point at now fails the check.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> changing how <code>/ship</code> treats local branches; checking heading links across the rest of the payload; the other two parts of this request (Codex reading the rules, memory security).</p>
<p class="aside"><b>Separately, with your OK:</b> clear the 142 old local branches in the main copy whose online copy is gone. This is a one-time cleanup, listed as the last step; it changes no file and nothing is deleted before you confirm.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked for the scope of this part → chose the five settled items: honest capture counts (fact #169), distill after a branch rename (#178), the source-only skill note (#60), link-check coverage of wong-setup (#55), and a one-time cleanup of gone local branches (#87) as an outward step with a confirm, outside the change.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the run's counts come from a tally the memory script writes as each <code>put-facts</code> and <code>strip</code> returns, in the clone's state folder, rather than a store query by time window, because a user's own <code>/save</code> can write session rows during a run and a time window would count them.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>finish-run</code> records the tally and ignores the model's numbers, noting in the run's reason when they differ, because the fact (#169) asks that a hedging model cannot report a false success; the model still calls <code>finish-run</code> so it can report a failure.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: consolidation counts come from the same tally (facts written with source <code>consolidation</code>), because <code>stats</code> reads them for the embeddings trigger and has the same trust gap.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the rename fix matches the change slug's sessions, not old branch names from the reflog, because a session that worked on the change writes a fact on its slug wherever the rename happened, and the reflog is local and absent after a Paseo rename in another checkout.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: on <code>main</code>, distill also runs the slug-session search, because unlike <code>--branch main</code> it is bounded to the change.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: source-only skills are derived as the skill folders no manifest category lists (today <code>wong-setup</code> and <code>update-dependencies</code>), so a new one is covered with no list to keep.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: heading anchors are checked only for source-only skills, because the fact names anchors as the gap there, and turning anchor checks on across the payload may surface unrelated breakage in a housekeeping change.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a patch release, because each item fixes or documents existing behavior.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the branch cleanup deletes only branches not checked out in any worktree and whose tip matches a merged pull request's head, and lists the rest for you, because a gone upstream alone does not prove the work landed.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a <code>put-facts --home</code> that finds no home recorded counts every fact in its input as dropped, and a home write adds nothing else to the tally, because the runbook counts <code>no home recorded</code> as dropped and home facts are not this repo's capture.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the model's <code>--counts</code> is compared only on known count keys, and on a failed run its own reason comes first with the differing-counts note after, so no free text from the model reaches the note.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Local checks: lint and the c8-wrapped script suite pass (484 tests: 475 pass, 9 skip, 0 fail); the payload link check, now reading 33 heading links in <code>wong-setup</code> and <code>update-dependencies</code>, found none broken; the OpenSpec config check, the retired-names check, strict spec validation, and the context check pass.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether to delete the gone local branches in the main checkout → chose the 138 whose tip equals a merged pull request's head; deleted all 138. Kept <code>server-setup-script</code> and <code>update-openspec</code> (checked out in worktrees), <code>explore/setup-usage-ux</code> (one unpushed renumber commit; its work shipped as #150), and <code>climu-dev-vars-commands</code> (PR #17 closed unmerged).</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distilled facts before the archive: no repeatable fact; the store had no facts for this change or its branch.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archived by <code>/ship</code> and saved as one checkpoint on <code>loud-walrus</code>; the specs synced <code>memory</code> (2 modified), <code>delivery-gate</code> (1 modified), and <code>payload-checks</code> (1 modified). Before it, <code>main</code> shipped 26.10.0 (<code>3aee591</code>, Codex reads the rules): merged it in, kept both <code>CHANGELOG.md</code> entries with this one on top, and kept its simpler <code>checkSymlinked()</code> call beside the new source-only check. This change is 26.10.1. After the merge the link tests (12), memory tests (47), lint, and the link check pass.</li>
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
