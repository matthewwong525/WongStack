# Plans ask until they're clear, go straight from updates, and can publish in one pick

**Status:** ready-to-ship
**Branch:** allow-multiple-choice
**Open questions:** none

## Why

When you ask for a change, the assistant gets one set of questions before it writes the plan. If your answers raise a new question, it has to guess instead of asking, even though answering one more multiple-choice question takes you seconds. And an update from WongStack in an older install can stop halfway to ask *Plan it?* when the update should just go to a plan. And when a plan is ready, publishing it takes two answers even when you already know you want it live.

## What Changes

- **Follow-up questions are allowed.** Before a plan is written, whether you typed a verb or just asked, the assistant may ask another set of questions when your answers open a new choice. Every question stays multiple choice, with the recommended answer first and room for your own words. It still asks only what would make the plan wrong if guessed, never asks the same thing twice, and stops as soon as nothing is left open.
  ```text
     BEFORE               AFTER
  questions           questions
      │                   │
      ▼                   ▼
  answers             answers
      │                   │
      ▼             new choice? ──yes──┐
  guess the rest          │ no         ▼
      │                   ▼       more questions
      ▼                 plan ◀─────────┘
    plan
  ```
- **Updates go straight to a plan.** When an update finds new WongStack changes, it goes directly into planning, with no stop to ask *Plan it?* first. This holds for an older install too, whose own update steps still say to think it through first.
- **Build and publish in one pick.** When a plan is ready, the question under it adds *Build and publish*: the assistant builds the change, checks it, and makes it live with no second stop. *Build it now* stays first and still stops to show you the result before publishing.
  ```text
  What next for this plan?
  ┌───────────────────────────────┐
  │ 1. Build it now (Recommended) │
  │ 2. Build and publish    (new) │
  │ 3. Review the plan            │
  │ 4. Stop here                  │
  └───────────────────────────────┘
  ```
- **The upkeep check asks follow-ups too.** `/improve` may ask a second set of questions before it picks a fix, when your first answers leave a real choice open.
- **Nothing changes when nobody can answer.** An unattended run still takes the recommended answers and marks them as assumed.

Non-goals: no free-text questions in place of choices; no change to the one question about opening new workspaces, or to how review-page notes update a plan.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asking-the-user`: the one-round limit before planning becomes follow-up rounds of multiple-choice questions while a material choice stays open.
- `wong-sync`: an update goes straight into `/plan` with no standalone `/explore` stop, in old installs too; its exploration drops the one-round limit.
- `change-loop`: the stop at a finished plan also offers building and publishing in one go.
- `repository-improvement`: an interactive `/improve` may ask follow-up question groups before selecting.

## Impact

- `.agents/skills/explore/SKILL.md`: *The exit round* and *When `/plan` invokes `/explore`* allow follow-up groups; heading text kept, since installs link `#the-exit-round`.
- `.agents/skills/plan/SKILL.md` *Explore first*: drop "only question round".
- `.agents/skills/wong-sync/SKILL.md`: go straight to `/plan`; drop "the one question round".
- `.agents/skills/wong-sync/references/payload-manifest.md` *Planning an update*: one new handoff line that every sync, however old, reads from the source.
- `.agents/skills/improve/SKILL.md`: follow-up groups before selecting.
- `.agents/skills/explore/references/asking-the-user.md` *End every reply with the next step*: the finished-plan options; `AGENTS.md` (`CLAUDE.md` links to it) rule *A person just asks*; `wiki/development/the-change-loop.md` *Just ask*.
- `wiki/development/the-change-loop.md` *Asking before drafting* and *The steps*.
- `CHANGELOG.md` `## Next (minor)` entry.
- The `perfect-vulture` workspace (PR #187) also edits `plan/SKILL.md` and `asking-the-user.md`, in other paragraphs; whichever merges second rebases.

## Decision log

- **2026-09-28** — Assumed: "immediately go into /plan" means an update never stops at a standalone explore's *Plan it?* question, because today's `/wong-sync` already calls `/plan` while 16.x installs' own skill hands off to `/explore` (memory #382), and the person also asked for more questions, so skipping the questions is not the intent.
- **2026-09-28** — Assumed: old installs are reached through a new line in the payload manifest's *Planning an update*, because every sync reads that page from the source whatever its installed skill says.
- **2026-09-28** — Assumed: follow-up groups still pass the "wrong, not merely different" test and hold no more questions than the tool supports, because the person asked to lift the round limit, not the bar for a question; a standard over a quota matches their earlier choice (memory #52).
- **2026-09-28** — Assumed: `/improve`'s one group before selecting gets the same freedom, because the person said "ship, plan or whatever".
- **2026-09-28** — Assumed: the heading *The exit round* keeps its text, because installed repos link `#the-exit-round` and the link check fails a missing anchor.
- **2026-09-28** — Assumed: one change, not two workspaces, because both parts are small edits to the same few pages about asking before a plan.
- **2026-09-28** — Asked what next for the plan → chose to add a *Build and publish* option to the finished-plan question.
- **2026-09-28** — Assumed: *Build and publish* runs `/ship`, second in the list, with *Build it now* still recommended, because publishing unseen work should be a deliberate pick and the tool holds four options.
- **2026-09-28** — Assumed: prose only, no script, because the behavior lives in skill instructions.
- **2026-09-28** — Assumed: the `AGENTS.md` rule reads "build it now, or build and publish?" and *The exit round* drops a line repeating the assumptions rule, because the build first failed CI's instruction-size check (2206 words against 2200, skill bytes grown).
- **2026-09-28** — Wiki distillation: no repeatable fact beyond `wiki/development/the-change-loop.md`, which this change edits.
- **2026-09-28** — Assumed: merged `main` (26.26.0, review notes can be questions) as the union of both changes, and trimmed wording in `wong-sync`, `plan`, `improve`, and the ask format, because the combined skills ran 104 bytes over the instruction-size check.
- **2026-09-28** — Archive checkpoint: archived by `/ship` and saved for release 26.27.0.
