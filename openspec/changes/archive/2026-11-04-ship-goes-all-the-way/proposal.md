# Ship goes all the way

**Status:** ready-to-ship
**Branch:** ship-finish-without-asking
**Open questions:** none

## Why

When you say *ship*, you already chose to publish. But in the last 30 days, ship chats stopped 59 times to ask you something, and most of those questions had a safe answer the agent already recommended: where a button goes, how to make room under a size limit, whether to leave other plans alone, whether to fix an old test. Each stop holds the publish until you come back. Ship should finish by itself and stop only for the things that really need you.

## What Changes

- **Ship goes with its own best answer.** When a question comes up while ship builds, saves, checks or publishes, and the agent has a recommended answer that stays inside the work and can be undone, it takes that answer and keeps going. It does not stop to ask.
  ```mermaid
  flowchart LR
    q[question] --> safe{"safe?"}
    safe -->|yes| take[take it, note it]
    safe -->|no| ask[ask you]
  ```
  Real stops from the last 30 days, and what happens now:
  | The question | Now |
  |---|---|
  | Where should the four Email controls go? | takes *Add /email commands now* |
  | Skills run 70 words over their size limit. How to make room? | takes *Trim other skills* |
  | Two other plans are open, and main already has them. Go on? | no question: they are not part of this publish |
  | An old calendar test fails every Saturday. What to do? | takes *Fix the test here* |
  | A repeat forward could refund twice. What should a repeat do? | takes *Refuse the repeat* |
  | May I sign in to Apple with your saved login? | still asks |
  | Approve the server in Tailscale. Is it done? | still asks |
  | Run the live check that makes real Klaviyo drafts? | still asks |

- **Ship still stops for what only you can do or decide.** It asks before it uses a key, signs in, or changes who has access; spends money; sends, posts, or changes a business record or real data; deletes something that is not in the change; accepts terms; turns a check off or makes it weaker; and when something is still broken after two fixes, or there is no clear best answer.
- **You see every choice it made.** The ship report gets a *Choices I made* list, one plain line each, and the plan's record keeps them. To change one, say so after: it is one more small change.
- **Plans that are not part of this publish never stop it.** Plans that main already has are left alone with no question. A second plan that only this branch carries moves to its own saved branch, so it is kept but not published.
- **A failed check on the preview gets one fix first.** Today ship asks *fix it first, or publish anyway?*. Now it fixes the problem once, saves, and checks again. Only if it still fails does it ask.
- **An old test that breaks for its own reason gets one fix.** When a check fails in code this change never touched, ship (not a plain save) fixes it once in the same change, if the fix keeps the check as strong. Otherwise it stops as today.

Non-goals: `/apply`, `/save` and `/verify` typed on their own still ask as today. The question after the publish (close this chat, the next part) stays. A chat with no one at the keyboard keeps its own rule.

## Capabilities

### New Capabilities

### Modified Capabilities
- `change-loop`: one rule decides fix or ask, and inside `/ship` a safe recommended answer is taken, noted and reported instead of asked.
- `asking-the-user`: the recommended options are also taken inside `/ship` for safe picks, not only where nobody can answer.
- `delivery-gate`: other active changes stop `/ship` only when the branch adds them, and move off by one command; a walk `FAILURE` gets one fix before the ask; inside `/ship` a failure the change did not cause gets one fix.

## Impact

- `wiki/development/the-change-loop.md` (*Fix it or ask*: a new *Inside /ship* part that owns the rule), `.agents/skills/ship/SKILL.md`, `.agents/skills/explore/references/asking-the-user.md`, `.agents/skills/apply/SKILL.md` and `references/build-helper.md`, `.agents/skills/save/references/git-gate.md`, `.agents/skills/verify/references/walkthrough.md`.
- `.agents/skills/ship/scripts/ship.mjs` (`prepare`: other changes only from the branch diff; new `--move-others`), `scripts/tests/ship-commands.test.mjs`.
- Skill text must stay under the size budget (`scripts/measure-context.mjs --check`): each added line needs a cut.
- `CHANGELOG.md`: a minor entry; installs have nothing to do.

