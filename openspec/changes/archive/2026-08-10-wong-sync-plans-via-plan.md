<!-- openspec-archive v1 2026-08-10-wong-sync-plans-via-plan -->
<!-- file proposal.md utf8 6036 -->
# wong-sync-plans-via-plan

**Status:** ready-to-ship
**Open questions:** none

## Why

`/wong-sync` hand-rolls its OpenSpec change: it writes `proposal.md` and `tasks.md` itself at a hardcoded path. This duplicates authoring `/plan` already owns, ignores the target repo's own planning configuration (planning home, store resolution, `config.yaml`), and skips the validation that the change is apply-ready. The fix is delegation, not a new mechanism: the sync gathers everything first — repo research, verdicts, the user's answers — then invokes the repo's own `/plan` with a fully composed instruction, the same way a user with all the facts would.

## What Changes

- **`/wong-sync` Step 3 invokes `/plan` instead of writing the change folder itself.** All research stays in the sync — clone refresh, newest-instructions, blob-hash proof, cartographer/surveyor, clarification, verdicts, changelog accounting, verdict record. What changes is the last step: the sync composes the change name, the after-picture proposal body (After · Gain · Lose · Resolution, unchanged), the coarse task list, and the spec scoping, then passes all of it to `/plan` as one fully resolved instruction.
- **`/plan` is not modified.** The instruction carries everything: the exact name, "use this proposal body verbatim," "these tasks," and "delta specs only for the named grafts." This works with whatever `/plan` version the target has — including a locally edited one the sync must never touch — because the invocation text is ordinary planning intent, not a protocol.
- **Naming stays in the sync.** It checks for an existing `sync-wongstack-<YYYY-MM-DD>` folder itself and passes the already-suffixed name (`-2`, `-3`), so `/plan` never faces a collision and never asks "continue or create new?".
- **No prompts by construction.** The clarification stage runs before the invocation, so the instruction is complete; a blocker inside `/plan` returns to the sync, which reports it.
- **Delta specs for `adopt` grafts only.** A graft is a capability the target genuinely gains and owns. Payload copies and updates are vendored files whose specs live upstream; the instruction says to emit none for them — stated explicitly, because `/plan`'s default is to emit delta specs.
- `design.md`, if `/plan` writes one, is a per-run snapshot; `.claude/wong-sync-verdicts.md` stays the authoritative, tickable, cross-run store.
- `/plan` is resolved through the manifest's `components.skills` (local renames respected). A target with no plan skill falls back to today's hand-rolled write, named in the report as a degraded mode.
- The seed-manifest copy stays the one write-during-run exception.
- Payload release: `VERSION` bump, `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` passing.

## Non-goals

- **No edit to `/plan` or `/apply`.** The delegation is an invocation, not a contract; the fronted `openspec-propose` step stays verbatim.
- No change to what the sync decides — verdicts, taxonomy, questions, the adopt bias, and the verdict record are untouched.
- No change to the after-picture format.
- No new prompts anywhere in the sync run.
- The empty `openspec/changes/improve-openspec-plans/` scaffold is not this change's concern.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `wong-sync-adapt`: the analysis's output requirement changes — Step 3 composes the change's content and invokes the repo's `/plan` with it instead of writing the change folder itself; delta specs are scoped to `adopt` grafts only; degraded mode when `/plan` is absent.

## Impact

- `.claude/skills/wong-sync/SKILL.md` — Step 3 and the hard rules (output no longer written by the run; delegation stated).
- `.claude/skills/wong-sync/references/adapt.md` — "The output" section rewritten around the delegation; task shapes and spec scoping kept as the composed bodies' specification.
- `VERSION`, `CHANGELOG.md` — release bookkeeping.
- `.claude/skills/plan/`, `.claude/skills/apply/` — untouched.
- No script or CI changes; `scripts/check-payload-links.mjs` must still pass over the edited payload.

## Decision log

