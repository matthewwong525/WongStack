<!-- openspec-archive v1 2026-08-09-wong-sync-self-update-and-run-plan -->
<!-- file proposal.md utf8 5695 -->
# /wong-sync updates itself first and plans its whole run

**Status:** ready-to-ship
**Open questions:** none

## Why

Two gaps remain after v9.10.0. **The skill never runs its own latest version:** `wong-sync` is an ordinary payload file, so an improvement to it lands during the run and takes effect only on the *next* one — every sync executes whatever version happened to be installed. **The run has no single reviewable document:** copied and directly-updated files exist only as working-tree edits plus chat output that scrolls away, and the OpenSpec change is written only when something is `adopt`, so a run that copied eleven files and adopted nothing leaves no plan to review at all.

## What Changes

- **Self-update first.** Immediately after Step 1 refreshes the clone, the run brings the `wong-sync` skill itself current — `SKILL.md` and `references/**` — then **re-reads the updated instructions and follows those for the rest of the run**. Mechanically this is the update-if-untouched rule shipped in v9.10.0, applied to one directory ahead of everything else.
  - At most once per run; the re-read instance is current, so the pass is naturally idempotent.
  - A locally edited `wong-sync` fails the blob proof and is **never** overwritten: the run says plainly it is continuing on the installed version, and Step 3 proposes the adaptation as usual.
  - The refreshed clone is kept — no second fetch — and the report names the self-update and its version span.
- **One OpenSpec plan per run, covering everything.** `openspec/changes/adopt-wongstack-<YYYY-MM-DD>/` is renamed **`sync-wongstack-<YYYY-MM-DD>/`** (the `-2`/`-3` collision rule is unchanged) because it is no longer adopt-only, and it is written on **every run that did or proposes anything**.
  - `proposal.md` enumerates the full changeset: the version span, every file copied, every file updated with its version span, the self-update when it happened, each proposed adoption and what it buys this repo, and a pointer to `.claude/wong-sync-verdicts.md` for everything considered and not adopted.
  - `tasks.md` keeps one task per `adopt`, preceded by a review task when file changes landed — so a no-adopt run is actionable rather than an empty folder.
  - A genuinely no-op run writes **no** folder, exactly as today. The verdict record is still written every run and remains the single store of verdicts.

**Non-goals:** no change to the verdict taxonomy or the adopt-by-default bias, no git in the target repo, no implementing of grafts, no widening of the payload manifest, and no change to the authorship-scoped never-overwrite guarantee — a file with local authorship stays untouchable, `wong-sync` itself included.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `wong-sync`: Step 2 gains a self-update pass that runs before the general file loop and re-reads the skill's own instructions mid-run; the report gains the self-update line.
- `wong-sync-adapt`: the run's change folder is renamed `sync-wongstack-<date>`, is written whenever the run did or proposes anything rather than only on `adopt`, and its proposal enumerates the entire changeset instead of adoptions alone.

## Impact

- `.agents/skills/wong-sync/SKILL.md` — Step 2 (self-update pass), Step 3 (folder contract), Step 5 (report), Hard rules. (`.claude/**` is a symlink to this path.)
- `.agents/skills/wong-sync/references/adapt.md` — the output contract: folder name, when it is written, what `proposal.md` enumerates, and the review task.
- `VERSION`, `CHANGELOG.md` — payload release (minor, from 9.10.0).
- Target repos: the next sync runs upstream's current logic rather than the installed copy, and every run that changes anything leaves one reviewable plan. Repos with a customized `wong-sync` are unaffected by the self-update and keep today's behavior exactly.

## Decision log

