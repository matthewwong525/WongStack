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