## Decision log

- **2026-11-04** — Asked how to make `/ship` finish without stopping → Matthew said it should ask only for critical things and otherwise go all the way through, above all when a plan already says what to do.
- **2026-11-04** — Assumed: "safe" is the daily check-in's *obvious pick* (inside the work, can be undone), plus the fix-or-ask rule's hard stops, because both rules already exist and a third definition would go stale.
- **2026-11-04** — Assumed: a business fact only Matthew knows (for example, whether every kit has an insert card) is also taken from the recommendation when the answer can be undone, and listed under *Choices I made*, because he asked for only critical stops and the list lets him correct it.
- **2026-11-04** — Assumed: the rule covers only `/ship` and the steps it runs; a plain `/apply` or `/save` still asks, because he asked about ship and a build without publishing is where he reviews choices.
- **2026-11-04** — Assumed: inside `/ship`, a failure outside the change gets one fix that keeps the check as strong, because the real recommendation in that case (the Saturday calendar test) was *fix the test here*.
- **2026-11-04** — Assumed: the closing question after a publish stays, because it comes after the work is done and the one-task-one-workspace rule owns it.
- **2026-11-04** — Assumed: `--move-others` writes the new branch into the moved plan's `**Branch:**` line, and puts a plan that main already holds back to main's copy instead of deleting it, because the plan must be found again from its own branch and a delete would remove main's plan in the merge.
- **2026-11-04** — Assumed: to stay in the size budget, the cuts are restated lines in `/ship`, `/apply` and `/save` (the scheduled-record refusal the script enforces, the changelog numbering reason, the report's ask-only list, the boundaries' links) and wordy lines on the change-loop page, because each rule still has its owner.
- **2026-11-04** — Assumed: the kept-checks and staging-walkthrough pages and the plan-first and safe-changes attachments get the one-fix wording too, because they said a failed walk asks at once and the attachment check requires them to follow their sources.
- **2026-11-04** — Assumed: fix the date-bound daily journal test (`daily-journal.test.mjs`), because it failed from 2026-11-04 and would block this publish. Main fixed it the same way first (45.9.0), so the merge kept main's copy.
- **2026-11-04** — Assumed: Step 4's one fix hands `/apply` the archived change's path (`prepare`'s `ARCHIVE`) with the failing scenarios, and `/apply` given an archive path inside `/ship` fixes that archived change with no `/plan` and no new change, logging in the archived proposal's Decision log; the second `/save` takes Step 3's same `CHANGE` and `ARCHIVE`, because by then the change is archived and committed, so a plain request would start a new plan that the merge carries into main unarchived.
- **2026-11-04** — Assumed: `--move-others` prints `MOVED=` for each push as it works, and reuses a remote branch whose head already holds exactly the change folder, because a later failed push otherwise hid the first branch and a rerun pushed a duplicate `-plan` copy.
- **2026-11-04** — Assumed: to fit the size budget for these fixes, `/ship` Step 2's no-selection line defers to `prepare`'s `NEXT:` (which already names the route table) and Step 5 drops restated detail of what `finish` does, because the script owns both.
- **2026-11-04** — Assumed: after the second review, `/apply` on an archive path inside `/ship` skips the status check and adds the failures as one task in the archive's `tasks.md`, and the second walk takes the fix-round save's receipt, because an archived change has every task ticked and no status, so the fix round would build nothing.
- **2026-11-04** — Archived at ship as 45.11.0, after main's 45.9.0 and 45.10.0 merged in; local checks pass; saved on `ship-finish-without-asking`.
- **2026-11-04** — Numbered again as 45.11.0 from 45.10.1 after main's 45.10.1 took the base; local checks pass after one rerun of a slow app test (`Welcome.test.tsx`, 5,089 ms on a 5,000 ms limit).
- **2026-11-04** — Numbered again as 46.1.0 from 46.0.0 after main's 46.0.0 took the base; local checks pass. The CI rerun of the known `hand-over.test.mjs` timing flake passed.
