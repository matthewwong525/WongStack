# Design

## Context

See proposal.md for why. What shapes the approach:

- `.agents/skills/improve/SKILL.md` is a 19-line outcome brief that ships one change through `/ship` with no question. It is counted in the skills' instruction total, which sits 22 bytes under its cap ([`measure-context.mjs --check`](../../../scripts/measure-context.mjs)). `.agents/skills/dream/SKILL.md` is `disable-model-invocation: true`, counted apart as `on-call`; its how-to already lives on [`wiki/development/wiki-dream.md`](../../../wiki/development/wiki-dream.md).
- `/improve` has been redesigned four times. A fixed survey, rotation, and playbooks were removed on purpose on 2026-09-30; this design adds none back.
- No real `/dream` has run (memory thread #1186): only a dry run that skipped the consolidation step.
- A routine runs a verb by reading `.agents/skills/<name>/SKILL.md` ([`scripts/routine-runner/run.mjs`](../../../scripts/routine-runner/run.mjs), `skillPromptOf`), so a folder rename breaks a stored prompt unless the runner maps the old name.
- Memory facts are append-only: a fact is corrected by a newer fact that supersedes it.

## Goals / Non-Goals

**Goals:** the two renames with every surface that names them; the narrower `/improve-code` brief that ends at a plan; `/dream-memory` reading specs and plans and correcting stale facts; old names working in routines.

**Non-Goals:** a scheduled dream; a model-free dream; a typed alias for the old commands; renaming the `repository-improvement` and `wiki-dream` capabilities or their wiki pages' files; changing how struggle notes are captured.

## Decisions

1. **Rename the folders; keep the memory tags.** `.agents/skills/improve-code/` and `.agents/skills/dream-memory/`. The tags `improve` and `dream`, the `wiki-dream` slug in `dream.mjs`, and the `improve` and `dream` keys in `areas.json` stay, so open notes, the last-dream record, and area lookups carry over with no migration. `dream.mjs` keeps its file name. *Alternative:* rename tags too; rejected, since it orphans about 17 open notes for no gain a person sees.
2. **Old names map in the routine runner only.** `run.mjs` holds a small `RENAMED` map (`improve → improve-code`, `dream → dream-memory`) applied in `verbOf`; `routine.mjs`'s default name and `measure-sessions.mjs`'s verb pattern accept both. No stub skill folders: a stub costs instruction bytes, ships to every install, and `check-retired-names.mjs` exists to stop exactly that. A person who types the old name sees it is gone; the changelog's **Updating.** note names the new ones.
3. **Capability and page paths stay; titles change.** `wiki-dream.md` is retitled *Memory dream* and `repository-improvement.md` *Code improvement*. Installed repos link these pages and their headings ([`check-payload-links.mjs`](../../../scripts/check-payload-links.mjs)); keep every linked heading's exact text, and add new headings for new material.
4. **`dream.mjs` does what follows a rule.** A new read-only `drift` command prints three lists, `--json` too:
   - `fact`: live facts whose words name a repo path that no longer exists (reuse the path matcher memory's upkeep uses for area re-tagging).
   - `plan`: active changes with every task ticked, or whose folder has had no commit for 30 days (from `openspec list --json` and `git log -1`).
   - `spec`: `openspec/specs/*/spec.md`, longest unchecked first, last checked taken as `pages` takes it. Shown as extra `spec` rows in `pages` rather than a second ordering.
   The model does what takes judgment: whether a spec, a page, a fact, and the code agree.
5. **A dream's reach, by surface.** Own wiki pages: edited. Saved facts: superseded through memory's write gate, after reading the repo and, for a quoted person, `memory.mjs source`. Specs, active plans, archives, shipped pages: read only. Each pass checks the first twenty own pages (as today), the first five `spec` rows, and all of `drift`'s `fact` and `plan` lines; the limits are stated in the skill so a first run on a large install stays bounded.
6. **Where a dream's lists go.** Wrong specs, stale plans, and shipped-page mismatches: the report, plus one `thread` tagged `dream` (an area tag, already valid) that the next dream loads and re-checks, so an approved fix closes it. A product fault: one `thread` tagged `improve`. Today's step 9 tags the shipped-page list `improve`; that moves to `dream`, because `/improve-code` no longer acts on it.
7. **Both skills read the `improve` notes; each takes its own kind.** Capture stays as it is, with no routing judgment added to the cheap background run. `/improve-code` skips a note about memory or the wiki; `/dream-memory` skips one about code. *Alternative:* a second struggle tag chosen at capture; rejected, because the 2026-10-04 dry run showed capture wording is fragile.
8. **`/improve-code` stays a brief.** The skill file states scope, the notes-first rule, the three outcomes (clean, planned, blocked), `--audit-only`, and the hand-off: one selected problem with its evidence, intended result, scope, and verification goes to [`/plan`](../../../.agents/skills/plan/SKILL.md), and the run ends on the finished-plan question like any plan. It never runs `/apply` or `/ship`. Unattended, it then runs `/save` so the plan waits on its own branch, records a `thread` tagged `continue` naming the change, and stops. The method lives on `repository-improvement.md`, linked from the skill, as short sections the model reads when it needs them:
   - *Where to look*: open notes, then files changed most in the last 90 days (`git log --since="90 days ago" --name-only --format=`), then friction met while reading.
   - *The deletion test*: delete the piece in your head; if the complexity vanishes it was a pass-through, if it reappears in each caller it earns its keep.
   - *Pin, then reshape*: the plan's first task is a test that passes before and after; a type check or lint is not a pin; replace tests the old shape needed, don't stack new ones on top.
   - *Undo what is not simpler*: the plan's last build task compares before and after, and a result no simpler is reverted and recorded as ruled out.
   - *Remember a no*: a `project` fact tagged `improve` whose body starts `Ruled out:`, loaded with the notes; written for an idea the run rejected and for a plan the person dropped.
   - *A note closes at publish*: the plan names the note it answers, so the save that publishes it supersedes the note.
   No vocabulary list, checklist, or report template: those are what the 2026-09-30 redesign removed.
9. **Pay for the words.** `improve-code/SKILL.md` must end no larger than `improve/SKILL.md` is now, net of the longer name at each mention in instruction files (`routine/SKILL.md`, `close/SKILL.md` if it names it). Cuts come from the brief's own sentences that the wiki page now owns. `dream-memory/SKILL.md` is on-call; still rerun the check and update the baseline's file keys.
10. **Attribution.** `repository-improvement.md` already credits Matt Pocock's two skills; add poteto's pstack ([cursor/plugins, `pstack/`](https://github.com/cursor/plugins/tree/main/pstack)) there and on `wiki-dream.md`, naming the ideas taken. Ideas only, no text copied, so no license file is carried.
11. **Release level: major.** Two typed commands change name.

## Risks / Trade-offs

- [A wider dream costs more model time] → stated limits per pass; `--dry-run` first; the report says what it skipped.
- [Superseding a fact wrongly hides a true one] → the repo must contradict it, the source is read for a quote, the old fact stays searchable, and a dry run lists each correction.
- [Plans pile up unread from a weekly schedule] → a run that finds its own earlier plan still waiting reports blocked, naming it, and writes no second one.
- [A typed `/improve` no longer works] → the changelog's Updating note; routines are unaffected.
- [`check-retired-names.mjs` matching `/improve` inside `/improve-code`] → retire the path forms (`skills/improve/`, `skills/dream/`) and the backticked commands (`` `/improve` ``, `` `/dream` ``), with an allow for `openspec/specs/cloud-routines/spec.md` and `openspec/specs/multi-part-workspaces/spec.md`, whose scenarios describe old-name routines that still run.
- [A routine's memory key reads shared notes only (thread #1185)] → unchanged; scheduling a dream stays a follow-up.
- [An earlier research-led rewrite showed no measured gain (sharpen-explore, 2026-10-04)] → acceptance here is a real run of each skill, not wording alone.

## Migration Plan

`/wong-sync` copies the new folders and drops the old by the payload inventory; confirm with the sync test that a renamed `skillDirs` entry removes the old folder from a target. Rollback is reverting the one merge: tags and facts were never renamed.

## Open Questions

- How long the runner keeps the old-name map. It costs two lines; revisit at a later major.