- **2026-08-10** — All five tasks implemented. `wong-sync/SKILL.md` Step 3 now produces the change by invoking the repo's plan skill with one composed instruction, with a new "the sync composes; the plan skill authors" block covering the three seam properties (collision resolved before invoking, nothing left to prompt for, the plan skill never edited); the "it proposes, it never implements" hard rule and the "writes two paths" rule updated to match, both keeping their original guarantees. `references/adapt.md` gained "The change is authored by the repo's plan skill" (ownership-split table, what the instruction carries, `SKILLMAP` resolution, blocker-returns-to-the-sync, named degraded mode) and "Delta specs are for grafts only" (graft-only rule with the staleness rationale, `design.md` as a per-run snapshot, the verdict record as the one authoritative store). Released as 11.2.0 with a changelog entry. `node scripts/check-payload-links.mjs` exits 0 with no dead links — the 16 conditional links it reports are pre-existing opt-in-category links, unchanged by this work. `openspec validate` passes. `/plan` and `/apply` were not touched, per the Non-goals.
- **2026-08-10** — Kept the delegation an instruction rather than a caller contract in `plan/SKILL.md`, as the design decided: a target's plan skill may be any version, possibly locally edited, and the sync must never overwrite local authorship. The accepted cost is that "verbatim" is instructed, not enforced.
- **2026-08-10** — Shipped. Archived to `openspec/changes/archive/2026-08-10-wong-sync-plans-via-plan/` and checkpointed on PR #67 (CI green). `/ship` archived under the resolved change name rather than the branch name: this line of work ran on `compare/wong-sync-plan-format`, so the loop's branch-name-equals-change-name tie did not hold and the change had to be named explicitly at each stage.

<!-- end proposal.md -->
<!-- file design.md utf8 5416 -->
# Design — wong-sync-plans-via-plan

## The decomposition

Authoring an OpenSpec change is five jobs:

| job | what it is | owner after this change |
|---|---|---|
| A — locate | resolve planning home, changeRoot, artifact paths | `/plan` (via the OpenSpec CLI) |
| B — name | pick the change name, handle collisions | the sync (it checks and passes the final, suffixed name) |
| C — content | decide what the change says | the sync (composed proposal + tasks + scoping) |
| D — write | artifacts in dependency order, per template and repo rules | `/plan` |
| E — validate | confirm `applyRequires` is satisfied | `/plan` |

`/wong-sync` today owns all five; only B and C are its product. The change hands D, A, E to the repo's own `/plan` — the same division a user with all the facts would get by typing the composed instruction at `/plan` themselves.

## Decision: instruct, don't extend

The delegation is an **invocation, not a contract**. `/plan` is not modified; the sync passes one fully resolved instruction — exact name, verbatim proposal body, the task list, the spec scoping — and `openspec-propose` treats invocation text as the user's request, which it already does.

Why this beats a caller-contract section in `plan/SKILL.md`:

- **Version independence.** The target's `/plan` is whatever version that repo has, possibly locally edited — and the sync never overwrites local authorship. A delegation that depended on a new contract section would fail in every repo whose plan skill predates it. An instruction works with any `/plan`, today's included.
- **No new coupling.** Nothing in `/plan` or `/apply` changes; the fronted `openspec-propose` stays verbatim per the CLAUDE.md rule.
- **The sequencing makes prompts moot.** The sync's flow is research → clarification questions → verdicts → invoke `/plan`. By invocation time every question `openspec-propose` could ask is already answered in the instruction; its "ask if critically unclear" has nothing left to ask. A genuine blocker returns to the sync, which reports it.

The instruction states, explicitly, the three things `/plan`'s defaults would otherwise get wrong: the proposal body is used **verbatim** (the after-picture must survive a target whose `config.yaml` proposal rule prescribes a different shape), delta specs are emitted **only** for the named grafts, and the supplied tasks are the task list.

## Decision: naming stays in the sync

