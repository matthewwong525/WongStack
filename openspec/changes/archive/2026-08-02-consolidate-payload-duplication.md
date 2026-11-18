<!-- openspec-archive v1 2026-08-02-consolidate-payload-duplication -->
<!-- file proposal.md utf8 8188 -->
**Status:** ready-to-ship
**Open questions:** none

## Why

The payload says the same things in many files, and each restatement is a place the next edit forgets. Three measured instances: `.claude/commands/opsx/*.md` (741 lines) duplicates `.claude/skills/openspec-*/SKILL.md` (745 lines) and has **already drifted into a live bug** — `/opsx:apply` tells the user to "suggest archive" where the skill invokes `/save`, and points at `/opsx:continue`, which does not exist; `/save` and `/ship` independently re-implement the same PR + CI-wait + auto-fix runbook; and the prose allowlist is stated 11 times across 7 files. The archived `widen-save-prose-fast-path` decision log records that its own five-site audit under-counted and missed a sixth site — the failure mode is proven, not hypothetical.

v8.4.0 (#43) added three more instances of the same pattern, so the cost is compounding: `/ship` grew a 140-line embedded runbook (breaking the payload's own `references/` convention), `/wong-sync` now stores every verdict in **two** files with a written rule that only half of one is authoritative, and the walkthrough's gate ladder is stated in seven places.

## What Changes

- **`.claude/commands/opsx/*.md` become one-line pointers** at the vendored `openspec-*` skills — the same "invoke the skill and follow it verbatim" pattern `/explore`, `/plan`, and `/apply` already use. Everything stays vendored in the repo; nothing becomes dependent on `openspec init` regenerating. Removes ~700 lines and makes the drift structurally impossible. **Fixes the live `/opsx:apply` bug** as a side effect.
- **`/ship` Step 4.5 moves to `ship/references/walkthrough.md`**, matching `wong-sync`→`adapt.md`, `improve`→its playbooks, and `wong-cloudflare`→`failure-map.md`. `/ship` returns to ~90 lines and reads as the merge verb again. No behavior changes.
- **The `/save` + `/ship` git runbook is extracted once** to `.claude/skills/save/references/git-gate.md` — PR open/update, the change-mirror body template, `wait-for-checks.sh` result handling, and the capped auto-fix loop. Both skills read it. The one genuine fork (`UNKNOWN` → proceed in `/save`, stop in `/ship`) is documented as an exception in one place instead of re-derived in two.
- **`/wong-sync` verdicts consolidate into `.claude/wong-sync-verdicts.md`.** The `capabilities` ledger leaves `.claude/.wong-stack.json`, which goes back to recording install state (`version`, `commit`, `installedAt`, `updatedAt`, `upstream`, `components`). One store, one authority rule; the split-authority and lazy-migration paragraphs both retire. **BREAKING** for the manifest schema — handled by lazy migration, which the manifest already does.
- **One owner per doctrine sentence.** `wiki/development/the-change-loop.md` becomes canonical for the loop, the gate ladder, and the prose allowlist. `AGENTS.md` keeps a one-line rule plus a link; `/save` states the path test once (Step 1) and its Step 2 table and Hard-rules entries link rather than restate.
- **Two stale-doc fixes:** `wiki/development/adding-a-skill.md` cites the retired `document` skill twice with two dead links; and the `.claude`→`.agents` / `CLAUDE.md`→`AGENTS.md` symlink — which has already silently no-op'd one implementation — is recorded only in `notes/` and gets promoted to `wiki/development/`.

**Non-goals:** deleting the vendored OpenSpec layer (explicitly kept so nothing relies on `openspec init`), changing any user-visible skill behavior beyond fixing the `/opsx:apply` drift, touching `app/`, and the CI `paths-ignore` / double-CI-wait work (a separate change — this one is prose-only).

## Capabilities

### New Capabilities

- `payload-single-source`: every fact in the payload has exactly one owning file; other surfaces link to it rather than restating it. Covers the pointer form for command files that front a skill, the `references/` extraction threshold for long runbooks, shared runbooks between skills, and doctrine ownership.

### Modified Capabilities

- `delivery-gate`: its "CI is optional, not required" requirement currently *mandates* that doctrine text be repeated across `CLAUDE.md`, `README.md`, `the-change-loop.md`, and the `save`/`ship`/`wong-setup` skills, and that each restatement name the allowlist. Rewritten to require one canonical owner plus conforming links — as written today it forbids this change.
- `wong-sync-adapt`: the verdict record becomes the single store of verdicts; the manifest ledger is no longer part of the adapt step's output or its suppression rule.
- `wong-sync`: the manifest schema drops `capabilities`; lazy migration covers manifests that still carry it.
- `apply-completion-handoff`: the requirement binds **every surface that fronts apply**, including the vendored command file — the gap the current drift slipped through.

## Impact

- **Payload (a release):** `.claude/commands/opsx/{explore,propose,apply,sync,archive}.md`; `.claude/skills/ship/SKILL.md` + new `ship/references/walkthrough.md`; new `.claude/skills/save/references/git-gate.md` + edits to `save/SKILL.md` and `ship/SKILL.md`; `.claude/skills/wong-sync/SKILL.md` + `references/adapt.md`; `.claude/skills/wong-sync/references/payload-manifest.md` (the two new `references/` files enter the manifest).
- **Doctrine:** `AGENTS.md`, `wiki/development/the-change-loop.md`, `wiki/development/adding-a-skill.md`, new `wiki/development/repo-layout.md` (the symlink fact).
- **Release:** `VERSION` minor bump, newest-first `CHANGELOG.md` entry.
- **Depends on #43 being merged** — it edits `/ship` Step 4.5 and the `/wong-sync` verdict record, both of which arrive with it. Branch from `main` after the merge.
- **Net:** roughly −950 lines of payload prose, one live bug fixed, no behavior change otherwise. No `app/` code, no build, no runtime surface.

## Decision log

- **2026-08-02 (implementation)** — All 37 tasks landed; `VERSION` 8.4.0 → 8.5.0. Payload prose (`.agents/**.md`) went **4,262 → 3,628 lines, −634 net**, after adding the two new references (202 lines). Three things the plan didn't anticipate. **(1)** The `/opsx:apply` drift had a second head: `openspec-apply-change/SKILL.md` itself pointed at `openspec-continue-change`, a *skill* that doesn't exist either — retargeted to `/continue`, and the `apply-completion-handoff` delta grew a scenario requiring that a surface only name commands that exist. **(2)** Collapsing `/ship` Steps 3 and 4 into one shared-runbook pointer broke the numbering that Step 4.5's recovery text references ("re-run Step 4 then Step 4.5"), so both headings were kept, each pointing at its own section of `git-gate.md` (§ 1 and § 2). **(3)** `adapt.md`'s pipeline diagram already showed only two outputs as of #43, so task 4.6 was a verification with no edit. Two smaller catches: extracting Step 4.5 left `SKILL.md` sub-lettered `4.5a–4.5f` with only the verdict table remaining, renamed to `### Verdicts`; and lifting the allowlist into a `### The prose allowlist` subsection of `the-change-loop.md` orphaned the "Loop back any time" paragraph under it, moved back up under the steps. Verified by sweep: the allowlist prefixes now appear in exactly four places (owner, `/save`'s routing test, and two summarizing lines), and the PR-body template, the cap-of-3, the gate ladder and the loop diagram each appear exactly once.
- **2026-08-02** — Resolved design.md's open question (task 5.7): **`README.md`'s "The workflow" section stays as it is.** It doesn't restate the doctrine — it's a plain-language verb table for a reader who hasn't cloned yet, and its one mention of the fast path ("lands straight in the repo as a note with no branch or PR") is a summarizing line, which `payload-single-source` explicitly allows. Reducing it to a link would cost the only surface a prospective user reads and buy no drift protection. Also decided, not in the plan: the **loop diagram** was duplicated in four thin verb skills (`explore`, `plan`, `apply`, `continue`) in two slightly different forms — task 5.8's sweep caught it, and each is now a one-line loop plus a link to the owner, since a six-line diagram isn't a "summarizing line."

<!-- end proposal.md -->
<!-- file design.md utf8 13652 -->
## Context

The payload is prose, and prose has no compiler. The only thing keeping two statements of one rule in agreement is that someone remembers to edit both — and the repo has a written record of that failing: the archived `widen-save-prose-fast-path` decision log says its five-site audit under-counted and missed a sixth stale site, after `grep -r` silently declined to follow the `.claude`→`.agents` symlink.

Measured duplication as of v8.4.0:

| Duplicate | Size | Drifted? |
|---|---|---|
| `.claude/commands/opsx/*.md` vs `.claude/skills/openspec-*/SKILL.md` | 741 vs 745 ln | **yes — live bug** |
| `/save` + `/ship` git runbook | ~60 ln × 2 | subtly (cap-of-3 in 3 places) |
| Prose allowlist doctrine | 11 statements / 7 files | not yet |
| `/wong-sync` verdicts (JSON ledger + markdown record) | 2 stores | rule says only half is authoritative |

The `/opsx:apply` drift is the one already costing something. `.claude/commands/opsx/apply.md` ends its completion path with *"congratulate, suggest archive"* and its blocked path with *"suggest using `/opsx:continue`"* — a command that does not exist. The skill at `.claude/skills/openspec-apply-change/SKILL.md` says *"invoke the `save` skill immediately."* So the raw command silently skips the handoff `openspec/specs/apply-completion-handoff/spec.md` requires. Nobody wrote that divergence deliberately; one copy got the v6 edit and the other didn't.

The constraint that shapes everything here: **the vendored OpenSpec layer stays in the repo.** The user's call — no reliance on `openspec init` regenerating anything. Deleting the command files is off the table; the question is only what's *in* them.

## Goals / Non-Goals

**Goals:**
- One owning file per payload fact; every other surface links.
- Make the `/opsx:*` drift structurally impossible rather than re-synced by hand.
- Restore the `references/` extraction convention that `/ship` broke in v8.4.0.
- Collapse `/wong-sync`'s two verdict stores to one, retiring the split-authority rule.
- Leave a durable rule (`payload-single-source`) so the pattern doesn't regrow with the next feature.

**Non-Goals:**
- Deleting or regenerating the vendored OpenSpec layer.
- Any user-visible behavior change except fixing `/opsx:apply`.
- The CI `paths-ignore` fix and the `/save`→`/ship` double-CI-wait — real, separate, and behavioral; this change is prose-only so it can ride the branch-and-PR gate on its own merits.
- Touching `app/`, `scripts/`, or `openspec/changes/archive/`.

## Decisions

### 1. Command files become pointers, not deletions

Each `.claude/commands/opsx/<verb>.md` keeps its frontmatter (`name`, `description`, `category`, `tags` — that's what renders in the command list) and replaces its body with one line:

```markdown
---
name: "OPSX: Apply"
description: Implement tasks from an OpenSpec change (Experimental)
category: Workflow
tags: [workflow, artifacts, experimental]
---

Invoke the `openspec-apply-change` skill (via the Skill tool) and follow it verbatim — that skill owns this command's behavior.
```

**Why this and not the reverse** (skills pointing at commands): skills are what the WongStack verbs already invoke — `/plan`→`openspec-propose`, `/apply`→`openspec-apply-change`. Making the skill canonical means the two entry points converge on the file that was already load-bearing, and the pattern matches what `explore/SKILL.md` does today, so there's nothing new to learn.

**Why not a symlink:** `.claude/skills/*/SKILL.md` symlinks already exist in this repo and are exactly what made `grep -r` under-count during `widen-save-prose-fast-path`. A one-line pointer is greppable, readable in a diff, and survives being copied by a tool that doesn't preserve links.

**Alternative considered — keep both and add a CI check that diffs them.** Rejected: it institutionalizes the duplication and adds a gate to a repo that deliberately has almost none. Removing the second copy is cheaper than policing it.

`explore` and `archive` are the two whose bodies genuinely differ (the command lacks the skill's 103 lines of entry-point examples; the skill lacks the command's 47 lines of output templates). Both extra sections are *keepable content* — they fold into the surviving skill file before the command body is replaced, so nothing written is thrown away.

### 2. `/ship` Step 4.5 → `ship/references/walkthrough.md`

The threshold the payload already applies elsewhere: a runbook that a skill *delegates to* rather than *is* goes in `references/`. `wong-sync/SKILL.md` keeps three sentences on the adapt step and hands the pipeline to `adapt.md`; `/ship` should keep the preflight call, the verdict table, and the merge consequences, and hand 4.5a–4.5f to the reference.

**What stays in SKILL.md** — the parts a reader of *the merge verb* needs: the `preflight` invocation, `RESULT: NONE` → silence, the five-verdict table, "never merge on UNKNOWN or TIMEOUT," and the three walkthrough Hard rules. **What moves** — scouting scenarios, writing journeys, the `run` call, grading against the `THEN`, failure recovery, evidence and cleanup.

The reference enters the payload manifest, which already covers `.claude/skills/<name>/` including `references/` — so no manifest category is new, only the file list in the doc.

### 3. One shared git-gate runbook

`.claude/skills/save/references/git-gate.md` holds what both skills do identically: `gh pr view` → open/update, the change-mirror PR body template, the `wait-for-checks.sh 20` call and its SUCCESS/NONE/UNKNOWN/TIMEOUT/FAILURE handling, and the read-fix-repush loop capped at 3.

**It lives under `save/`, not a new top-level shared directory.** `/save` is where the PR body originates and where `wait-for-checks.sh` and `preview-url.sh` already live — the payload manifest copies `.claude/skills/save/` whole, so a repo that has `/save` gets the runbook automatically, and `/ship` referencing across skill directories is already how it calls `save/scripts/wait-for-checks.sh` today.

**The one fork is documented in the runbook, not in the callers.** `UNKNOWN` means *proceed and report* in `/save` (it's a checkpoint; the branch isn't going anywhere) and *stop, do not merge* in `/ship` (unverified is not absent). One table with a per-caller column beats two prose restatements that can drift apart — and today `/ship`'s cap-of-3 is described three times because Step 4.5 shares Step 4's budget.

**Risk acknowledged:** this makes `/ship` depend on a file under `save/`. That's already true (`wait-for-checks.sh`), and the manifest ships the skills together, so there is no install shape where one arrives without the other.

### 4. Verdicts live in the markdown record; the manifest records install state

`.claude/wong-sync-verdicts.md` becomes the single store. `.claude/.wong-stack.json` drops `capabilities` and goes back to `version`, `commit`, `installedAt`, `updatedAt`, `upstream`, `components`.

**Why the markdown wins over the JSON:** it is the surface the user *acts on* — ticking a checkbox is the documented way to overrule a verdict — and it is committed, diffable, and reviewed in the PR like everything else. The JSON's only remaining unique contribution is `asOfCommit` on a `declined` entry, which the markdown can carry in the line itself (`` `capability-id` — reason _(declined against `a1b2c3d`)_ ``).

**What this retires:** v8.4.0 had to add a paragraph to `SKILL.md` *and* a section to `adapt.md` explaining that *"the ledger stores your decisions, plus a snapshot — only the first half is authoritative."* A rule that has to explain which half of a store counts is a rule about having two stores. Both paragraphs go, along with the lazy-migration note for the pre-split `declined`/`not-applicable` ambiguity — which the markdown record's per-line reason makes legible instead of guessable.

**Alternative considered — keep the JSON as the store and make the markdown a generated view.** Rejected: the markdown is *input* (ticked boxes), not just output, so a one-way generated view would need a read-back path anyway — which is precisely the two-store coupling being removed.

**Migration:** read `capabilities` from an existing manifest on the first run after upgrade, fold each entry into the verdict record, then write the manifest without the key. The manifest is already lazily migrated (`Requirement: Manifest schema, lazily migrated`), so this is the established path, not a new mechanism. An old manifest that still has `capabilities` after migration is harmless — nothing reads it.

### 5. Doctrine ownership: `the-change-loop.md` is canonical

Three sentences currently live in many places: the loop diagram, "CI is the gate when present, else PR review" (now with the walkthrough rung), and the prose allowlist.

| Fact | Owner | Everyone else |
|---|---|---|
| The loop + the gate ladder | `wiki/development/the-change-loop.md` | link |
| The prose allowlist (why + scope) | `wiki/development/the-change-loop.md` | link |
| The allowlist as an **operational test** | `save/SKILL.md` Step 1 | link |

The split on the allowlist is deliberate. `/save` genuinely needs the two path prefixes inline — an agent mid-runbook shouldn't have to open a wiki page to route a save. What it does *not* need is to restate them three more times, in the Step 2 table, the Step 5 prose variant, and Hard rules. Those become links to Step 1. That also kills the tiebreaker sentence Step 2 currently needs — *"when they seem to disagree, the paths win"* — which exists only because the rule is written twice in one file.

`AGENTS.md` keeps a one-line rule per doctrine plus a link. It is the always-loaded file; it should orient, not duplicate.

**`delivery-gate` must be amended first.** Its current requirement says doctrine text *across* `CLAUDE.md`, `README.md`, `the-change-loop.md`, and the `save`/`ship`/`wong-setup` skills MUST state the allowlist and MUST NOT assert CI as the sole gate — i.e. as written, it mandates the restatement this change removes. The delta rewrites it to require **one canonical statement plus conforming links**, with the scenarios checking that no surface *contradicts* the owner rather than that every surface *repeats* it.

### 6. The two stale-doc fixes ride along

`wiki/development/adding-a-skill.md` cites the retired `document` skill twice as the worked example, with two dead links. Replace with `dream` (has no `references/`) and `improve` (has `references/`), which is what the step is actually illustrating.

The `.claude`→`.agents` and `CLAUDE.md`→`AGENTS.md` symlink fact is recorded in three notes and one archived decision log, and nowhere canonical — despite having already silently no-op'd an implementation. It goes to a new `wiki/development/repo-layout.md`: what the symlinks are, that the Edit tool refuses to write through them, and that `grep -r` does not follow them, so audits must target `.agents/`. Linked from `wiki/development/README.md` and from `adding-a-skill.md` step 1.

## Risks / Trade-offs

- **A pointer command loses standalone readability** → someone reading `.claude/commands/opsx/apply.md` no longer sees the runbook. Mitigated by the pointer naming the exact file, and by this being the established pattern (`explore/SKILL.md` is 20 lines for the same reason). The behavior was never in the command anyway once the skill diverged — it was a stale copy of it.
- **Folding `explore`/`archive`'s unique sections could drop content** → the two files are diffed section-by-section before either is touched, and the fold is its own task, done and verified before the body is replaced.
- **The manifest migration runs in target repos we can't see** → the change is additive-then-subtractive on a file `/wong-sync` solely owns, and the skill already lazily migrates. Worst case a repo carries a dead `capabilities` key, which nothing reads.
- **Doctrine links can rot** → fewer links than the restatements they replace, and `/dream`'s reality-check already repairs dead links and anchors as a standing job.
- **This is a large single change** (~950 lines across ~20 payload files) → it is prose-only with no runtime surface, the six pieces are independent, and `tasks.md` groups by surface so a partial `/apply` still leaves the repo coherent. Splitting it would mean amending `delivery-gate` in one change and acting on it in another, with the payload contradicting its own spec in between.

## Migration Plan

1. Merge #43 first. Branch from `main` after it lands — this edits `/ship` Step 4.5 and the `/wong-sync` verdict record, both of which arrive with it.
2. Amend the `delivery-gate` delta spec before editing doctrine prose, so the payload never contradicts its own spec mid-change.
3. Fold, then point: `explore`/`archive` unique content moves into the surviving skill files before any command body is replaced.
4. Extract before deleting: write `git-gate.md` and `walkthrough.md` in full, then thin the callers.
5. Release last: `VERSION` minor bump + newest-first `CHANGELOG.md` entry, per the repo rule that a payload edit is a release.

Rollback is `git revert` — no state, no schema in a database, no deployed artifact. A target repo mid-migration has a manifest with a redundant key and a verdict record that already carries everything.

## Open Questions

- Should `README.md`'s "The workflow" section also reduce to a link, or does the front door earn its own telling for a reader who hasn't cloned yet? Leaning **keep it** — different audience, and it's the only surface a prospective user reads. Confirm during implementation.

<!-- end design.md -->
<!-- file tasks.md utf8 6825 -->
> Branch from `main` **after #43 merges** — this edits `/ship` Step 4.5 and the `/wong-sync` verdict record, both of which arrive with it.
> Every edit target is under `.agents/` — `.claude` is a symlink to it, and the Edit tool will not write through the link (task 6.2 documents this).

## 1. The vendored OpenSpec layer

- [x] 1.1 Diff each `.agents/commands/opsx/<verb>.md` body against its `.agents/skills/openspec-<verb>/SKILL.md` counterpart and record, per pair, any content the command has that the skill lacks
- [x] 1.2 Fold `archive.md`'s "Output On Success (No Delta Specs)" block and any other command-only content from 1.1 into the surviving `openspec-archive-change/SKILL.md`
- [x] 1.3 Confirm `openspec-explore/SKILL.md` already carries everything `commands/opsx/explore.md` has (the command's `**Input**` list and change-name note), folding in anything it doesn't
- [x] 1.4 Replace each of the five `.agents/commands/opsx/*.md` bodies with the pointer form — frontmatter unchanged, one line invoking the named `openspec-*` skill and directing the agent to follow it verbatim
- [x] 1.5 Verify the `/opsx:apply` drift is gone: no surface says "suggest archive" on completion, and no surface references `/opsx:continue`
- [x] 1.6 Grep the payload for any remaining reference to an `/opsx:*` command that does not exist

## 2. The /ship walkthrough runbook

- [x] 2.1 Create `.agents/skills/ship/references/walkthrough.md` holding Step 4.5a–4.5f verbatim: scouting scenarios, writing journeys, the `run` call, grading against the `THEN`, failure recovery and reseeding, evidence and cleanup
- [x] 2.2 Reduce `ship/SKILL.md` Step 4.5 to the `preflight` invocation, the `RESULT: NONE` → silence rule, the five-verdict table, and a link to the reference
- [x] 2.3 Keep the three walkthrough entries in `ship/SKILL.md`'s Hard rules (opt-in-by-state, never merge on `UNKNOWN`/`TIMEOUT`, never install and never write inside the repo) and confirm they are not restated in the reference
- [x] 2.4 Verify `ship/SKILL.md` still answers what the walkthrough does, when it refuses, and what each verdict means without opening the reference

## 3. The shared git-gate runbook

- [x] 3.1 Create `.agents/skills/save/references/git-gate.md` holding the PR open/update sequence, the change-mirror PR body template, the `wait-for-checks.sh 20` call with its five result outcomes, and the capped read-fix-repush loop
- [x] 3.2 Record the `UNKNOWN` fork in that file as a per-caller table — `/save` proceeds and reports, `/ship` stops and does not merge — rather than as prose in either skill
- [x] 3.3 Replace `save/SKILL.md` Steps 5 (PR half) and 6 with the invocation plus a link, keeping `/save`-specific behavior: the preview-URL discovery, the staging-by-path rule, and the prose variant
- [x] 3.4 Replace `ship/SKILL.md` Steps 3 and 4 with the invocation plus a link, keeping `/ship`-specific behavior: the default-branch-CI preflight and the shared cap across Step 4 and Step 4.5
- [x] 3.5 Verify the cap of 3 is now stated once and that both skills' auto-fix behavior still reads correctly end to end

## 4. One verdict store in /wong-sync

- [x] 4.1 Update `.agents/skills/wong-sync/references/adapt.md`: the verdict record is the single store, `declined` entries carry the clone commit they were judged against, and suppression reads from the record
- [x] 4.2 Delete adapt.md's "The ledger" section and the lazy-migration paragraph for the pre-split `declined`/`not-applicable` ambiguity, replacing them with the record-based suppression rule
- [x] 4.3 Add the one-time migration to adapt.md: fold an existing manifest `capabilities` map into the record, honoring each `declined` as a user refusal, then write the manifest without the key
- [x] 4.4 Update `wong-sync/SKILL.md` Step 4's manifest JSON to install state only (`version`, `commit`, `installedAt`, `updatedAt`, `upstream`, `components`) and remove the split-authority paragraph
- [x] 4.5 Update `wong-sync/SKILL.md`'s frontmatter description, Step 3 summary, Step 5 report, and Hard rules for the single store
- [x] 4.6 Update adapt.md's ASCII pipeline diagram so the ledger is no longer an output (already correct as of #43 — verified, no edit needed)

## 5. Doctrine ownership

- [x] 5.1 Make `wiki/development/the-change-loop.md` the canonical statement of the loop, the gate ladder (CI → walkthrough when adopted → merge), and the prose allowlist with its rationale
- [x] 5.2 Reduce `AGENTS.md`'s "Prose goes straight to `main`" and "Routing is by path prefix" rules to one summarizing line each plus a link to the owner
- [x] 5.3 Reduce `AGENTS.md`'s "CI is the gate when present" rule — including the walkthrough paragraph #43 added — to one line plus a link
- [x] 5.4 In `save/SKILL.md`, keep the allowlist stated inline once in Step 1 and replace the Step 2 table's restatement, the Step 5 prose-variant restatement, and the Hard-rules restatement with links to Step 1
- [x] 5.5 Delete the Step 2 tiebreaker sentence ("when they seem to disagree, the paths win") — it exists only because the rule was written twice in one file
- [x] 5.6 Point `dream/SKILL.md` and `notes/README.md` at the owner instead of restating the carve-out
- [x] 5.7 Decide the open question on `README.md`'s "The workflow" section (design.md leans keep — different audience) and record the decision in the proposal's Decision log
- [x] 5.8 Re-grep for `notes/**`, `CI is the gate`, and the loop diagram across the payload and confirm each surviving hit is either the owner or a link

## 6. Stale docs

- [x] 6.1 Fix `wiki/development/adding-a-skill.md`: replace the two retired-`document`-skill citations and their dead links with `dream` (no `references/`) and `improve` (has `references/`)
- [x] 6.2 Add `wiki/development/repo-layout.md` — the `.claude`→`.agents` and `CLAUDE.md`→`AGENTS.md` symlinks, that the Edit tool will not write through them, and that `grep -r` does not follow them so audits must target `.agents/`
- [x] 6.3 Link the new page from `wiki/development/README.md`'s Processes list and from `adding-a-skill.md` step 1

## 7. Manifest and release

- [x] 7.1 Add `ship/references/walkthrough.md` and `save/references/git-gate.md` to the payload manifest's description of those skills' contents
- [x] 7.2 Note in the payload manifest that `.claude/commands/opsx/` stays vendored in this repo and is not regenerated
- [x] 7.3 Bump `VERSION` (minor — payload restructure, no behavior change beyond the `/opsx:apply` fix)
- [x] 7.4 Add a newest-first `CHANGELOG.md` entry covering the pointer form, the two extracted runbooks, the single verdict store with its migration, and doctrine ownership
- [x] 7.5 Final pass: confirm no payload file states a rule another file owns, and that every link added in this change resolves

<!-- end tasks.md -->
<!-- file specs/apply-completion-handoff/spec.md utf8 1785 -->
## MODIFIED Requirements

### Requirement: Completed apply automatically checkpoints

When `/apply` completes every task in the selected change, it SHALL invoke the existing `/save` skill before reporting the workflow complete. The handoff SHALL delegate all sync, git, PR, preview, and CI behavior to `/save` rather than duplicating that behavior inside `/apply`.

This SHALL hold for **every payload surface that fronts the apply step**, including `.claude/skills/apply/SKILL.md`, `.claude/skills/openspec-apply-change/SKILL.md`, and `.claude/commands/opsx/apply.md`. No surface SHALL describe a completion path that ends in anything other than this handoff — in particular, none SHALL direct the user to archive instead. Surfaces SHALL satisfy this by pointing at the one that owns the behavior rather than by each restating it, per the `payload-single-source` capability.

#### Scenario: Final pending task completes

- **WHEN** `/apply` marks the final pending task complete
- **THEN** it invokes `/save` for the completed change
- **AND** it reports completion using the checkpoint result from `/save`

#### Scenario: Apply begins with all tasks already complete

- **WHEN** `/apply` selects a change whose task list is already complete
- **THEN** it invokes `/save` so any completed but uncheckpointed work receives the normal durable handoff

#### Scenario: The raw command is used instead of the verb

- **WHEN** a user runs `/opsx:apply` and its tasks all complete
- **THEN** the completion hands off to `/save` exactly as `/apply` does
- **AND** no surface suggests archiving as the completion step

#### Scenario: A surface references a command that does not exist

- **WHEN** a payload surface directs the user to a command
- **THEN** that command exists in the payload

<!-- end specs/apply-completion-handoff/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 2801 -->
## MODIFIED Requirements

### Requirement: CI is optional, not required

The WongStack doctrine SHALL treat GitHub Actions (and CI generally) as an optional accelerator that is honored when present and never required. The system's durable pillars SHALL be described as: pull requests, version control, OpenSpec, and everything-lives-in-the-repo.

This doctrine SHALL have **one owning file** — `wiki/development/the-change-loop.md` — which states the gate ladder (CI when present → the staging walkthrough when adopted → merge, a skipped rung never being a failure), the scope of the direct-to-default-branch carve-out, and the prose allowlist (`notes/**` + `wiki/**`) with its rationale. Other payload surfaces SHALL link to that owner rather than restate it, per the `payload-single-source` capability.

Two bounded exceptions, each because the reader must act without leaving the page:

- `AGENTS.md`/`CLAUDE.md` MAY carry one summarizing line per doctrine, naming and linking the owner.
- `.claude/skills/save/SKILL.md` SHALL state the allowlist's two path prefixes inline **once**, as the operational routing test the skill performs. Its other sections SHALL link to that single statement rather than repeat it.

No payload surface SHALL assert CI as the sole or required gate, state the carve-out as `notes/*.md` alone, or say that wiki edits require a pull request. Where a surface links to the owner instead of restating it, that link SHALL satisfy this requirement.

#### Scenario: Payload prose describes CI as optional

- **WHEN** a reader reviews the delivery doctrine in `CLAUDE.md`, `README.md`, or the `save`/`ship` skills
- **THEN** the text states CI is honored when present but not required, and names PR review as the gate when CI is absent
- **AND** no remaining sentence asserts "CI is the only gate" or "GitHub Actions is the build gate"

#### Scenario: The carve-out has one owner

- **WHEN** a reader reviews `CLAUDE.md`, `notes/README.md`, and the `save` and `dream` skills
- **THEN** each either links to `wiki/development/the-change-loop.md` or carries one summarizing line naming it
- **AND** no surface other than `save/SKILL.md`'s single operational statement reproduces the allowlist's scope, exceptions, or rationale

#### Scenario: The save skill can route without leaving its runbook

- **WHEN** `/save` reaches the point of deciding a save's route
- **THEN** the two path prefixes are stated inline at that point
- **AND** the skill's later sections link back to that statement rather than restating the prefixes

#### Scenario: A surface contradicts the owner

- **WHEN** any payload surface states the gate or the carve-out in terms the owning file does not
- **THEN** that is a defect, resolved by correcting the surface to a link or to the owner's terms

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/payload-single-source/spec.md utf8 5488 -->
## ADDED Requirements

### Requirement: Every payload fact has exactly one owning file

Each fact in the payload — a rule, a runbook, a doctrine sentence, a template — SHALL have exactly one file that states it. Every other surface that needs the reader to know it SHALL link to the owner rather than restate it. A second statement of a fact is a defect regardless of whether the two currently agree, because prose has no mechanism that keeps them agreeing.

An owner MAY be quoted in a single short summarizing line (one sentence, naming the owner and linking to it) where a reader would otherwise have to leave the page to act. It SHALL NOT be reproduced in full, and the summary SHALL NOT introduce any qualification, exception, or scope the owner does not state.

#### Scenario: A rule is needed on a second surface

- **WHEN** a payload file needs the reader to know a rule another file owns
- **THEN** it links to the owning file
- **AND** it does not restate the rule's scope, exceptions, or rationale

#### Scenario: Two files state the same rule

- **WHEN** a review finds the same rule written in two payload files
- **THEN** that is a defect to resolve by choosing an owner and replacing the other with a link, whether or not the two statements currently agree

### Requirement: A command that fronts a skill is a pointer to it

Where the payload ships both a command file and a skill that perform the same operation, the **skill** SHALL own the behavior and the command file SHALL contain only its frontmatter plus a single line invoking that skill and directing the agent to follow it verbatim. The command file SHALL NOT contain a second copy of the runbook.

This applies to `.claude/commands/opsx/*.md`, each of which fronts the correspondingly named `.claude/skills/openspec-*` skill. Both remain vendored in the repository; nothing SHALL depend on `openspec init` regenerating either.

#### Scenario: A user invokes the raw command

- **WHEN** a user runs `/opsx:apply`
- **THEN** the command invokes the `openspec-apply-change` skill and follows it
- **AND** the resulting behavior is identical to the skill being invoked directly, including the completion handoff to `/save`

#### Scenario: The skill's runbook changes

- **WHEN** an `openspec-*` skill's runbook is edited
- **THEN** no corresponding edit to the command file is required for the two entry points to stay in agreement

#### Scenario: The vendored layer is not regenerated

- **WHEN** the repository is used without running `openspec init`
- **THEN** both the command files and the `openspec-*` skills are present and functional from the repository itself

### Requirement: A skill delegates its long runbooks to references

A `SKILL.md` SHALL state what the skill is, its boundaries, its decision points, and its consequences. A procedure long enough that it displaces those — as a guide, a stage exceeding roughly forty lines — SHALL live in `references/<name>.md` inside the skill directory, with `SKILL.md` retaining the invocation, the verdict or outcome table, and the hard rules.

Any `references/` file added this way SHALL be listed in the payload manifest's description of the skill's contents.

#### Scenario: A skill grows a long staged procedure

- **WHEN** a skill gains a multi-stage runbook whose detail exceeds what a reader of the skill's purpose needs
- **THEN** the runbook moves to `references/` and `SKILL.md` keeps the invocation, the outcomes, and the rules

#### Scenario: Reading the skill still answers what it does

- **WHEN** a reader opens a `SKILL.md` whose runbook lives in `references/`
- **THEN** they can determine what the skill does, when it refuses, and what each outcome means without opening the reference

### Requirement: A runbook two skills perform identically is written once

Where two skills perform the same operation, that operation SHALL be written once in a `references/` file and read by both. Where their behavior genuinely diverges, the divergence SHALL be recorded in that one file as a per-caller exception, and SHALL NOT be expressed by giving each caller its own copy of the runbook.

#### Scenario: Two skills share a git operation

- **WHEN** `/save` and `/ship` both open or update a pull request, wait on checks, and auto-fix failures
- **THEN** that runbook is stated once and both skills reference it

#### Scenario: The shared runbook has a per-caller difference

- **WHEN** an unverifiable check result means proceed for one caller and stop for the other
- **THEN** the shared runbook states both outcomes against their callers
- **AND** neither skill restates the surrounding procedure to accommodate its own case

### Requirement: A generated fact has exactly one store

Where the payload's tooling generates a record, that record SHALL live in exactly one file. Tooling SHALL NOT maintain the same generated fact in two stores with a rule describing which store is authoritative — the presence of such a rule is itself the defect.

Where a generated record is also an input the user edits, the file the user edits SHALL be the store.

#### Scenario: Verdicts are recorded

- **WHEN** `/wong-sync` records a verdict for a capability
- **THEN** it writes it to `.claude/wong-sync-verdicts.md` and to no other file

#### Scenario: A store is both output and input

- **WHEN** a generated record carries user edits that the tooling reads back
- **THEN** that record is the single store, rather than a view of one held elsewhere

<!-- end specs/payload-single-source/spec.md -->
<!-- file specs/wong-sync-adapt/spec.md utf8 7946 -->
## MODIFIED Requirements

### Requirement: Every verdict lands in a durable, reviewable record

Every run of the analysis SHALL write `.claude/wong-sync-verdicts.md` in the target repo, containing **every** mapped capability — not only those verdicted `adopt` — each with its id, its verdict, and its one-line reason, grouped by verdict, together with anything re-raised or retired. It SHALL be written even when no capability is `adopt`, and it SHALL be a committed file rather than an ignored one, so it travels between clones and appears in the pull request diff.

This file SHALL be the **single store** of verdicts. No verdict, reason, or judgment commit SHALL be recorded anywhere else, including `.claude/.wong-stack.json`.

A `declined` entry SHALL additionally carry the clone commit it was judged against, written on its own line, so a later run can tell whether the upstream expression has changed since the refusal.

The file SHALL carry a generated-file header stating that it is rewritten on every `/wong-sync` run and that ticked checkboxes are read before it is regenerated.

The chat report SHALL become a summary that points at this file, and SHALL NOT be the only place any verdict appears.

#### Scenario: A run with nothing to adopt still produces a record

- **WHEN** every capability is `present`, `divergent`, or `not-applicable`
- **THEN** `.claude/wong-sync-verdicts.md` is written with all of them and the report points at it

#### Scenario: Non-adopt verdicts are not chat-only

- **WHEN** a capability is verdicted `divergent`, `not-applicable`, or `declined`
- **THEN** it appears in `.claude/wong-sync-verdicts.md` with its reason, not merely in the run's chat output

#### Scenario: The record is regenerated, not appended

- **WHEN** a second run produces different verdicts
- **THEN** the file reflects the current run's verdicts rather than accumulating past ones

#### Scenario: Verdicts appear in one place only

- **WHEN** a run completes and the manifest is rewritten
- **THEN** `.claude/.wong-stack.json` contains no verdict, reason, or judgment commit
- **AND** `.claude/wong-sync-verdicts.md` is the only file a reader must open to see what was decided and why

#### Scenario: A decline records what it was judged against

- **WHEN** a capability is verdicted `declined`
- **THEN** its entry in the record carries the clone commit at which the refusal was made

### Requirement: The user can overrule any non-adopt verdict by ticking a box

In `.claude/wong-sync-verdicts.md`, every capability **not** verdicted `adopt` SHALL be written as an unticked Markdown checkbox line carrying its capability id. Ticking a box SHALL be the supported way to overrule the skill's verdict, and SHALL be the only edit to the file the skill honors.

Before regenerating the file, each run SHALL read the existing one and collect every ticked capability id. Each such capability SHALL be force-verdicted `adopt` for that run and written as a task in the change folder, regardless of what the analysis would otherwise have assigned. Where a ticked capability was previously `declined`, that prior refusal SHALL cease to suppress it — asking for the capability is how a previous refusal is reversed.

The regenerated file SHALL show each promoted capability under the adopted group, so a tick is visibly acted on rather than silently consumed. The run's report SHALL name every capability promoted this way.

#### Scenario: Ticking promotes a not-applicable capability

- **WHEN** the user ticks a `not-applicable` entry and runs `/wong-sync` again
- **THEN** that capability is verdicted `adopt` and gets a task in the change folder

#### Scenario: Ticking reverses a decline

- **WHEN** the user ticks a `declined` entry and runs `/wong-sync` again
- **THEN** the capability is verdicted `adopt`, its prior refusal no longer suppresses it, and the regenerated record shows it as adopted

#### Scenario: A tick is visibly acted on

- **WHEN** a ticked capability has been promoted
- **THEN** it appears under the adopted group in the regenerated file and is named in the report

#### Scenario: Untouched file changes nothing

- **WHEN** the user ticks nothing between runs
- **THEN** no capability is force-adopted and the analysis's own verdicts stand

### Requirement: Only a recorded decline suppresses re-evaluation

The prior run's verdicts SHALL be read from `.claude/wong-sync-verdicts.md` before the analysis assigns new ones. **Only `declined` SHALL suppress.** A capability recorded `declined` SHALL NOT be re-pitched unless its upstream expression changed since the commit recorded with that entry, in which case it SHALL be re-raised with what changed.

Every other verdict — `present`, `divergent`, `adopt`, `not-applicable` — SHALL be recomputed from scratch on each run; the previous record is a picture of the last run, not authority to skip re-evaluating. A `not-applicable` verdict in particular turns on the target's shape rather than upstream's, so a recorded upstream commit SHALL NOT prevent its re-evaluation.

An absent record means nothing has been judged yet and is not an error. A capability present in the previous record with no counterpart in the new map SHALL be reported as **retired**, not silently dropped.

Where a manifest written by an earlier version still carries a `capabilities` map, the first run after upgrade SHALL fold its entries into the record — honoring each `declined` as a user refusal, the conservative read — and SHALL then write the manifest without that key.

#### Scenario: Declines are not re-litigated

- **WHEN** the sync runs again and upstream has not changed a previously declined capability
- **THEN** that capability is not proposed again

#### Scenario: Upstream moved since the decline

- **WHEN** a declined capability's upstream expression changed after the commit recorded with its entry
- **THEN** it is re-raised, stating that it was declined earlier and what has changed since

#### Scenario: A divergent capability is recomputed

- **WHEN** the local mechanism that justified a `divergent` verdict has since been deleted
- **THEN** the next run recomputes the capability and verdicts it `adopt`, rather than honoring the stale `divergent`

#### Scenario: A not-applicable verdict follows the repo, not the clone

- **WHEN** a capability was `not-applicable` because the repo had no CI, and the repo has since added CI
- **THEN** the next run re-evaluates it and may verdict it `adopt`, even though the upstream expression is unchanged

#### Scenario: A repo upgrading from the manifest ledger

- **WHEN** the sync runs on a manifest that still carries a `capabilities` map
- **THEN** its entries are folded into `.claude/wong-sync-verdicts.md`, each `declined` honored as a user refusal
- **AND** the manifest is rewritten without the `capabilities` key

#### Scenario: No prior record

- **WHEN** the sync runs in a repo with no `.claude/wong-sync-verdicts.md` and no manifest ledger
- **THEN** it proceeds normally and writes the record for the first time

## REMOVED Requirements

### Requirement: The capability ledger makes the sync idempotent in judgment

**Reason**: The ledger was a second store of the same verdicts now held by `.claude/wong-sync-verdicts.md`, and keeping both forced a written rule that only part of the ledger was authoritative — a rule that exists only because there are two stores. Suppression and retirement detection move to the record, which is the file the user actually edits.

**Migration**: The first run after upgrade folds an existing manifest `capabilities` map into `.claude/wong-sync-verdicts.md`, honoring each `declined` as a user refusal, then rewrites the manifest without the key. No user action is required; a manifest that retains the key after migration is inert because nothing reads it. The replacement behavior is specified by "Only a recorded decline suppresses re-evaluation".

<!-- end specs/wong-sync-adapt/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 2215 -->
## MODIFIED Requirements

### Requirement: Manifest schema, lazily migrated

`.claude/.wong-stack.json` SHALL carry `version`, `commit`, `upstream { repo, fork, clone }`, and `components`. It SHALL record **install state only** — what is installed here, from where, and as of when. It SHALL NOT carry verdicts, reasons, or judgment commits; those live solely in `.claude/wong-sync-verdicts.md`, specified by the `wong-sync-adapt` capability.

`commit` SHALL record the clone HEAD the repo last synced against — it is not a diff base, since nothing diffs — and SHALL drive the changelog walk.

Old manifests remain valid: missing keys are filled in during the first sync and the manifest is rewritten last, reflecting what actually happened. A manifest carrying a `capabilities` map from an earlier version SHALL have it folded into the verdict record and then dropped, per the `wong-sync-adapt` capability. `upstream.fork` SHALL remain readable where an earlier version recorded one, and SHALL NOT be written.

#### Scenario: First sync on an older manifest

- **WHEN** the manifest predates the schema (no `commit`, no `upstream`)
- **THEN** the sync completes and writes `commit`, `upstream.repo`, and `upstream.clone`

#### Scenario: Seed manifest

- **WHEN** the manifest's `version` and `commit` are null because `wong-setup` just handed off
- **THEN** the sync proceeds by the general rule (every manifest file is absent, so every one is copied) and fills in the real `version` and `commit` last

#### Scenario: Manifest carrying a stale fork URL

- **WHEN** a manifest recorded `upstream.fork` under a previous version
- **THEN** the value is preserved as-is and never used or updated

#### Scenario: Manifest carrying a capability ledger

- **WHEN** the sync runs on a manifest that still carries a `capabilities` map
- **THEN** the rewritten manifest omits that key, and the entries survive in `.claude/wong-sync-verdicts.md`

#### Scenario: The manifest is read for install state

- **WHEN** a reader or a later run opens `.claude/.wong-stack.json`
- **THEN** it answers what is installed, from where, and as of when
- **AND** it answers nothing about what was judged, which the verdict record owns

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-02

~~~
<!-- end .openspec.yaml -->
