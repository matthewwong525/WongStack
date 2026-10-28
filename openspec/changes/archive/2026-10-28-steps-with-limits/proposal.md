# Each step says what it may change

**Status:** ready-to-ship
**Branch:** enforce-workflow-state-restrictions
**Open questions:** none

## Why

Explore, plan, apply and ship are meant to be steps, but what each may change is scattered or unstated. Explore is also told not to run code, so it plans before it tries anything, when you want it to test first and come back with results.

## What Changes

- **Each step says what it may change, and every chat starts in plan.** Every step may read, research, run the repo's tests and scripts, and try things in a throwaway folder. What it may change in the repo differs:
  | Step | May change in the repo |
  |---|---|
  | explore | nothing |
  | plan, where every chat starts (also `/improve-code`) | plans, wiki pages and schedules |
  | apply, ship, and any other step you type | everything |
- **Only you move a chat past plan.** Plan can still note things in the wiki and save a reminder you ask for; only code waits for you. Code changes start when you type the step, tap *Build it* or *Build and publish* on a plan's page, or pick build or publish when the agent asks.
  ```mermaid
  flowchart TD
    explore --> plan
    plan -->|"you: Build it"| apply
    plan -->|"you: Build and publish"| ship
    apply -->|"you: publish it"| ship
  ```
- **Explore goes and tries things.** Ask it to test something and it runs the code and comes back with results, then offers a plan. A try that needs new code goes in the throwaway folder, never in the repo. The same holds with no step named: *go test X* is research, done before any plan.

Non-goals: these are written rules the agent follows; nothing blocks an edit. Apply and ship keep their split (apply builds and shows a preview with no pull request; ship makes the one pull request, runs CI once, checks the preview and merges).

## Capabilities

### New Capabilities

### Modified Capabilities
- `change-loop`: every chat starts in plan; what each step may change; only the person moves a chat past plan; trying things is research.
- `asking-the-user`: standalone explore changes no repo file, in place of writing no file; throwaway files in `.scratch/` are allowed.
- `ux-wireframes`: explore's drawing in chat changes no repo file, in place of writing no file.

## Impact

- `.agents/skills/explore/SKILL.md` (description included): run things, change no repo file.
- `.agents/skills/plan/SKILL.md`: plan changes only plans, wiki pages and `schedules/`; a code change waits for the person's go.
- `wiki/development/the-change-loop.md`: a section that owns the steps' table and who moves a chat past plan; *Just ask* says trying things is research.
- `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-10-28** — Asked whether to loosen explore only, add enforced steps only, or both → chose both.
- **2026-10-28** — Asked how apply and ship should split (keep as is, or open the pull request in apply) → answered instead that ship means going all the way with full permission; the split is kept, because moving the pull request into apply would add a second CI run, not save one.
- **2026-10-28** — Assumed: the full check of the preview stays in ship, not apply, as the person left it to this judgment, because that check runs on the exact saved code that merges, and saving means a pull request and a CI run; apply already has a second agent review the build and shows screens from its own preview.
- **2026-10-28** — Asked (in the person's own message) for plan as the default step: it may still do things but changes no code without explicit approval.
- **2026-10-28** — Asked, after weighing whether enforcement is needed (memory holds no case of an agent editing in explore or building unasked), how far to go now: wording only, wording plus a watch-only check, or full enforcement → chose wording only.
- **2026-10-28** — Assumed: plan may also change wiki pages, because the person's message limits code changes, and the rule to write repeatable knowledge when you learn it (and a *remember this* request) needs wiki edits before any build.
- **2026-10-28** — Assumed: throwaway tries go in the repo's git-ignored `.scratch/` folder, because the change loop already names it the place for scratch files, not the system temp folder.
- **2026-10-28** — Assumed: this is a `minor` release, because explore running code is new behavior every install gets.
- **2026-10-28** — Asked to keep only what addresses a problem the person has, and remove the rest → dropped the enforcement design, the follow-up and after-merge step rules, and the agent's own move from explore to plan, which mattered only with tracked steps; kept the steps' table (the steps felt undefined), plan as the start with build waiting for the person (asked for), and explore trying things (it planned before testing).
- **2026-10-28** — Assumed: the build offsets its added text by cutting lines another page already owns, because the skill-text budget had 111 bytes of headroom, the named-secret save route 33, and the change loop page sat near its 3,000-word cap. Cut from `.agents/skills/explore/SKILL.md`: the 80/20 repeat on cheap concerns, the other-work script's output line and *skip if checked*, the reopen clause repeated in the exit round, *`/plan` never repeats searches*, and *a request with no verb starts at `/plan`* (`AGENTS.md` owns it). Cut from `wiki/development/the-change-loop.md`: the plain-words sentence in *Just ask* (`AGENTS.md` owns it), *the work decides the form*, *missing bases run conservatively* (`checks.mjs` owns it), *which `/save` can give*, the `/plan` bullet's *with no git* and explore's *always runs* (both said above), GitHub Actions' list of what it accelerates, and the `/save` half of *Loop back* (the living-handoff section owns it); the `/apply` vs `/continue` section went, since the `/continue` bullet already says it, and its add-a-step line moved into the new section.
- **2026-10-28** — Checked: a throwaway chat given `/explore find out how long node --test scripts/tests/ask-check.test.mjs takes` ran the test three times and reported about 0.7–0.8 s with no plan; the repo's changed-file list was the same before and after.
- **2026-10-28** — Assumed: plan may also save schedules, because a plain reminder request is done directly and saves one, and the person limited only code changes before their go.
- **2026-10-28** — Assumed: the review fixes offset their added text by cutting lines another page owns, because the skill-text budget had 12 bytes of headroom and the change loop page 4 words. Cut from `.agents/skills/plan/SKILL.md`: *required* and *the offline* before the review page (its build and *Finish* own both). Cut from `wiki/development/the-change-loop.md`: `/schedule`'s *which uses the available host* ([host schedules](../../../wiki/stack/host-schedules.md) owns it, now linked from the steps' table).
- **2026-10-28** — Archived to publish as 44.20.0 with main merged in; every task done. The local re-run after the merge didn't start, because another chat's checks held the turn past 600 seconds, so CI decides.