The sync resolves the collision itself — it checks for an existing `sync-wongstack-<YYYY-MM-DD>` and passes the already-suffixed `-2`/`-3` name. `/plan` never sees a collision, so `openspec-propose`'s "continue it or create new?" guardrail never fires, and an existing (possibly mid-flight) sync change is never touched.

## Decision: delta specs for grafts only

`/plan`'s default emits delta specs, so an unscoped delegation would silently vendor WongStack's own capability specs into every target's `openspec/specs/` — copies the target doesn't own that go stale the moment upstream moves. The instruction scopes them:

- **payload copies and updates** → no delta spec. Vendored files; the spec lives upstream.
- **`adopt` grafts** → a delta spec is expected where the graft is concrete. The target genuinely gains that capability and owns it from then on.

## Decision: the verdict record stays authoritative

`.claude/wong-sync-verdicts.md` (cross-run, tickable, permanent) remains the only store of verdicts — overruling the *next* run requires a living file, and an archived change cannot do that job. `design.md`, if the target's `/plan` writes one, is a per-run snapshot and never the store.

## Decision: resolution and the degraded mode

The sync resolves the plan skill through the manifest's `components.skills` (`SKILLMAP`), so a locally renamed plan skill is found under its local name. A target with no plan skill falls back to the current hand-rolled write (proposal + tasks at `openspec/changes/sync-wongstack-<date>/`), named in the report as a degraded mode. On a seed manifest there is no gap: Step 2 copies the payload during the run, so the plan skill exists before Step 3 needs it. The seed-manifest copy remains the one write-during-run exception.

## What deliberately does not change

- `/plan` and `/apply` — untouched, including the existing "When `/apply` invokes `/plan`" section.
- The research head: clone refresh, newest-instructions rule, blob-hash proof, cartographer/surveyor, clarification stage, verdict taxonomy, adopt bias, changelog accounting, verdict record and its tick surface.
- The after-picture format (After · Gain · Lose · Resolution) and every requirement in `wong-sync-after-picture`.
- "The approval decision is never a prompt", "no git in this repo", "the clone is read-only", "it proposes; it never implements."

## Risks

- **Verbatim is instructed, not enforced.** A target's `/plan` follows the instruction the way any skill follows intent — a heavily customized plan skill could reshape the proposal despite "verbatim." Accepted: the alternative (a protocol in `/plan`) fails harder in old-version repos, and the sync's report can note when the landed proposal diverges from what it composed.
- **Per-repo plan quality varies.** Sync plans become repo-native — the thesis ("adaptation, not replication"), but new coupling. The sync proposal's Lose region should own this in target repos.

<!-- end design.md -->
<!-- file tasks.md utf8 1929 -->
# Tasks — wong-sync-plans-via-plan

## 1. /wong-sync — delegate authoring to /plan

- [x] 1.1 In `.claude/skills/wong-sync/SKILL.md`, rewrite Step 3's output paragraph and the hard rules: the run's second artifact is a change **authored by the repo's plan skill, invoked by the sync with one fully composed instruction** (resolved name `sync-wongstack-<YYYY-MM-DD>` with the sync applying the `-2`/`-3` suffix itself before invoking, verbatim proposal and tasks bodies, spec scoping). Keep the hand-rolled write only as the named degraded mode when no plan skill exists. Keep "the run writes two paths", "no git", "the approval decision is never a prompt", and the seed-manifest exception intact. `/plan` and `/apply` are not edited.
- [x] 1.2 In `.claude/skills/wong-sync/references/adapt.md`, rewrite "The output" section around the invocation: the flow (research → clarification → verdicts → invoke `/plan`), what the instruction carries (name, verbatim proposal body, tasks body, spec scoping), plan-skill resolution via `SKILLMAP` (local renames), the blocker path (returns to the sync, which reports — never prompts), and the degraded mode. Preserve the after-picture and task-shape content as the specification of the composed bodies.
- [x] 1.3 Add the delta-spec scoping rule to `adapt.md`: delta specs for `adopt` grafts only; never for vendored payload copies/updates, with the staleness rationale — stated in the instruction because `/plan`'s default is to emit them broadly. State that `design.md` is an optional per-run snapshot and `.claude/wong-sync-verdicts.md` stays the only authoritative store.

