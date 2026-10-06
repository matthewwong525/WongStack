# Trial runs, 2026-10-06

Three helper runs followed the rebuilt skills as written, before the publish. None changed a file outside its own plan folder, and none wrote to memory.

## `/dream-memory --dry-run`

Run in the build's checkout, bounded to 40 facts per type, 8 own pages, 5 specs, and 10 stale-fact lines read closely. `git status --short` counted 37 lines before and after.

| Surface | What it listed |
|---|---|
| Notes | 17 `improve`, 1 `dream`. Three taken as memory or wiki notes (#1224, #1060, #949); 13 left for `/improve-code`. |
| Wiki | Two edits: `wiki/maintaining/measure-session-speed.md:16` gains *Codex logs only* (evidence `scripts/measure-sessions.mjs:26-27`); `wiki/maintaining/adding-a-skill.md:5-7` moves a paragraph back beside its list. No new fact landed on an own page; #1228 and #1214 were listed for shipped pages. |
| Saved facts | Four corrections: #136 and #297 name `scripts/measure-usage.mjs`, removed in 27.3.0; #639 names a page now at `wiki/maintaining/adding-a-skill.md`; #743, tentative, names `app/src/apps/devices/`. |
| Specs | No mismatch in about 15 statements across five specs. |
| Plans | None stale. |
| Product faults | None. |

What the trial found wrong, and what changed before the publish:

- **`drift` was mostly false alarms**: 6 of 10 lines read were words that only look like paths, proposed work, paths on another branch, or records of a removal. It now lists a path only when this branch's history once held it and the fact does not itself say it was removed. The list here went from 18 lines to 4, keeping the three confirmed ones.
- **`since` read half of a split dream record.** It now joins the parts: 12 checked pages, not 6.
- **The notes search could cut off at 30.** The step now asks for 100.
- **No fallback when a chat was not stored.** The fact is then treated as the assistant's reading.
- **A dry run was unclear about the write gate.** It now says no write-gate command runs.

Left as found, not fixed here:

- `memory.mjs areas <page>` returned the same 20 facts for four different own pages, so comparing a page with its area's facts says little.
- In this source repo every page a new fact belonged on is a shipped page, so a dream here mostly lists and seldom edits.
- A spec's *last checked* is its last commit, so the first five are the least-edited, and five specs hold about 40 requirements.

## `/improve-code --audit-only`

Run in the build's checkout; 37 status lines before and after.

- Loaded 17 `improve` notes, 4 `continue` notes, no `Ruled out:` fact.
- Skipped three as memory or wiki notes and 14 as not structural: agent behaviour, plan sizing, and wording.
- One finding, structural: the release number is written into the branch before the checks run, so a release landing meanwhile voids the checked commit (notes #1198, #318, #341, #395; `VERSION` changed in 248 of 279 commits in 90 days). The deletion test removes a refusal, a conflict rule, and a recovery path together. A normal run would end **planned**.

Changed after it: the skill now says what the `continue` search is for, names how the assistant behaves as a normal request, and allows a plan that answers no note.

## `/improve-code make the routine runner easier to test`

Run in a spare copy at the build's state. Outcome **planned**: change `test-the-routine-worker`, valid under `openspec validate --strict`, review page built. Its first task pins behaviour with a test against the unchanged file; task 3.1 undoes the reshape if the fixture is no shorter. The only path changed was the plan's own folder. `/apply`, `/ship`, and `/save` were never called; the run stopped at the finished-plan question.

Left as found: the method assumes the code can be imported by a test; where it can not, the pin needs test machinery first, and the page does not say what *no simpler* means for a tests-only change.