- **2026-08-09** — Planned and implemented in one session, on a fresh branch from `main` at v9.10.0 (the adapt-by-default release, PR #61). Both behaviors follow directly from that release: the blob-hash proof is what makes self-updating safe, so this change is mostly a question of *ordering* — run the proof on this skill's own directory before anything else, then re-read. Settled during design: "re-read" means re-run Step 0 (a newer version may consult a manifest key the old one never read) while keeping Step 1's clone (facts about the clone are version-independent, and re-fetching buys nothing); the once-per-run limit is a stated hard rule rather than an inference from the proof, so a version-skew bug can't spin. Ruled out: a sixth `adopt-unshaped`-style verdict was not needed here, and a separate `.claude/wong-sync-last-run.md` run report was rejected because it recreates the two-documents-to-reconcile problem the single-plan ask exists to solve. Landed edits are described in the run plan's proposal rather than written as tasks, because they are already in the working tree and uncommitted — review still precedes anything durable. Implementation found five payload sites naming `adopt-wongstack`; all updated except the deliberate "leave old folders alone" rule. Released as 9.11.0; `check-payload-links.mjs` green. 11/11 tasks complete.
- **2026-08-09** — Shipped. Delta specs were folded into `openspec/specs/wong-sync/` and `openspec/specs/wong-sync-adapt/` at the pre-ship `/save`, which also corrected a scenario stale since v9.10.0 (`wong-sync updates itself` still claimed the update went through the capability analysis). Change archived to `openspec/changes/archive/2026-08-09-wong-sync-self-update-and-run-plan/` and checkpointed for the squash-merge of PR #62.

<!-- end proposal.md -->
<!-- file design.md utf8 7975 -->
# Design — self-update first, and one plan per run

## Context

v9.10.0 gave the sync two things this change builds on: a **blob-hash proof** that a payload file carries no local authorship, and an **authorship-scoped** never-overwrite guarantee. With those in place, updating the `wong-sync` skill itself is mechanically identical to updating any other untouched payload file — the only open question is *when* in the run it happens.

Today it happens in the general Step 2 loop, which is too late to matter: the instructions for the run were read before Step 2 executed, so the improvement sits on disk unused until the next invocation. A repo that syncs monthly is always one release behind in *behavior* even when its files are current.

Separately, the run's output is split across surfaces with different durabilities. The change folder (written only on `adopt`) is reviewable and permanent; the copied/updated file list is chat output that scrolls away; the verdict record covers judgments but not file actions. There is no one document that answers "what did this run do to my repo."

## Goals / Non-Goals

**Goals:**

- A sync executes upstream's current logic, not the logic that happened to be installed — without a second invocation.
- Every run that changes anything leaves exactly one reviewable plan enumerating the whole changeset.
- Both hold without weakening the authorship guarantee: a customized `wong-sync` is never overwritten and never silently bypassed.

**Non-Goals:**

- No change to the verdict taxonomy, the adopt-by-default bias, or the verdict record's role as the single store of verdicts.
- No git in the target, no implementing of grafts, no manifest widening.
- No migration of existing `adopt-wongstack-*` folders in target repos.

## Decisions

### 1. The self-update is a labeled pass at the top of Step 2, not a new step

The mechanism is exactly update-if-untouched, so it belongs where that mechanism is defined rather than duplicated into a Step 1.5. Step 2 becomes: **self-update pass first, then the general file loop over the rest of the manifest.** Files under `.claude/skills/wong-sync/` are removed from the general loop's scope once the pass has handled them, so no file is considered twice.

Alternative considered: a separate step between clone refresh and copy. Rejected — it would restate the proof and the exclusions, and the two would drift.

### 2. Re-read means re-run Step 0, keep Step 1's clone

The honest reading of "follow the new instructions" is that the *instructions* are replaced, not the *environment*. So after the pass writes new files:

- **Re-read** `SKILL.md` and `references/**` from disk and discard the in-memory copy. Everything from here follows the new text, including any step this version doesn't have.
- **Re-run Step 0** against the new instructions. It is a manifest read — cheap — and the new version may read a key the old one never looked at. Carrying forward the old Step 0's variables would silently run the new logic on an incomplete reading.
- **Keep Step 1's refreshed clone**, `LATEST`, `WS_HEAD`, and the changelog list. Those are facts about the clone, established under either version's instructions, and re-fetching would cost a network round trip to learn nothing.

**Loop guard: the pass runs at most once per run**, stated as a hard rule rather than left to the proof. After the write the local files equal upstream's current blob, so a second pass would find nothing stale anyway — but a version-skew bug that made the proof disagree with itself must not be able to spin.

### 3. Version skew is reported, never hidden

When the pass fires, Steps 0–1 ran under the old version and everything after ran under the new one. The report says so explicitly — `self-updated 9.8.0 → 9.11.0; the rest of this run followed 9.11.0` — because a run that behaves like two versions is exactly the situation where a surprised reader needs to know which text to consult.

### 4. A customized wong-sync fails the proof loudly, not quietly

One edited byte and the pass cannot fire. The run then states plainly that it is continuing on the installed version and names it, and Step 3 proposes the adaptation through the ordinary adopt path. This is the same trade the whole skill makes — customization is safe, and the cost of safety is that the improvement arrives as a proposal instead of a write. Saying nothing would be the failure mode: the user would believe they were running current logic.

### 5. The change folder is renamed and written whenever the run did anything

`adopt-wongstack-<date>` → `sync-wongstack-<date>`. The old name described the folder's *only* trigger; the new one describes the run. The `-2`/`-3` same-day collision rule carries over unchanged.

**Written when:** the run copied a file, updated a file, self-updated, or has at least one `adopt`. **Not written when:** none of those happened — an empty change is noise, and the verdict record already says "current," which is the whole message.

**Existing `adopt-wongstack-*` folders are left alone.** They are historical changes, often already archived; a rename migration would rewrite shipped records to no benefit.

### 6. Landed edits go in the proposal; remaining work goes in the tasks

The copies and updates are already in the working tree when the plan is written, so they are not tasks — they are what the proposal *describes*. Tasks stay for work that remains: one per `adopt`, preceded by a single review task when any file changed, so a no-adopt run still hands the reader something to do (`review the N files this sync landed, then /save`).

This does put already-applied edits inside a forward-looking artifact. It is justified because the edits are **uncommitted**: review still precedes anything durable, and `/ship` then archives the folder as the record of that sync — which is exactly the repo's doctrine that the archived change is the record of what shipped.

Alternative considered: a separate non-OpenSpec run report (`.claude/wong-sync-last-run.md`). Rejected — it recreates the problem in file form, giving the user two documents to reconcile when the ask was for one reviewable plan.

## Risks / Trade-offs

- [Self-update executes newly fetched instructions in the same run, so a bad upstream release takes effect immediately rather than after a review] → The blast radius is bounded by everything else the skill already guarantees: no git in the target, read-only clone, proposes-never-implements, and authorship-scoped writes. Every file it touches is uncommitted and visible in the `/save` diff. A repo that wants the old behavior can pin by editing its copy, which defeats the proof by design.
- [A folder per run creates churn in repos that sync often] → Only runs that actually changed something write one, the same-day collision rule already exists, and `/ship` archives them. A no-op sync stays silent.
- [Re-running Step 0 mid-run could produce different values than the first pass] → That is the point, and it is reported: the manifest is re-read under the instructions that will actually use it.
- [The proposal describes edits the reader can also see in the diff] → Deliberate duplication; the diff shows *what* bytes changed, the proposal says *why* each file was in scope and what it buys the repo.

## Migration Plan

Prose-only payload edit; no data or schema migration, and no target-repo migration. A target picks this up on its next sync — through the ordinary adapt path if its `wong-sync` is customized, or as a direct update if it is untouched. The first run after adoption is the last one that will not have self-updated first. Release ritual: minor `VERSION` bump from 9.10.0, newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` must pass.

## Open Questions

None — the folder rename, the write-when rule, and the landed-edits-in-proposal placement are settled above and visible for review.

<!-- end design.md -->
<!-- file tasks.md utf8 2800 -->
## 1. Self-update pass — .agents/skills/wong-sync/SKILL.md

- [x] 1.1 Add the self-update pass at the top of Step 2, before the general file loop: apply update-if-untouched to `SKILL.md` + `references/**` of this skill's own directory, reusing the proof already defined there rather than restating it, and exclude those files from the general loop so nothing is considered twice.
- [x] 1.2 State the re-read semantics: re-read `SKILL.md` and `references/**` and discard the running instructions; re-run Step 0's manifest resolution against the new text; keep Step 1's refreshed clone, `LATEST`, `WS_HEAD`, and changelog list with no second fetch.
- [x] 1.3 State the guards: the pass runs at most once per run (hard rule, not left to the proof), and a `wong-sync` that fails the blob proof is never touched — the run says plainly it is continuing on the installed version, names it, and leaves the adaptation to Step 3's ordinary `adopt` path.
- [x] 1.4 Update the five-box pipeline diagram and the opener so Step 2 reads as self-update-then-copy/update, and note in the "no git" rule that reading clone history to prove a file unmodified is not a mutation.

## 2. One plan per run — SKILL.md Step 3/5 + references/adapt.md

- [x] 2.1 In `references/adapt.md`'s output contract, rename `adopt-wongstack-<YYYY-MM-DD>/` to `sync-wongstack-<YYYY-MM-DD>/` (keeping the `-2`/`-3` collision rule) and change the write trigger from "only when something is `adopt`" to "whenever the run copied, updated, self-updated, or has an `adopt`"; state that pre-existing `adopt-wongstack-*` folders are left alone.
- [x] 2.2 Specify `proposal.md`'s contents in `adapt.md`: version span, files copied, files updated with version spans, the self-update when it happened, each adoption and what it buys this repo, and the pointer to `.claude/wong-sync-verdicts.md` — with landed edits described as landed, not written as tasks.
- [x] 2.3 Specify `tasks.md` in `adapt.md`: one task per `adopt`, preceded by a single review task when any file change landed; keep the concreteness bar for adoption tasks; keep "no-op run writes no folder".
- [x] 2.4 Update the ASCII diagram in `adapt.md` and the Step 3 summary in `SKILL.md` to the new folder name and trigger, and reconcile every other mention of `adopt-wongstack` in the payload (grep `.agents/` and `AGENTS.md`, since `grep -r` does not follow the `.claude` symlinks).
- [x] 2.5 Add the self-update line to Step 5's report alongside Copied/Updated, including the version span and the statement that the rest of the run followed the newer instructions.

## 3. Release

- [x] 3.1 Add the newest-first `CHANGELOG.md` entry covering both behaviors and bump `VERSION` (minor, from 9.10.0).
- [x] 3.2 Run `node scripts/check-payload-links.mjs` and fix anything dead.

<!-- end tasks.md -->
<!-- file specs/wong-sync-adapt/spec.md utf8 3655 -->
# wong-sync-adapt — delta

## MODIFIED Requirements

### Requirement: The analysis proposes and never implements

The analysis SHALL write exactly two kinds of artifact and nothing else:

1. `.claude/wong-sync-verdicts.md` — the durable verdict record, specified below.
2. An OpenSpec change folder at `openspec/changes/sync-wongstack-<YYYY-MM-DD>/`, written whenever the run **did or proposes anything** — that is, when it copied a file, updated a file, self-updated, or verdicted at least one capability `adopt`.

The folder SHALL contain a proposal and a tasks list:

- **`proposal.md`** SHALL enumerate the run's entire changeset: the version span synced, every file copied, every file updated with its version span, the self-update when one occurred, each proposed adoption and what it buys this repo, and a pointer to `.claude/wong-sync-verdicts.md` for everything considered and not adopted. Copies and updates are already present in the working tree when the proposal is written, so they SHALL be described as landed rather than written as tasks.
- **`tasks.md`** SHALL carry one task per `adopt` capability, preceded by a single review task when any file change landed, so that a run with no `adopt` still yields an actionable change rather than an empty folder.

The folder SHALL NOT be written when the run copied nothing, updated nothing, did not self-update, and has no `adopt`. The graft is performed later through the normal loop (`/apply` → `/save` → `/ship`). Each adoption task SHALL name its capability id and describe the graft in this repo's terms — which file or convention it touches and what done looks like.

Change folders written under the earlier `adopt-wongstack-<YYYY-MM-DD>` name SHALL be left as they are; no rename or migration of existing folders is performed.

#### Scenario: Nothing else is touched

- **WHEN** a run completes
- **THEN** the only paths written are absent payload files, provably unmodified payload files brought current, `.claude/wong-sync-verdicts.md`, the change folder, and the manifest
- **AND** the user is directed to review the change folder and the verdict record

#### Scenario: A copy-only run still produces a plan

- **WHEN** a run copies or updates files but verdicts nothing `adopt`
- **THEN** the change folder is written, its proposal enumerates every file copied and updated, and its tasks carry the review task
- **AND** the run is reviewable from one document rather than from chat output

#### Scenario: Existing sync change is never overwritten

- **WHEN** a change folder for today's date already exists
- **THEN** a suffixed sibling (`-2`, `-3`) is created and the existing folder is left untouched

#### Scenario: Tasks are concrete

- **WHEN** a task is written for an `adopt` capability
- **THEN** it names the capability id and states what changes in this repo, not merely the upstream feature's name

#### Scenario: A no-op run writes no folder

- **WHEN** a run copies nothing, updates nothing, does not self-update, and verdicts nothing `adopt`
- **THEN** no change folder is created
- **AND** `.claude/wong-sync-verdicts.md` is still written, and the report says the repo is current and points at it

#### Scenario: Prior adopt-named folders are left alone

- **WHEN** the target contains folders named `adopt-wongstack-<date>` from earlier versions
- **THEN** they are neither renamed nor rewritten, and new runs use the `sync-wongstack-<date>` name

#### Scenario: Target without OpenSpec

- **WHEN** the target has no `openspec/changes/` directory
- **THEN** the verdict record is still written and the report explains that the change could not be written

<!-- end specs/wong-sync-adapt/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 8463 -->
# wong-sync — delta

## ADDED Requirements

### Requirement: The skill updates itself before the run proceeds

Immediately after the clone is refreshed, and before any other payload file is considered, `/wong-sync` SHALL apply the update-if-untouched rule to its own skill directory — `SKILL.md` and `references/**` under the local `wong-sync` skill path. When those files are provably unmodified and stale, the skill SHALL bring them current and then **follow the updated instructions for the remainder of the run**:

- It SHALL re-read `SKILL.md` and `references/**` from disk and discard the instructions it was running under.
- It SHALL re-run the manifest-resolution step against the updated instructions, because a newer version may read a manifest key the previous one never consulted.
- It SHALL keep the refreshed clone and the values derived from it, and SHALL NOT fetch or reset the clone a second time.

The self-update pass SHALL run **at most once per run**. Files handled by the pass SHALL NOT be considered again by the general copy-and-update loop.

When the local `wong-sync` files are **not** provably unmodified, the pass SHALL NOT fire and SHALL NOT modify them. The run SHALL state plainly that it is continuing on the installed version, name that version, and let the capability analysis propose the adaptation through the ordinary `adopt` path.

The report SHALL name a self-update when one occurred, including the version it moved from and to, and SHALL make clear that the remainder of the run followed the newer instructions.

#### Scenario: An untouched skill runs its own latest version

- **WHEN** the local `wong-sync` files are byte-identical to an earlier upstream release and upstream has since changed them
- **THEN** they are brought current before any other payload file is considered
- **AND** the rest of the run follows the updated instructions rather than the ones it started with

#### Scenario: A customized skill is never overwritten and never silently bypassed

- **WHEN** the local `wong-sync` differs from every historical upstream version
- **THEN** the self-update pass does not fire and the files are untouched
- **AND** the run states that it is continuing on the installed version, and the capability analysis proposes the adaptation as an ordinary `adopt`

#### Scenario: The pass cannot loop

- **WHEN** a run has already performed the self-update pass
- **THEN** it does not perform the pass again during that run

#### Scenario: The clone is not refreshed twice

- **WHEN** the self-update pass fires
- **THEN** the already-refreshed clone and the values derived from it are reused, with no second fetch or reset

#### Scenario: Version skew is reported

- **WHEN** a run self-updated partway through
- **THEN** the report names the version it moved from and to and states that the remainder of the run followed the newer instructions

## MODIFIED Requirements

### Requirement: One behavior, no arguments

`/wong-sync` SHALL take no arguments and expose exactly one behavior. A run SHALL: refresh the clone, bring its own skill files current, copy absent payload files and update provably unmodified ones, run the capability analysis specified by the `wong-sync-adapt` capability, rewrite the manifest, and report. There SHALL be no contribute leg, no curation of local drift, no prompt about contributing, and no pull request opened by the skill in any circumstance.

An invocation carrying the retired `contribute` argument SHALL stop with a short explanation pointing at the contributing page's manual route, rather than silently running an ordinary sync.

#### Scenario: A sync never mentions contributing

- **WHEN** the user runs `/wong-sync`
- **THEN** it copies absent files, analyses the rest, rewrites the manifest, and reports
- **AND** it neither curates local drift nor asks whether to contribute anything

#### Scenario: Retired contribute argument

- **WHEN** the user runs `/wong-sync contribute`
- **THEN** the skill explains that the leg was removed and points at the contributing page's manual route, without running a partial sync

#### Scenario: Refuses to run in the WongStack source

- **WHEN** `/wong-sync` is invoked inside a WongStack clone itself (the resolved clone equals the current repo)
- **THEN** the skill stops without changing anything, explaining the source has nothing to sync with itself

### Requirement: Single payload manifest, wong-sync included

The payload-manifest list SHALL live in exactly one place, inside the `wong-sync` skill, and `wong-setup` SHALL reference it rather than keep a copy — `wong-setup` copies no payload file except the `wong-sync` skill itself (its bootstrap); everything else arrives through the sync's copy-if-absent step. The list includes the workflow skills plus `wong-sync` itself, the docs convention pages — **including a contributing page documenting the manual route for sending a payload improvement upstream** — and the CLAUDE.md `WONG-STACK` block; it excludes `wong-setup`, `VERSION`, and `CHANGELOG.md`. The manifest SHALL additionally define an **opt-in `stack-pack` category** — the pack's drop-in files (its scripts, seed template, and `wiki/stack/` pipeline docs) — in scope **only** for a repo whose manifest has `components.stackPack: true`; for any other repo those files are outside the manifest and MUST never be copied or analysed.

The manifest bounds what the skill **copies**. It SHALL NOT bound what the analysis's surveyor **reads**, which is specified by the `wong-sync-adapt` capability; no read content leaves the machine. A payload skill installed under a different local name SHALL be recognized under that name via the manifest's skills mapping, so it counts as present rather than absent.

#### Scenario: wong-sync updates itself

- **WHEN** upstream ships an improved `wong-sync` skill and the target's copy is provably unmodified
- **THEN** the self-update pass brings it current before any other payload file is considered
- **AND** where the target's copy has local edits instead, it is left untouched and the update is handled by the capability analysis

#### Scenario: Non-manifest files are never copied

- **WHEN** the target contains app-specific skills, source, or docs outside the manifest
- **THEN** the skill never copies over them

#### Scenario: Renamed skill counts as present

- **WHEN** a payload skill was installed under a different local name recorded in `components.skills`
- **THEN** it is treated as present and analysed, not copied in a second time under the default name

#### Scenario: Pack files are in scope only for opt-in repos

- **WHEN** `/wong-sync` runs in a repo whose manifest lacks `components.stackPack: true`
- **THEN** the pack's files are treated as outside the manifest — never copied or analysed
- **AND** in a repo with `components.stackPack: true`, those files are copied if absent and analysed if present

#### Scenario: Target repos receive the contributing page

- **WHEN** a repo installs or syncs the payload
- **THEN** the contributing page arrives with the other copied docs, so the way to contribute is discoverable

### Requirement: No git in the target; full git in the clone

`/wong-sync` SHALL NOT run any git command that mutates the target repo (no add, commit, branch, push): copied files, files brought current, and the proposed change folder land in the working tree for the user to review and `/save`. The clone SHALL be treated as **read-only** — the skill fetches, checks out, and resets it to the upstream default branch, and SHALL NOT create branches, commits, or pushes there. A dirty clone MUST NOT be reset without warning and confirmation. Reading the clone's history to prove that a local file is unmodified SHALL NOT count as mutating it.

#### Scenario: A run finishes

- **WHEN** absent files have been copied and a change folder written
- **THEN** they exist only as working-tree edits and the skill directs the user to `/save`, having made no target-side commits

#### Scenario: Clone is never written to

- **WHEN** any `/wong-sync` run completes
- **THEN** the clone is on the upstream default branch with no branch, commit, or push created by the skill

#### Scenario: A self-update is still working-tree only

- **WHEN** the skill has brought its own files current during a run
- **THEN** those files are uncommitted working-tree edits awaiting `/save`, exactly like any other copied or updated file

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-09

~~~
<!-- end .openspec.yaml -->
