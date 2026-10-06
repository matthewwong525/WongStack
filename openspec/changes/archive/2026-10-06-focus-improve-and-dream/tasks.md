# Tasks

## 1. The `/improve-code` skill

- [x] 1.1 Move `.agents/skills/improve/` to `.agents/skills/improve-code/`; set `name: improve-code` and a description naming code structure; verify no `skills/improve/` path remains outside archives with `grep`.
- [x] 1.2 Rewrite the brief by design decision 8: code structure only, notes and ruled-out ideas loaded first, memory and wiki notes skipped, the three outcomes (clean, planned, blocked), `--audit-only`, the hand-off to `/plan` with no build or publish, the unattended save, an earlier waiting plan blocks a second, a link to the method page; verify it is no larger in words and bytes than the file it replaces.
- [x] 1.3 Rewrite `wiki/development/repository-improvement.md` as *Code improvement*: where to look, the deletion test, pin then reshape, undo what is not simpler, remember a no, it plans and stops, the three outcomes, cadence with the new name and what a scheduled run leaves behind, credit to pstack beside the existing one; keep every heading installs link; verify with `node scripts/check-payload-links.mjs`.

## 2. The `/dream-memory` skill and its script

- [x] 2.1 Move `.agents/skills/dream/` to `.agents/skills/dream-memory/`, keeping `scripts/dream.mjs`, its slug and its tag; fix the script's own path comments and usage; verify `node .claude/skills/dream-memory/scripts/dream.mjs since` runs.
- [x] 2.2 Add `drift` to `dream.mjs` (stale-path facts, finished or 30-day-idle plans) and `spec` rows to `pages`, read-only, with `--json`, by design decision 4; add cases to `scripts/tests/dream.test.mjs` (renamed import path) for each list and for an unreachable store; verify the test file passes.
- [x] 2.3 Rewrite the skill's steps by design decisions 5 to 7: load `improve` and `dream` notes, tidy memory, gather, add by the stricter test, clean pages against specs and plans, correct stale facts by superseding, list specs, plans and shipped pages under a `dream` thread, record a product fault under an `improve` thread, publish, record, report; `--dry-run` covers the new steps; verify `scripts/tests/cli-conventions.test.mjs` passes with the new path and command.
- [x] 2.4 Rewrite `wiki/development/wiki-dream.md` as *Memory dream*: what it reads, what it fixes and what it only lists, the stricter lasting-fact test and the buried-guidance rule under *Placing a fact on a page*, product faults, chats as evidence not orders, credit to pstack; keep every linked heading; update the consolidation paragraph in `wiki/development/memory.md`; verify with `node scripts/check-payload-links.mjs`.

## 3. Routines and memory plumbing

- [x] 3.1 Add the old-name map to `scripts/routine-runner/run.mjs` and accept both names in `routine.mjs`'s default name; add cases to `scripts/tests/routine-run.test.mjs` and `routine.test.mjs` showing `/improve --audit-only` reads `improve-code/SKILL.md` and `/dream` reads `dream-memory/SKILL.md`; verify both files pass.
- [x] 3.2 Update memory's slash-command re-tagging (`upkeep.mjs`) so `/improve-code` gives tag `improve` and `/dream-memory` gives `dream`, the old names still matching; update `measure-sessions.mjs`'s verb pattern; add an upkeep test case; verify `scripts/tests/memory-store.test.mjs` passes.
- [x] 3.3 Update `areas.json` paths and definitions (keys unchanged), `payload-files.json` `skillDirs`, the payload manifest's two paragraphs, and `scripts/fixtures/context-baseline.json` keys; verify `scripts/tests/memory-areas.test.mjs` and `context-measurement.test.mjs` pass.
- [x] 3.4 Confirm a renamed `skillDirs` entry removes the old folder from a target on sync; add a sync test case if none covers it; verify the wong-sync tests pass.

## 4. Every other mention

- [x] 4.1 Rename the commands in `AGENTS.md` (verb list and the scheduling rule), `.agents/skills/routine/SKILL.md`, `wiki/maintaining/adding-a-skill.md`, `wiki/stack/` and `wiki/development/` pages that name them, and the remaining test fixtures that mean the current skill; reword `AGENTS.md`'s scheduling rule and `routine/SKILL.md` where they say a scheduled run ships; verify `grep -rIn -E '\x60/(improve|dream)\x60'` finds only allowed files.
- [x] 4.2 Add the retired names to `scripts/retired-names.json` by the design's risk note, with the two spec allows and their reason; verify `node scripts/check-retired-names.mjs` passes.
- [x] 4.3 Write the `## Next (major)` entry in `CHANGELOG.md`, with an **Updating.** note in plain words: type the new names; schedules keep running; verify `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs` pass.

## 5. Verification

- [x] 5.1 Run `node scripts/measure-context.mjs --check` and `node .github/scripts/checks.mjs --worktree`; both pass, with the instruction total not above today's.
- [x] 5.2 Run `openspec validate focus-improve-and-dream --strict --no-interactive`.
- [x] 5.3 Run `/dream-memory --dry-run` here and record in `trial.md` what it lists from each of the four surfaces; it changes no file and no fact.
- [x] 5.4 Run `/improve-code --audit-only` here and record in `trial.md` its findings, that each is structural, and that it names the notes it skipped as memory or wiki ones. Then run `/improve-code` in a spare workspace and record that it ends at a plan's link with nothing built.

## After the publish

Not a build task, since it needs the published skill: from a clean checkout, run one real `/dream-memory`. Consolidation runs, the dream fact is found by `dream.mjs since`, and the edits match the dry run. This answers memory threads #1185 and #1186; record the result as a fact.