## 2. Release

- [x] 2.1 Bump `VERSION` (minor) and add the `CHANGELOG.md` entry describing the delegation (sync composes, `/plan` authors), the sync-side collision resolution, and the graft-only delta-spec rule.
- [x] 2.2 Run `node scripts/check-payload-links.mjs` and fix any dead link it reports.

<!-- end tasks.md -->
<!-- file specs/wong-sync-adapt/spec.md utf8 8108 -->
# wong-sync-adapt Delta

## MODIFIED Requirements

### Requirement: The analysis proposes and never implements

The analysis SHALL write `.claude/wong-sync-verdicts.md` itself, and SHALL produce an OpenSpec change **by invoking the repo's plan skill with one fully composed instruction** — the plan skill itself is not modified and needs no knowledge of the sync — whenever the run **has anything to do** — that is, when it plans a copy or an update, plans to install its own newer version, or verdicts at least one capability `adopt`.

The instruction SHALL carry everything already resolved, so the plan skill has nothing left to ask:

- the **exact change name**. The sync SHALL resolve the name itself before invoking: `sync-wongstack-<YYYY-MM-DD>`, already suffixed `-2`, `-3` when a folder for today exists — so the plan skill never faces a collision and an existing, possibly mid-flight sync change is left untouched;
- the **composed `proposal.md` body**, with the instruction to use it **verbatim** — the after-picture specified by the `wong-sync-after-picture` capability (After, Gain, Lose, Resolution), carrying the version span synced, the files to be copied and updated, and a pointer to `.claude/wong-sync-verdicts.md`. Because nothing has landed when it is written, planned file changes SHALL be described as tasks rather than as landed — **except on a seed manifest**, where the copy has already happened and is described as landed. Verbatim is stated because the target's own proposal rules would otherwise reshape it;
- the **composed `tasks.md` body** — the file work as **coarse tasks** (one for the copies, one for the updates, one for installing a newer `wong-sync`, and one, ordered last among them, to rewrite the manifest to reflect the files that actually landed), followed by **one task per `adopt` capability**. There SHALL NOT be a task to review files the sync landed, because no file lands unreviewed;
- the **spec scoping**: delta specs only for `adopt` grafts (below), stated explicitly because the plan skill's default is to emit them broadly; `design.md` optional as a per-run snapshot, with the verdict record remaining the only authoritative store of verdicts.

The invocation SHALL happen only after the clarification stage, so every question is already answered; the sync SHALL NOT rely on the plan skill to ask the user anything. A blocker inside the plan skill returns to the sync, which reports it and does not fall back to prompting.

**Delta specs are scoped to grafts.** A delta spec SHALL be emitted only for an `adopt` capability — behavior the target repo genuinely gains and owns. Payload copies and updates SHALL NOT produce delta specs: they are vendored files whose specifications live upstream, and a copied spec goes stale in the target the moment upstream moves.

The plan skill SHALL be resolved through the manifest's `components.skills`, so a locally renamed plan skill is found under its local name. When the target has **no plan skill**, the sync SHALL fall back to writing `proposal.md` and `tasks.md` itself at `openspec/changes/sync-wongstack-<YYYY-MM-DD>/` and SHALL name this degraded mode in the report.

The change SHALL NOT be produced when the run plans no file change and has no `adopt`. The work is performed later through the normal loop (`/apply` → `/save` → `/ship`). Each adoption task SHALL name its capability id and describe the graft in this repo's terms — which file or convention it touches and what done looks like.

Change folders written under the earlier `adopt-wongstack-<YYYY-MM-DD>` name SHALL be left as they are; no rename or migration of existing folders is performed. An existing unapplied sync folder SHALL NOT suppress a new one — a changed situation deserves a changed plan — and the report SHALL name any `sync-wongstack-*` folder the run did not write, so an unapplied plan is visible rather than quietly superseded.

