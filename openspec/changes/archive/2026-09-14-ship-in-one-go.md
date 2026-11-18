<!-- openspec-archive v1 2026-09-14-ship-in-one-go -->
<!-- file proposal.md utf8 6619 -->
# Ask up front, then ship in one go

**Status:** ready-to-ship
**Open questions:** none

## Why

Two gaps in the loop cost a session more turns than the work needs. First, `/plan` drafts artifacts on a guess: the generated propose skill says "ask before creating the change," but as open-ended prose, so material forks get assumed and surface only in review. Second, the loop stops one hop short of one-go: `/apply` already pulls in `/plan`, but nothing pulls in `/apply`, so a task that could finish unattended needs a second invocation for `/ship`. Batching the questions at the front is what makes the unattended run safe. The unattended run is what makes batching worth it.

## What Changes

- **`/explore` gains a bounded mode and an exit question round.** When `/plan` invokes it, `/explore` reads the conversation, investigates only what the conversation does not answer, then puts the unresolved material forks to the user as **one** AskUserQuestion call: at most four questions, each with a recommended option first, zero questions a valid outcome. It ends with a short summary and returns; it writes nothing. Standalone `/explore` keeps its open thinking-partner stance and uses the same one-call round when the user signals they are ready to plan.
- **`/plan` always invokes `/explore` first**, in bounded mode, and records each answer in the proposal. A non-interactive session takes the recommended option, and `/plan` records it as *assumed*, not *chosen*. `/plan` asks nothing itself beyond its existing UX layout fork.
- **`/ship <intent>` pulls in `/apply`.** When `/ship` receives an argument and the branch has nothing to ship, it hands the argument to `/apply` verbatim, which resolves it under its existing rules and pulls in `/plan` as it does today. The `/ship` invocation authorizes the whole chain through merge. Bare `/ship` on the default branch still stops.
- **Every verb now has one rule: when its precondition is missing, invoke the verb before it to produce it.** `/ship` → `/apply` → `/plan` → `/explore`. The stop rules carry outward unchanged: a paused plan or an incomplete apply stops `/ship` before archive; `/ship` never merges as a way of stopping.
- **Doctrine flips `/explore` from optional to always-runs.** [The change loop](../../../wiki/development/the-change-loop.md) and the loop line in `CLAUDE.md` say so, with the phrasing the page already uses for `/plan` under `/apply`: invoked for you when you skip it.
- **Release ritual:** `VERSION` → 12.4.0 (minor), newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` passes.

**Non-goals:** no edit to any generated `openspec-*` skill; no change to `/save`, and the two checkpoints in a one-go run (apply completion, ship archive) stay two; no `--no-questions` flag or any flag; no change to the `/verify` `FAILURE` pause, which still asks the user mid-run; no new verb.

## Capabilities

### New Capabilities

- `explore-clarification`: `/explore` owns the one-call clarification round, has a bounded mode for callers, and always precedes `/plan`.
- `ship-full-cycle`: `/ship <intent>` pulls in `/apply` so one invocation carries a task from intent to merge, with the existing stop and gate contracts unchanged.

### Modified Capabilities

- none. `apply-plan-handoff` and `delivery-gate` keep every requirement; the new capabilities compose with them and say so.

## Impact

- **Edited:** `.claude/skills/explore/SKILL.md`, `.claude/skills/plan/SKILL.md`, `.claude/skills/ship/SKILL.md`, `wiki/development/the-change-loop.md`, the `WONG-STACK` loop line in `CLAUDE.md`, `VERSION`, `CHANGELOG.md`.
- **Untouched:** `.claude/skills/apply/SKILL.md` (its resolution rules are reused, not changed), `/save`, all `openspec-*` skills, the payload manifest (no new files).
- **Downstream repos:** the next `/wong-sync` proposes the three skill edits and the wiki page; the `CLAUDE.md` block adapts through the usual path.
- **Cost:** every `/plan` now runs a bounded explore pass. For a trivial intent it should investigate nothing and ask nothing. A one-go run still runs CI twice, as running the verbs by hand does today.
- **Risk:** AskUserQuestion blocks in a session with nobody to answer. The non-interactive fallback (recommended option, recorded as assumed) is what keeps a scheduled or remote run from hanging.

## Decision log

- **2026-09-13** — Explored two placements for the question round. First shape put it in `/plan`; ruled out because `/plan` would have to investigate the codebase to find forks, which duplicates `/explore`. The user chose to move the round into `/explore` and make explore always run. Trigger for the full cycle is an explicit `/ship` argument, not on-branch detection, so nobody merges by accident. One change rather than two, because both features share the same three skills, the same wiki page, and one version bump. A stray empty scaffold, `openspec/changes/improve-openspec-plans/`, was noticed and left alone; it is not this change's to remove.
- **2026-09-14** — Implemented all 20 tasks. `/explore` gained the exit round (one AskUserQuestion call, at most four questions, recommended option first, an 80/20 ask-vs-assume table, and the non-interactive fallback) plus bounded mode for `/plan`; `/plan` gained "Explore first, always" and the Decision-log recording rule; `/ship` gained the `/ship <intent>` pull-in inside Step 1, the never-merge-to-stop rule in Step 1 and Hard rules, and a rewritten description. The change loop page gained a "Asking before drafting" section and the nested chain rule, and `/explore` is no longer marked optional there or in the `WONG-STACK` verbs bullet. VERSION 12.4.0, newest-first CHANGELOG entry, `node scripts/check-payload-links.mjs` reports no dead links, and the diff touches no `openspec-*` skill and no `agent-browser` file. The harness-assigned branch `plan-clarifications-ship-full-cycle` was renamed to `ship-in-one-go` (unpushed, zero commits ahead) to restore the branch = change = note tie.
- **2026-09-14** — Archived for shipping. Delta specs were already folded into `openspec/specs/` at the previous checkpoint (new `explore-clarification` and `ship-full-cycle`, verified requirement-for-requirement and scenario-for-scenario before the move); the archive moved to `openspec/changes/archive/2026-09-14-ship-in-one-go/` with all 20 tasks complete, ahead of the delegated final checkpoint and squash-merge. Shipped by hand through `/apply` then `/ship`: the `/ship <intent>` pull-in this change adds did not exist when the work started, so the chain it introduces is still unexercised end to end.

<!-- end proposal.md -->
<!-- file design.md utf8 4650 -->
## Context

See proposal.md — Why. The generated `openspec-explore` and `openspec-propose` skills stay pristine, so every behavior here lives in the three WongStack wrappers: `explore`, `plan`, `ship`. The precedent for a wrapper that behaves differently when another verb calls it already exists twice: `/plan` has "When `/apply` invokes `/plan`," and `/apply` has "Resolve the plan first." This change adds the same shape to `/explore` and `/ship`. AskUserQuestion allows at most four questions per call, and this session is itself non-interactive, so the fallback is not hypothetical.

## Goals / Non-Goals

**Goals:**
- One place asks, once: the exit of `/explore`.
- One rule for the loop: a verb whose precondition is missing invokes the verb before it.
- No new artifact, file, flag, or verb.

**Non-Goals:**
- Merging the two checkpoints of a one-go run into one. That touches `/save` and both "exactly once" rules and is its own change if ever wanted.
- Changing `/apply` beyond what it already does. It is the middle of the chain and needs no edit.

## Decisions

**The round lives in `/explore`, at its exit.** Alternative: in `/plan` before the propose step. Ruled out because finding forks requires investigating the codebase, which is `/explore`'s job; `/plan` would duplicate it. Placing the round at explore's *exit* makes standalone and bounded modes share one rule: standalone exits when the user says "plan it," bounded exits after investigation.

**Bounded mode is a section of the `explore` wrapper, not a separate skill.** Same pattern as "When `/apply` invokes `/plan`." The generated skill still owns the stance; the wrapper adds "when `/plan` invokes `/explore`: read, investigate the gap, ask once, summarize, return, write nothing."

**`/plan` always runs the bounded pass, even after a standalone explore.** Alternative: detect whether the conversation already explored and skip. Ruled out as fuzzy. The bounded pass after a thorough standalone session investigates nothing and asks nothing, so it costs little and the rule stays uniform.

**`/plan` records answers; `/explore` writes nothing.** Keeps explore's "nothing is written" property. Answers land in the proposal's Decision log as `asked X → chose Y` or `asked X → assumed Y (non-interactive)`, which is where a cold reader looks for why the change is shaped this way.

**Non-interactive fallback: recommended option, marked assumed.** Alternative: stop and wait. Ruled out because a scheduled or remote run would hang forever. Marking the answer as assumed keeps the reviewer able to tell a decision from a default.

**`/ship` pulls in `/apply`, not a new verb and not a flag.** Alternatives: `/go` (a seventh verb across CLAUDE.md, the loop diagram, the manifest) or `/ship --all` (flags are foreign to the verbs, which read intent from their argument). The pull-in mirrors `/apply` → `/plan` exactly, so the loop gains one uniform rule instead of a special case.

**Trigger is an explicit argument, never detection.** Bare `/ship` on `main` keeps stopping. The argument is passed to `/apply` verbatim so `/apply`'s existing resolution order, including the "sole active change only when the conversation establishes no different work" guard, decides what it means.

**`/ship`'s preflight gains a branch, not a rewrite.** Step 1 today stops on the default branch or on nothing-to-ship. The new text: if either stop condition holds *and* an argument was given, invoke `/apply` with the argument, then re-run the preflight. Everything from Step 2 onward is unchanged. The authorization sentence at the top of the runbook widens to cover the pulled-in stage.

## Risks / Trade-offs

- [Every `/plan` now runs an explore pass, even for a one-line fix] → bounded mode's first instruction is "investigate only what the conversation does not answer"; a trivial intent yields a short pass and zero questions. The user can also type "just do it" into the AskUserQuestion "Other" field.
- [A bounded explore drifts into open-ended thinking and never returns] → the wrapper states the bounded steps and the exit explicitly; the summary is the return signal.
- [`/ship <intent>` picks the wrong change] → it never resolves anything itself; `/apply`'s resolution rules and its "ask, do not guess" fallback apply unchanged.
- [Two CI runs per one-go task] → accepted; it is what running the verbs by hand costs today, and both "exactly once" rules are load-bearing.
- [The assumed-answer marker gets dropped when a later `/save` syncs the proposal] → the Decision log is append-only by contract; the marker sits in a dated entry that `/save` never rewrites.

<!-- end design.md -->
<!-- file tasks.md utf8 4954 -->
## 1. `/explore` skill (`.claude/skills/explore/SKILL.md`)

- [x] 1.1 Add a "The exit round" section: at explore's exit, collect the forks whose answer would make the artifacts wrong, ask them in exactly one AskUserQuestion call (≤4 questions, recommended option first and labelled, zero questions valid, no call when zero). State the 80/20 test: scope, observable behavior, compatibility, acceptance criteria are questions; naming, placement, wording are assumptions to record. Skip any fork the conversation already resolved; beyond four, ask the four that most change the artifacts and record the rest as assumptions.
- [x] 1.2 Add the non-interactive fallback to that section: when the session cannot answer or the tool is unavailable, take the recommended option and mark it *assumed* in the summary.
- [x] 1.3 Add a "When `/plan` invokes `/explore`" section (bounded mode): read the conversation, investigate only what it does not answer, run the exit round, end with a short "What we figured out" summary, return to `/plan`, write no file and create no artifact. State that standalone `/explore` keeps its open stance and holds the same exit round when the user says they are ready to plan.
- [x] 1.4 Update the closing handoff paragraph so it names the exit round as the moment before `/plan`; keep the `openspec-explore` invocation and the code-vs-AI section unchanged.

## 2. `/plan` skill (`.claude/skills/plan/SKILL.md`)

- [x] 2.1 Add an "Explore first" section before the `openspec-propose` invocation: always invoke the `explore` skill in bounded mode with the intent, whether `/plan` was invoked by the user, by `/apply`, or through `/ship`; then invoke `openspec-propose` with the intent and the answers.
- [x] 2.2 State in that section that `/plan` records each answer in the proposal's Decision log as `asked X → chose Y` or `asked X → assumed Y (non-interactive)`, and that `/plan` asks nothing of its own beyond the existing UX layout fork.
- [x] 2.3 Update the "When `/apply` invokes `/plan`" section with one line: the bounded explore pass still runs on that path, so the questions reach the user before any code.

## 3. `/ship` skill (`.claude/skills/ship/SKILL.md`)

- [x] 3.1 Widen the authorization sentence at the top: invoking `/ship <intent>` also authorizes the pulled-in explore, plan, implement, and save stages, with no re-prompt between stages.
- [x] 3.2 In Step 1, add the pull-in branch: when an argument was given and the preflight finds nothing to ship (on the default branch, or clean tree with 0 commits ahead), invoke the `apply` skill with the argument verbatim, let it resolve under its own rules, then re-run the preflight on the branch `/save` created. Bare `/ship` keeps every existing stop. A feature branch with work runs the runbook without invoking `/apply`.
- [x] 3.3 Add the stop rule to Step 1 and to Hard rules: if `/plan` pauses, `/apply` ends with tasks pending, or a `/save` inside the chain returns failing or unverifiable, report the blocker and stop before Step 2; never archive, checkpoint, or merge a partial change; never merge as a way of stopping.
- [x] 3.4 Update the description frontmatter (≤600 characters, trigger-focused) so it says `/ship <intent>` runs the whole cycle from intent to merge.

## 4. Wiki (`wiki/development/the-change-loop.md`)

- [x] 4.1 Change the `/explore` step from *(optional)* to always-runs: `/plan` invokes it when you skip it, and it owns the one-call clarification round at its exit. Keep the step one paragraph, link down to the skill.
- [x] 4.2 Add the chain rule beside the "diagram shows durable stages" paragraph: each verb invokes the verb before it when its precondition is missing, with the nesting `/ship` → `/apply` → `/plan` → `/explore`; `/ship <intent>` is the one-go entry.
- [x] 4.3 Extend the `/ship` step with one sentence on the pull-in and the stop rule; note that a one-go run has two checkpoints, and link to the gate section rather than restating it.
- [x] 4.4 Run the wiki-style checks by hand: no duplicated procedure between the page and the three skills, every named skill linked, the diagram stays visual-only.

## 5. `CLAUDE.md` (`WONG-STACK` block)

- [x] 5.1 Update the "Drive work through the WongStack verbs" bullet so the loop line no longer implies `/explore` is optional and adds that `/ship <intent>` runs the whole cycle. Keep the block free of repo-specifics and under its current length.

## 6. Release ritual

- [x] 6.1 Bump `VERSION` to 12.4.0.
- [x] 6.2 Add a newest-first `CHANGELOG.md` entry: the exit round in `/explore`, explore always runs, `/ship <intent>` one-go, the chain rule, the non-interactive fallback, and what a target gains on the next `/wong-sync`.
- [x] 6.3 Run `node scripts/check-payload-links.mjs` and fix any dead link.
- [x] 6.4 Confirm `git diff --stat` touches no `openspec-*` skill and no `agent-browser` file, and that the payload manifest needs no edit (no new files).

<!-- end tasks.md -->
<!-- file specs/explore-clarification/spec.md utf8 5167 -->
## Purpose

`/explore` owns the clarification round of the loop: it puts the material forks to the user as one structured question set before any artifact is drafted, and it always runs before `/plan`, invoked for the user when they skip it.

## ADDED Requirements

### Requirement: Explore puts unresolved material forks to the user in one call

When `/explore` reaches its exit — the moment the user signals they are ready to plan, or the end of a bounded pass — it SHALL collect the forks whose answer would make the planning artifacts wrong, not merely different, and put them to the user in exactly one AskUserQuestion call. The call SHALL contain at most four questions. Each question SHALL list its recommended option first, labelled as recommended, so a tap answers it. A fork the conversation has already resolved SHALL NOT be asked. Zero questions SHALL be a valid outcome, and in that case `/explore` SHALL make no call.

The 80/20 test SHALL be stated in the skill: scope, externally observable behavior, compatibility, and acceptance criteria are questions; naming, placement, and wording are assumptions to record.

#### Scenario: Forks remain after exploration

- **WHEN** `/explore` reaches its exit with two material forks the conversation has not resolved
- **THEN** it makes one AskUserQuestion call containing those two questions
- **AND** each question lists its recommended option first

#### Scenario: The conversation already resolved every fork

- **WHEN** `/explore` reaches its exit after a discussion that settled every material fork
- **THEN** it makes no AskUserQuestion call
- **AND** it proceeds to its summary

#### Scenario: More than four forks are material

- **WHEN** `/explore` identifies more than four material forks
- **THEN** it asks the four that most change the artifacts
- **AND** it records the rest as assumptions with the recommended answer

#### Scenario: Nobody can answer

- **WHEN** the session is non-interactive or the AskUserQuestion tool is unavailable
- **THEN** `/explore` takes the recommended option for every question
- **AND** it marks each as assumed rather than chosen in its summary

### Requirement: Explore has a bounded mode for callers

When `/plan` invokes `/explore`, `/explore` SHALL run in bounded mode: read the conversation so far, investigate only what the conversation does not answer, run the exit question round, end with a short summary of what was figured out, and return to the caller. Bounded mode SHALL write no file and SHALL create no OpenSpec artifact. Standalone `/explore` SHALL keep its open thinking-partner stance unchanged and SHALL still hold the same exit round.

#### Scenario: Plan invokes explore in a fresh session

- **WHEN** `/plan` invokes `/explore` with an intent the conversation has not discussed
- **THEN** `/explore` investigates the codebase for that intent, runs the exit round, summarizes, and returns
- **AND** no file is written by `/explore`

#### Scenario: Plan invokes explore after a standalone explore

- **WHEN** the user ran `/explore` on the intent in this conversation and then invoked `/plan`
- **THEN** the bounded pass investigates nothing the conversation already covers
- **AND** it asks nothing the standalone session already answered

#### Scenario: Generated skills stay pristine

- **WHEN** the bounded mode and the exit round are added
- **THEN** they live in `.claude/skills/explore/SKILL.md`
- **AND** no generated `openspec-*` skill is modified

### Requirement: Plan always runs explore first and records the answers

`/plan` SHALL invoke `/explore` in bounded mode before it invokes the OpenSpec propose step, whether `/plan` was invoked by the user, by `/apply`, or through `/ship`. `/plan` SHALL record every answer from the exit round in the change's `proposal.md` Decision log, stating for each whether the user chose it or it was assumed under the non-interactive fallback. `/plan` SHALL ask no clarification questions of its own beyond its existing UX layout fork.

#### Scenario: Plan invoked by the user

- **WHEN** the user invokes `/plan` with an intent
- **THEN** `/plan` invokes `/explore` in bounded mode first
- **AND** it then invokes the propose step with the intent and the answers

#### Scenario: Plan invoked through apply or ship

- **WHEN** `/apply` or `/ship` invokes `/plan`
- **THEN** the bounded explore pass and its exit round still run
- **AND** the questions reach the user before any code is written

#### Scenario: Answers survive a cold resume

- **WHEN** a reader opens `proposal.md` on another machine
- **THEN** the Decision log lists each question and its answer
- **AND** an assumed answer is marked as assumed

### Requirement: The loop states that explore always runs

The change loop page and the loop line in the `WONG-STACK` block of `CLAUDE.md` SHALL describe `/explore` as always running before `/plan`, invoked for the user when they skip it, and SHALL NOT describe it as optional.

#### Scenario: A reader checks whether explore is optional

- **WHEN** a reader opens the change loop page
- **THEN** the `/explore` step says it always runs and that `/plan` invokes it when skipped

<!-- end specs/explore-clarification/spec.md -->
<!-- file specs/ship-full-cycle/spec.md utf8 4193 -->
## Purpose

`/ship` can carry a task from intent to merge in one invocation by pulling in `/apply` when the branch has nothing to ship, so every verb in the loop follows one rule: when its precondition is missing, invoke the verb before it.

## ADDED Requirements

### Requirement: Ship with an argument pulls in apply

When `/ship` is invoked with an argument and its preflight finds nothing to ship — the current branch is the default branch, or the branch has no commits ahead and a clean tree — `/ship` SHALL hand the argument to `/apply` verbatim before its own runbook. `/apply` SHALL resolve the argument under its existing rules, invoking `/plan` when no apply-ready change exists, implementing the tasks, and invoking `/save` on completion. `/ship` SHALL then continue from its preflight on the branch `/save` created. The `/ship` invocation SHALL authorize the whole chain — explore, plan, implement, save, archive, verify, merge — with no re-prompt between stages.

#### Scenario: Ship from the default branch with an intent

- **WHEN** the user invokes `/ship <description>` on the default branch
- **THEN** `/ship` invokes `/apply` with that description
- **AND** after `/apply` completes and `/save` has pushed the branch, `/ship` runs its archive, checkpoint, verify, and merge steps on that branch

#### Scenario: Ship with an existing change name

- **WHEN** the user invokes `/ship <name>` where `<name>` is an active change with no branch commits yet
- **THEN** `/apply` resolves that change under its existing rules and works its tasks
- **AND** `/ship` continues once `/apply` has completed

#### Scenario: Bare ship on the default branch

- **WHEN** the user invokes `/ship` with no argument on the default branch
- **THEN** `/ship` stops as it does today
- **AND** it does not invoke `/apply`

#### Scenario: Ship on a branch that already has work

- **WHEN** the user invokes `/ship` with or without an argument on a feature branch with commits ahead or a dirty tree
- **THEN** `/ship` runs its existing runbook without invoking `/apply`

### Requirement: Ship never merges as a way of stopping

When the pulled-in stage does not reach completion — `/plan` pauses on unclear intent, `/apply` ends with tasks pending, or a task-driven or completion `/save` returns a failing or unverifiable result — `/ship` SHALL report the blocker and stop before its archive step. It SHALL NOT archive, checkpoint, or merge a partial change.

#### Scenario: Planning pauses inside the chain

- **WHEN** `/plan` pauses because the intent is unclear
- **THEN** `/ship` reports the planning blocker and stops
- **AND** no archive or merge occurs

#### Scenario: Apply stops with tasks pending

- **WHEN** `/apply` reports remaining work instead of completing
- **THEN** `/ship` reports that work and stops
- **AND** it does not invoke `/save` on the partial state

### Requirement: The chain composes with the existing contracts

The pulled-in stage SHALL change nothing in the `apply-plan-handoff`, `apply-completion-handoff`, and `delivery-gate` contracts. `/apply` SHALL still invoke `/save` exactly once on completion, and `/ship` SHALL still invoke ordinary `/save` exactly once after the archive, so a one-go run has two checkpoints. The ship-time `/verify` `FAILURE` pause SHALL still ask the user. The change loop page SHALL state the one rule every verb now follows: when its precondition is missing, invoke the verb before it to produce it.

#### Scenario: Two checkpoints in a one-go run

- **WHEN** `/ship <intent>` runs the full chain to merge
- **THEN** `/apply`'s completion `/save` and `/ship`'s archive `/save` both run
- **AND** `/ship` merges only on the archive checkpoint's `SUCCESS` or `NONE`

#### Scenario: A red walk still pauses

- **WHEN** the ship-time `/verify` returns `FAILURE` inside a one-go run
- **THEN** `/ship` stops and asks the user whether to fix or merge anyway

#### Scenario: A reader looks up the chain rule

- **WHEN** a reader opens the change loop page
- **THEN** it states that each verb invokes the verb before it when its precondition is missing
- **AND** it shows the nesting `/ship` → `/apply` → `/plan` → `/explore`

<!-- end specs/ship-full-cycle/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-13

~~~
<!-- end .openspec.yaml -->
