# Safer building and publishing

**Status:** ready-to-ship
**Branch:** pstack-mattpocock-review
**Open questions:** none

## Why

A comparison with two other skill collections, Matt Pocock's and poteto's pstack, found three small gaps in how a change is built and published. An answer you give in the middle of a build can be lost, nothing warns you when publishing can't be undone, and a failed check gets "fixed" before anyone works out why it failed.

## What Changes

- **Your mid-build answer is kept.** When the build stops to ask you something, your answer is written into the plan before the build carries on. Today the next builder starts fresh from the plan and may ask again or guess.
  ```text
  build stops with a question
            │
            ▼
       you answer
            │
            ▼
   answer written to the plan
            │
            ▼
   a fresh builder reads the plan
  ```
- **You are told when publishing can't be undone.** A plan that deletes or reshapes data, sends a message, or removes a key says so in one plain line, and the report above *publish it?* repeats it. A change that can simply be reversed stays silent.
- **A failed check is understood before it is fixed.** The assistant first lists every failing check and what its log shows, then fixes them together in one go. A failure this change didn't cause is run again once and, if it still fails, reported to you rather than patched.

Non-goals: a check for a missing release note, reading reviewer comments before publishing, any edit to `/continue`, a second helper that reviews the build (the live verify work covers it), and a script that checks saved chats for skipped steps.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `apply`: a mid-build answer is recorded in the plan before the next helper starts; the publish question names what can't be undone.
- `delivery-gate`: the repair loop diagnoses every failing check before the first fix and does not edit code for a failure the change did not cause.

## Impact

- `.agents/skills/apply/SKILL.md`: the question stop and the report step.
- `.agents/skills/plan/SKILL.md`: one clause so the proposal names what can't be undone.
- `.agents/skills/save/references/git-gate.md`: the auto-fix loop's opening.
- Offsetting trims inside those same files, so `node scripts/measure-context.mjs --check` still passes (114 bytes were spare on 2026-10-04).
- `CHANGELOG.md`: a `## Next (minor)` entry; no hand step for installs.
- Wording only: no script, app, dependency, or account change. Hosted workspaces deliver by their own steps and are untouched.

## Decision log

- **2026-10-04** — Asked which improvements to plan → chose to drop the release-note check and the reviewer-comment check, since work is moving to Artifacts; doubted `/continue` stays useful; noted live verify is planned in another workspace.
- **2026-10-04** — Asked what to plan from what's left → chose the three wording fixes: kept answers, the can't-be-undone line, and understanding a failed check first.
- **2026-10-04** — Assumed: the can't-be-undone line is written in the plan and repeated in the build report, because a person who picks *Build and publish* sees only the plan before it goes live.
- **2026-10-04** — Assumed: the failed-check fix covers GitHub repos only, because `hosted-delivery.md` has no repair loop of its own to change.
- **2026-10-04** — Assumed: a failure the change didn't cause gets one re-run and then a report, because editing code the change never touched widens the change without the person's say.
- **2026-10-04** — Assumed: the offsetting trims come from the three edited files, because the person asked that `/continue` stay untouched and two changes trimming other files could collide.
- **2026-10-04** — Assumed: no behaviour test, because these are instruction wording and the repo's rule gives a prose-only change no coverage task; whether assistants follow the new lines stays unverified until real use.
- **2026-10-04** — Assumed: a minor release, because the skills gain new behaviour without breaking how they are called.

- **2026-10-04** — Asked what next for the finished plan → chose to build and publish.
- **2026-10-04** — Archive checkpoint: built all five tasks. Paid for the new lines with trims in the three edited files only; the instruction inventory stays under its limit. One line added beyond the plan: the question stop links the `Asked` line's format in `/plan`. Whether assistants follow the new lines is unverified until real use.