#### Scenario: Nothing else is touched

- **WHEN** a run completes on an installed repo
- **THEN** the only paths written are `.claude/wong-sync-verdicts.md` and the change the plan skill authored on the sync's behalf
- **AND** the user is directed to review the change and run `/apply`

#### Scenario: Authoring is delegated

- **WHEN** the run has anything to do and the target has a plan skill
- **THEN** the sync invokes it with one instruction carrying the resolved change name, the composed proposal and tasks bodies marked verbatim, and the spec scoping
- **AND** the composed after-picture and task list land verbatim
- **AND** the plan skill itself is unmodified — the instruction works with whatever version the target has

#### Scenario: The collision is resolved before the invocation

- **WHEN** a folder for today's date already exists at invocation time
- **THEN** the sync passes the suffixed name (`-2`, `-3`) in the instruction
- **AND** the plan skill never faces a collision or asks whether to continue the existing change

#### Scenario: The after-picture survives the target's rules

- **WHEN** the target's `config.yaml` prescribes a proposal shape other than the after-picture
- **THEN** the sync's composed proposal body still lands verbatim, in the four regions

#### Scenario: Delta specs are emitted for grafts only

- **WHEN** a run plans sixty file copies and verdicts two capabilities `adopt`
- **THEN** delta specs may be emitted for the two grafts
- **AND** no delta spec is emitted for any copied or updated payload file

#### Scenario: A renamed plan skill is found

- **WHEN** the manifest's `components.skills` records the plan skill under a local name
- **THEN** the sync resolves and invokes it under that name

#### Scenario: No plan skill falls back, and says so

- **WHEN** the target has no plan skill
- **THEN** the sync writes `proposal.md` and `tasks.md` itself at `openspec/changes/sync-wongstack-<YYYY-MM-DD>/`
- **AND** the report names the degraded mode

#### Scenario: A file-only run still produces a plan

- **WHEN** a run plans copies or updates but verdicts nothing `adopt`
- **THEN** the change is produced, its proposal is the after-picture, and its tasks carry the coarse file work
- **AND** there is no task asking the user to review files that landed

#### Scenario: File work is coarse, grafts are not

- **WHEN** a run plans sixty file copies and two adoptions
- **THEN** the copies are one task naming the proposal's file list, and each adoption is its own task at the concreteness bar

#### Scenario: The manifest task is last among the file tasks

- **WHEN** the tasks list is composed
- **THEN** the manifest rewrite is ordered after the copy, update, and self-install tasks, so it records what actually landed

#### Scenario: Existing sync change is never overwritten

- **WHEN** a change folder for today's date already exists
- **THEN** a suffixed sibling (`-2`, `-3`) is created and the existing folder is left untouched

#### Scenario: An unapplied plan does not block a new one

- **WHEN** a previous run's sync folder exists and was never applied
- **THEN** this run produces its own plan anyway
- **AND** the report names the older folder so it is visible

#### Scenario: Tasks are concrete

- **WHEN** a task is written for an `adopt` capability
- **THEN** it names the capability id and states what changes in this repo, not merely the upstream feature's name

#### Scenario: A no-op run writes no folder

- **WHEN** a run plans no file change and verdicts nothing `adopt`
- **THEN** no change folder is created
- **AND** `.claude/wong-sync-verdicts.md` is still written, and the report says the repo is current and points at it

#### Scenario: Prior adopt-named folders are left alone

- **WHEN** the target contains folders named `adopt-wongstack-<date>` from earlier versions
- **THEN** they are neither renamed nor rewritten, and new runs use the `sync-wongstack-<date>` name

#### Scenario: Target without OpenSpec

- **WHEN** the target has no `openspec/changes/` directory
- **THEN** the verdict record is still written and the report explains that the change could not be written

<!-- end specs/wong-sync-adapt/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-10

~~~
<!-- end .openspec.yaml -->
