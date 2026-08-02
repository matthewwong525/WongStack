# wong-sync-verdict-transparency

**Status:** ready-to-ship
**Open questions:** none

## Why

`/wong-sync` has a review gate for everything it says **yes** to and none for anything it says **no** to. An `adopt` becomes an OpenSpec change folder you read and `/apply`; a `declined` or `divergent` gets one line in a chat report that scrolls away — and is then written into the manifest ledger, where it suppresses that capability on every future run. So a judgment call the user never made becomes a permanent, invisible "no." The verdict taxonomy compounds it: `declined` is defined as "wrong for this repo, **or** the user said no", collapsing the skill's own inference and the user's actual refusal into one sticky slot.

## What Changes

- **Split `declined` by who decided.** A new `not-applicable` verdict carries the skill's own judgment (an `assumes` the repo doesn't meet, or a graft it couldn't describe concretely). `declined` narrows to mean *the user said no* and is the only verdict that may be written from a recorded user decision.
- **Only `declined` suppresses.** Every other verdict is recomputed from scratch each run, so a repo whose shape changed gets re-evaluated for free instead of being held to a stale inference. **BREAKING** for the ledger's read semantics: an existing `divergent` entry no longer suppresses re-evaluation (it is recomputed, and lands on `divergent` again if still true).
- **A durable verdict record.** Every run writes `.claude/wong-sync-verdicts.md` — the full list, every capability, verdict and one-line reason — even when nothing is adopted. It replaces the ephemeral chat report as the deliverable; the report shrinks to a summary plus a pointer.
- **Ticking a box is how you overrule the skill.** Non-adopt entries in that file are checkboxes. The next `/wong-sync` reads the previous file, forces every ticked capability to `adopt`, and writes it as a task — including un-declining something previously declined.
- **A narrow carve-out to "never overwrite".** `.claude/wong-sync-verdicts.md` is generated and owned by the skill, so it is regenerated each run. The guarantee continues to hold for every file the skill did not author.
- Payload edit → release: bump `VERSION` to 8.3.0 and add a `CHANGELOG.md` entry.

## Capabilities

### New Capabilities

None — this reshapes existing behavior rather than adding a surface.

### Modified Capabilities

- `wong-sync-adapt`: the verdict taxonomy gains `not-applicable`; suppression narrows to `declined` alone; the analysis gains a second durable output (`.claude/wong-sync-verdicts.md`) written on every run, and a checkbox promotion path that lets the user overrule any non-adopt verdict.
- `wong-sync`: the write scope in "never overwrite an existing file" gains the generated verdicts file, with the carve-out stated as owned-and-regenerated rather than a general exception.

## Impact

- `.claude/skills/wong-sync/SKILL.md` — Step 3 (adapt), Step 4 (ledger semantics), Step 5 (report), Hard rules.
- `.claude/skills/wong-sync/references/adapt.md` — the verdict table, the gap-analysis rules, the ledger section, the output contract, the report format.
- `.claude/.wong-stack.json` in target repos — `capabilities` entries may now carry `not-applicable`; older ledgers migrate lazily (an existing `declined` is honored as-is, since it cannot be distinguished after the fact and honoring it is the conservative read).
- `VERSION`, `CHANGELOG.md`.
- Non-goals: no change to Step 2's copy behavior (absent files still land unasked), and no interactive checkpoint during the run — the promotion path is asynchronous by design.

## Decision log

- **2026-08-02** — Planned and implemented in one session, all 21 tasks. The change started from the user's observation that `/wong-sync` "seems to just auto decide." Diagnosis: the skill had a review gate for everything it said *yes* to (`adopt` → a change folder you read) and none for anything it said *no* to (`divergent`/`declined` → a chat line plus a silently-suppressing ledger entry). Fixed by splitting the taxonomy on **who decided** — new `not-applicable` for the skill's judgment, `declined` narrowed to the user's word alone — and by giving every verdict a durable home in `.claude/wong-sync-verdicts.md`, where a checkbox tick overrules the call on the next run. **Ruled out:** an interactive per-capability checkpoint during the run (option C in the explore) — a 20–40 item list trains people to hit accept, and it does nothing on run two where the ledger is what actually suppresses. **Deliberately deferred:** gating Step 2's copy of absent payload files; nothing is committed and `/save` is the gate, so the volume doesn't justify a prompt. Recorded as an explicit non-goal so a later run doesn't re-litigate it. **Found while implementing:** the old ledger pinned every verdict to an `asOfCommit` in the *upstream clone*, but a `not-applicable` turns on the *target's* shape — so "assumes CI, you have none" would never have been revisited when the repo added CI. Narrowing suppression to `declined` alone closes that as a side effect. **Migration calls:** existing `divergent` entries stop suppressing (recomputed, and land on `divergent` again if still true); existing `declined` entries are honored as user refusals, since a pre-8.3.0 ledger can't distinguish the user's "no" from the skill's guess — the conservative read, because re-pitching something genuinely refused is the louder failure. Two edits beyond the task list, both accuracy fixes the tasks implied: the skill's frontmatter `description` still claimed it "never modifies a file that already exists," which the generated verdict record makes false, and the Step-3 line in the header diagram still read "capability gap → change." Branch renamed from `wong-sync-choice-prompts` to match the change name (no commits, no remote, so free) — the tie `/continue` and `/ship` rely on.
