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
