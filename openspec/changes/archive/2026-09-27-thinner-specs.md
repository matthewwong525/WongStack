<!-- openspec-archive v1 2026-09-27-thinner-specs -->
<!-- file proposal.md utf8 7397 -->
# Thinner specs: keep the promises, cut the how

**Status:** ready-to-ship
**Branch:** explore/thinner-specs
**Open questions:** none

## Why

The specs in `openspec/specs/` are meant to be the record of what WongStack promises. Today they come to about 84,000 words — nearly three times the 31,000 words of instructions they describe — because most of each spec retells *how* a skill works, step by step. That makes them slow to read and quick to go stale. Every time a skill changes, the spec has to be updated to match, or it quietly goes wrong.

## What Changes

- **Each spec keeps only its promises.** A rule stays when a person or an installed repo relies on it: what they see, what must never happen, and what an update delivers. The steps, script names, file names, and exact wording go, because the skills already hold them. Each rule keeps one or two examples, not five.
  ```text
  a rule today
  ─────────────────────────────
  promise          ── keeps
  which script     ── cut
  which file       ── cut
  exact wording    ── cut
  5 examples       ── 1 or 2
  ```
- **Overlapping specs merge.** Specs that cover one topic from several sides become one spec. For example, the three about updates become one, and so do the three about memory. That takes 48 files down to about 25.
  ```text
  before (48)              after (~25)
  ───────────              ───────────
  wong-sync           ┐
  wong-sync-adapt     ├──▶ wong-sync
  wong-sync-after-    │
    picture           ┘
  memory-store        ┐
  memory-recall       ├──▶ memory
  memory-capture      ┘
  … and the rest
  ```
- **The specs stay short.** Planning gets a standing rule: a new or changed spec states the promise and leaves the steps to the skill. This also holds in every repo that installs WongStack, so their specs stay short too.
- **What you'll notice:** the spec files get shorter and there are fewer of them. `/verify` checks a preview against these examples, so it has fewer to walk. Nothing else about how WongStack works changes.

**Non-goals:** dropping `openspec/specs/`, changing what any skill does, and rewriting archived changes. The archive keeps the old wording as the record.

## Capabilities

### New Capabilities

None as deltas. The merged capabilities (`memory`, `apply`, `knowledge-center`, and the others in the design's merge map) are written straight into `openspec/specs/` by the tasks.

### Modified Capabilities

None as deltas. This change sets `skip_specs: true` and rewrites `openspec/specs/` directly. The new spec bar is written as a requirement of the merged `openspec-workflow` capability during that rewrite.

## Impact

- `openspec/specs/**`: every spec is rewritten; 31 capability folders fold into 8 new ones; with `multi-part-workspaces` from main, 26 in all. Target: under 28,000 words in total and at most two scenarios per requirement.
- Payload: `.agents/rules/openspec.md` gains the spec bar; `openspec/config.yaml` (meta-only) gains a `specs` rule that points to it.
- `scripts/retired-names.json`: `allow` paths and replacement texts that name moved or merged specs; new entries for the retired capability names that no live file should still cite.
- `VERSION` 25.15.0 → 25.16.0 and a `CHANGELOG.md` entry.

## Decision log

- **2026-09-26** — Asked which way to take the spec files → chose keep them, but thinner (memory #233, confirmed in the 2026-09-27 queue, memory #292).
- **2026-09-27** — Asked what a spec should keep after the cut → chose promises only: each rule a person or another repo relies on, with one or two examples, and none of the how.
- **2026-09-27** — Asked whether overlapping specs should merge into fewer files → chose merge overlaps.
- **2026-09-27** — Asked whether future changes should follow the same bar → chose yes, add the rule.
- **2026-09-27** — Assumed: the change rewrites `openspec/specs/` directly with `skip_specs: true`, not through delta specs, because OpenSpec 1.13.2 can't drop a scenario inside a MODIFIED block (memory #232). Each of 330 requirements would need a REMOVED plus an ADDED under a new name, which would bury the change. The archive keeps the old wording.
- **2026-09-27** — Assumed: a promise stays in its spec even when a skill also states it, because the spec is the record of what shipped and the skill is how it runs.
- **2026-09-27** — Assumed: the spec bar lives in `.agents/rules/openspec.md`, which ships and loads whenever someone edits `openspec/`, and `openspec/config.yaml` gets a one-line pointer, because the config does not ship to installed repos and the rule should hold there too.
- **2026-09-27** — Assumed: no script counts scenarios or words, because the bar is a judgment about promise versus how, and a count check would push authors to cram examples together rather than cut the how. The totals are checked once, in the tasks.
- **2026-09-27** — Assumed: the merge map in the design lands on 25 capabilities, the low end of the "about 25–30" given in explore, because `downstream-contract` is about tests and fits `ci-tests`, and the other small specs each hold one topic with no overlap. The builder may split a merged spec back out if it reads as two topics.
- **2026-09-27** — Assumed: distinctive retired capability names go into `scripts/retired-names.json`, and names that are also test files or ordinary words stay out, because the check would otherwise flag files that use those names legitimately.
- **2026-09-27** — Assumed: where a spec disagrees with its skill, the rewritten spec follows the skill, because this change thins the record and changes no behavior.
- **2026-09-27** — Assumed: a minor release, 25.14.0, because the rule file that ships to installed repos gains a new planning rule.
- **2026-09-27** — Assumed: the rewrite meets the bar as built — 25 capabilities, 25,487 words, 265 requirements, 344 scenarios, and no requirement with more than two scenarios — so no merged spec was split back out.
- **2026-09-27** — Assumed: the planning-config check requirement moves from `ux-wireframes` to `payload-checks`, because it guards the payload rather than the review page.
- **2026-09-27** — Saved at CI gate task 5.4. `main` had shipped 25.14.0 (`79ac32f`, plain words for everyone) and 25.15.0 (`bd555b6`, multi-part workspaces). Merged it in: main's new `reader-level` and `structured-asks` wording (no technical level; plain words for all, detail when asked, kept as a preference on the person page) is folded into `asking-the-user`, and both source folders stay deleted. `multi-part-workspaces` already meets the bar and stays as is, so there are 26 capabilities, 26,276 words, and no requirement with more than two scenarios. This change becomes 25.16.0. Strict spec validation (26), the config, retired-names, payload-link, and context checks pass after the merge.
- **2026-09-27** — Distilled facts before the archive: no repeatable fact. The spec bar already lives in `.agents/rules/openspec.md`; the open threads (the plan-link follow-up, the queue) stay in memory.
- **2026-09-27** — Archived by `/ship` and saved as one checkpoint on `explore/thinner-specs`; no deltas to sync (`skip_specs`), so `openspec/specs/` already holds the result.

<!-- end proposal.md -->
<!-- file design.md utf8 6432 -->
# Design

## Context

See proposal.md, Why. Baseline on `main` 25.13.0 (`58cdfdc`): 48 capabilities in `openspec/specs/`, about 84,000 words, 330 requirements, 1,030 scenarios. Skills and their references come to about 31,000 words. Nothing reads a spec at run time except `/verify`'s walkthrough, which probes the scenarios of capabilities whose files a branch touches ([walkthrough](../../../.agents/skills/verify/references/walkthrough.md)). `scripts/retired-names.json` names four spec paths in `allow` lists. Specs do not ship to installed repos; `.agents/rules/openspec.md` does.

## Goals / Non-Goals

**Goals:**
- Each requirement states one promise in one or two sentences, with at most two scenarios.
- 25 capabilities, under 28,000 words in total.
- `openspec validate --specs --strict --no-interactive` passes.
- A standing bar that planning agents read before they write spec text, here and in installed repos.

**Non-Goals:**
- Changing any skill, script, or wiki page to match a spec. When the rewrite finds a spec that disagrees with its skill, the skill wins, and the spec says what the skill does.
- Touching `openspec/changes/archive/`.

## Decisions

### The bar: a promise, not a procedure

A requirement stays when a person or an installed repo relies on it:
- **What they see or get** — the outcome of a verb, a page, a report.
- **What must never happen** — no push without a gate, no production data in staging, no secret in git.
- **What an update delivers or preserves** — the install record, target-owned files, fragments merged, never overwritten.

Cut from the requirement text: which script or step does it, file and function names (unless the name *is* the promise, like `.env.example` or `/apps/<name>/`), exact wording of a message, ordering inside a skill, and restated rationale. Keep one scenario for the ordinary case and, where one exists, one for the edge or the failure the rule exists to stop. Two near-identical requirements become one.

Alternatives: *only what no skill says* (user declined; the specs would stop being a whole picture), and *a word target alone* (user declined; it cuts without a test for what stays).

### Rewrite in place, no deltas

The change sets `skip_specs: true` and edits `openspec/specs/` directly. OpenSpec 1.13.2 rejects a MODIFIED block that drops a scenario, so a delta rewrite would need a REMOVED and an ADDED for nearly every requirement, and 23 retired capabilities. `/save` has no deltas to reconcile, and archive has none to sync. The archive keeps the old text.

### The merge map

| New capability | Merged from |
|---|---|
| `knowledge-center` | `agent-knowledge-center`, `wiki-root`, `people-wiki`, `simplified-technical-english` |
| `asking-the-user` | `explore-clarification`, `structured-asks`, `reader-level` |
| `change-loop` | `request-routing`, `work-verbs`, `code-first-planning` |
| `openspec-workflow` | `openspec-cli-workflow`, `change-branch-association`, plus the new spec-bar requirement |
| `apply` | `apply-plan-handoff`, `apply-completion-handoff` |
| `delivery-gate` | `delivery-gate`, `ship-full-cycle`, `checkpoint-helpers`, `preview-discovery` |
| `memory` | `memory-store`, `memory-recall`, `memory-capture` |
| `wong-sync` | `wong-sync`, `wong-sync-adapt`, `wong-sync-after-picture` |
| `install-onboarding` | `install-onboarding`, `server-setup` |
| `cloudflare-provisioning` | `cloudflare-provisioning`, `cloudflare-access-guide`, `cf-secret-parity` |
| `payload-layout` | `payload-single-source`, `agent-config-layout`, `path-scoped-rules` |
| `dependencies` | `dependency-currency`, `toolchain-dependencies` |
| `ci-tests` | `ci-tests`, `downstream-contract` |

Kept alone, thinned: `app-scaffold`, `stack-pack`, `mini-apps`, `secrets-convention`, `payload-checks`, `context-economy`, `staging-walkthrough`, `ux-wireframes`, `open-source-release`, `repository-improvement`, `paseo-routines`, `browser-logins`. Total: 25.

A merged spec gets one `## Purpose` for the whole topic. Requirement names stay unique inside it. The builder may split a merged spec back out when it reads as two topics, and records that in the Decision log.

### Where the bar lives

`.agents/rules/openspec.md` owns it: a short paragraph, loaded whenever anyone edits `openspec/**`, here and in installed repos. `openspec/config.yaml` gets a `specs:` rule of one sentence that points at the rule file, so `openspec instructions specs` shows it too. The config rule contains no `: ` inside a plain scalar (memory #95); `scripts/check-openspec-config.mjs` confirms it parses. The `openspec-workflow` spec states the promise that specs hold promises, not procedure.

### Retired names

Retired capability names with a distinctive form (`apply-plan-handoff`, `apply-completion-handoff`, `wong-sync-adapt`, `wong-sync-after-picture`, `memory-recall`, `memory-capture`, `explore-clarification`, `structured-asks`, `request-routing`, `change-branch-association`, `openspec-cli-workflow`, `payload-single-source`, `cf-secret-parity`, `toolchain-dependencies`, `dependency-currency`) go into `scripts/retired-names.json` with their new capability as the replacement, so the check finds any live file still citing them. Names that are also ordinary words or file names elsewhere (`memory-store`, `downstream-contract`, `server-setup`, `people-wiki`, `wiki-root`, `reader-level`, `checkpoint-helpers`, `preview-discovery`) are left out, because `downstream-contract.test.mjs` and similar files keep those names legitimately. Existing entries whose `allow` paths or replacement text name a moved spec are updated.

## Risks / Trade-offs

- [A cut drops a real promise that only the spec held] → Before deleting a requirement, the builder checks that it is either a how, a duplicate, or stated by the kept promise. Anything that is none of those stays.
- [`/verify` probes fewer scenarios] → Accepted by the user's choice of one or two per rule; the kept scenarios are the ones a reviewer would probe first.
- [The rewrite is large for one helper's context] → Tasks go one merged capability at a time, and each reads only its source specs and the skill that owns it.
- [A branch in flight carries deltas against a capability this change removes] → The next `/save` on that branch stops on the missing base requirement. Its owner rewrites the delta against the merged capability. `openspec list` showed no active changes when this was planned.

<!-- end design.md -->
<!-- file tasks.md utf8 3551 -->
# Tasks

Each rewrite task follows the bar in design.md: one promise per requirement in one or two sentences, at most two scenarios, no script, file, or step names unless the name is the promise. Read only the source specs and the skill or wiki page that owns the topic. Remove the source folders the task merges.

## 1. The spec bar (payload rule and meta config)

- [x] 1.1 Add the spec bar to `.agents/rules/openspec.md`: a short paragraph on what a spec holds (what a person or installed repo sees, what must never happen, what an update delivers) and what it leaves to the skill; one or two scenarios per requirement
- [x] 1.2 Add a one-sentence `specs:` rule to `openspec/config.yaml` that points at `.claude/rules/openspec.md`, with no `: ` inside the plain scalar, and run `node scripts/check-openspec-config.mjs`

## 2. Merged capabilities (openspec/specs)

- [x] 2.1 `openspec-workflow` from `openspec-cli-workflow` and `change-branch-association`, plus a requirement stating the spec bar
- [x] 2.2 `change-loop` from `request-routing`, `work-verbs`, and `code-first-planning`
- [x] 2.3 `asking-the-user` from `explore-clarification`, `structured-asks`, and `reader-level`
- [x] 2.4 `apply` from `apply-plan-handoff` and `apply-completion-handoff`
- [x] 2.5 `delivery-gate` from `delivery-gate`, `ship-full-cycle`, `checkpoint-helpers`, and `preview-discovery`
- [x] 2.6 `memory` from `memory-store`, `memory-recall`, and `memory-capture`
- [x] 2.7 `wong-sync` from `wong-sync`, `wong-sync-adapt`, and `wong-sync-after-picture`
- [x] 2.8 `install-onboarding` from `install-onboarding` and `server-setup`
- [x] 2.9 `cloudflare-provisioning` from `cloudflare-provisioning`, `cloudflare-access-guide`, and `cf-secret-parity`
- [x] 2.10 `knowledge-center` from `agent-knowledge-center`, `wiki-root`, `people-wiki`, and `simplified-technical-english`
- [x] 2.11 `payload-layout` from `payload-single-source`, `agent-config-layout`, and `path-scoped-rules`
- [x] 2.12 `dependencies` from `dependency-currency` and `toolchain-dependencies`
- [x] 2.13 `ci-tests` from `ci-tests` and `downstream-contract`

## 3. Kept capabilities, thinned (openspec/specs)

- [x] 3.1 `stack-pack` and `app-scaffold`
- [x] 3.2 `ux-wireframes` and `staging-walkthrough`
- [x] 3.3 `secrets-convention`, `mini-apps`, and `browser-logins`
- [x] 3.4 `payload-checks`, `context-economy`, and `open-source-release`
- [x] 3.5 `repository-improvement` and `paseo-routines`

## 4. Retired names (script data)

- [x] 4.1 In `scripts/retired-names.json`, repoint `allow` paths and replacement texts that name a moved or merged spec, and drop an `allow` path whose spec no longer mentions the name
- [x] 4.2 Add entries for the distinctive retired capability names listed in design.md, each with its new capability as the replacement, and fix any live file the check then flags

## 5. Release and checks

- [x] 5.1 Confirm the totals: 26 capabilities (25 plus `multi-part-workspaces` from main), under 28,000 words, no requirement with more than two scenarios; record the counts in the Decision log
- [x] 5.2 `VERSION` 25.15.0 → 25.16.0 and a `CHANGELOG.md` entry, with an **Updating** note: `/wong-sync` brings the rule; nothing to do by hand, and your own specs are not rewritten
- [x] 5.3 Run `openspec validate --specs --strict --no-interactive`, `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `node scripts/measure-context.mjs --check`
- [x] 5.4 CI passes on the pushed branch, through `/save`

<!-- end tasks.md -->
<!-- file .openspec.yaml utf8 57 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27
skip_specs: true

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 39422 fence=~~~ -->
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
<title>Review · 2026-09-27-thinner-specs</title>
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
<body data-change="2026-09-27-thinner-specs">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-thinner-specs</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The specs in <code>openspec/specs/</code> are meant to be the record of what WongStack promises. Today they come to about 84,000 words — nearly three times the 31,000 words of instructions they describe — because most of each spec retells <i>how</i> a skill works, step by step. That makes them slow to read and quick to go stale. Every time a skill changes, the spec has to be updated to match, or it quietly goes wrong.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Each spec keeps only its promises.</b> A rule stays when a person or an installed repo relies on it: what they see, what must never happen, and what an update delivers. The steps, script names, file names, and exact wording go, because the skills already hold them. Each rule keeps one or two examples, not five.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">a rule today</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">─────────────────────────────</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">promise          ── keeps</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">which script     ── cut</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">which file       ── cut</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">exact wording    ── cut</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">5 examples       ── 1 or 2</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Overlapping specs merge.</b> Specs that cover one topic from several sides become one spec. For example, the three about updates become one, and so do the three about memory. That takes 48 files down to about 25.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">before (48)              after (~25)</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">───────────              ───────────</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">wong-sync           ┐</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">wong-sync-adapt     ├──▶ wong-sync</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">wong-sync-after-    │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">  picture           ┘</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">memory-store        ┐</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">memory-recall       ├──▶ memory</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">memory-capture      ┘</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">… and the rest</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The specs stay short.</b> Planning gets a standing rule: a new or changed spec states the promise and leaves the steps to the skill. This also holds in every repo that installs WongStack, so their specs stay short too.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>What you'll notice:</b> the spec files get shorter and there are fewer of them. <code>/verify</code> checks a preview against these examples, so it has fewer to walk. Nothing else about how WongStack works changes.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> dropping <code>openspec/specs/</code>, changing what any skill does, and rewriting archived changes. The archive keeps the old wording as the record.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked which way to take the spec files → chose keep them, but thinner (memory #233, confirmed in the 2026-09-27 queue, memory #292).</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked what a spec should keep after the cut → chose promises only: each rule a person or another repo relies on, with one or two examples, and none of the how.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether overlapping specs should merge into fewer files → chose merge overlaps.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether future changes should follow the same bar → chose yes, add the rule.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the change rewrites <code>openspec/specs/</code> directly with <code>skip_specs: true</code>, not through delta specs, because OpenSpec 1.13.2 can't drop a scenario inside a MODIFIED block (memory #232). Each of 330 requirements would need a REMOVED plus an ADDED under a new name, which would bury the change. The archive keeps the old wording.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a promise stays in its spec even when a skill also states it, because the spec is the record of what shipped and the skill is how it runs.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the spec bar lives in <code>.agents/rules/openspec.md</code>, which ships and loads whenever someone edits <code>openspec/</code>, and <code>openspec/config.yaml</code> gets a one-line pointer, because the config does not ship to installed repos and the rule should hold there too.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: no script counts scenarios or words, because the bar is a judgment about promise versus how, and a count check would push authors to cram examples together rather than cut the how. The totals are checked once, in the tasks.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the merge map in the design lands on 25 capabilities, the low end of the &quot;about 25–30&quot; given in explore, because <code>downstream-contract</code> is about tests and fits <code>ci-tests</code>, and the other small specs each hold one topic with no overlap. The builder may split a merged spec back out if it reads as two topics.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: distinctive retired capability names go into <code>scripts/retired-names.json</code>, and names that are also test files or ordinary words stay out, because the check would otherwise flag files that use those names legitimately.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: where a spec disagrees with its skill, the rewritten spec follows the skill, because this change thins the record and changes no behavior.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a minor release, 25.14.0, because the rule file that ships to installed repos gains a new planning rule.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the rewrite meets the bar as built — 25 capabilities, 25,487 words, 265 requirements, 344 scenarios, and no requirement with more than two scenarios — so no merged spec was split back out.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the planning-config check requirement moves from <code>ux-wireframes</code> to <code>payload-checks</code>, because it guards the payload rather than the review page.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Saved at CI gate task 5.4. <code>main</code> had shipped 25.14.0 (<code>79ac32f</code>, plain words for everyone) and 25.15.0 (<code>bd555b6</code>, multi-part workspaces). Merged it in: main's new <code>reader-level</code> and <code>structured-asks</code> wording (no technical level; plain words for all, detail when asked, kept as a preference on the person page) is folded into <code>asking-the-user</code>, and both source folders stay deleted. <code>multi-part-workspaces</code> already meets the bar and stays as is, so there are 26 capabilities, 26,276 words, and no requirement with more than two scenarios. This change becomes 25.16.0. Strict spec validation (26), the config, retired-names, payload-link, and context checks pass after the merge.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distilled facts before the archive: no repeatable fact. The spec bar already lives in <code>.agents/rules/openspec.md</code>; the open threads (the plan-link follow-up, the queue) stay in memory.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archived by <code>/ship</code> and saved as one checkpoint on <code>explore/thinner-specs</code>; no deltas to sync (<code>skip_specs</code>), so <code>openspec/specs/</code> already holds the result.</li>
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
