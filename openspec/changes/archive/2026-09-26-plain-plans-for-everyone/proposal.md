# Plans a non-technical person can read

**Status:** ready-to-ship
**Branch:** explore/plan-non-tech
**Open questions:** none

## Why

Many WongStack users are not engineers, but its plans are written for engineers. The last plan used words such as `isMain` and "delta specs". Its questions ask about "compatibility and migration". A failed check asks "fix or merge anyway?". People must also learn six commands named after git steps. After a plan, nothing tells them where to look. A person who can not read the plan can not really review it, so the review step does not protect them.

## What Changes

- **Plans are written for the person who asked.** Their page in `wiki/people/` has one line that says whether they are technical. When no page says, the plan assumes they are not. For a non-technical reader, the Why, the list of changes, and every question use plain words about what they will see and get. File names, code, and commands go into the design and the tasks, which the review page does not show. An engineer's plan stays as it is today.
- **You just ask; the agent runs the commands.** Say "add a sign-up page" and the agent plans, builds, and publishes it with the same commands as today. It stops twice for your approval:
  ```text
  "add a sign-up page"
         │
         ▼
  plan ──▶ review page
         │
  ◆ Build it now?
         │ yes
         ▼
  build ──▶ preview link
         │
  ◆ Publish it?
         │ yes
         ▼
       live
  ```
  The commands stay as shortcuts. When you type `/ship`, it still does everything with no stops, as today.
- **Every plan ends with a link to its review page.** The last lines of the reply tell you to click the link to see the plan, then ask what to do next:
  ```text
  Plan ready: add a sign-up page
  ──────────────────────────────
  People can make an account
  with their email address.

  Click here to see the plan:
  review.html   ← link

  What next?
  1. Build it now (Recommended)
  2. Change the plan first
  3. Stop here
  ```
  The page builder prints where the page is, so the link always goes to the correct file.
- **Problems are fixed first, then explained as outcomes.** When a check fails, the agent tries to fix it, as it does today. If it still needs you, it says what does not work and what each choice means for you. For example: "The sign-up button does not work on the preview. Fix it first, or publish anyway?" It does not ask you to judge CI results or git terms.

**Non-goals:** No new command and no renamed command. No change to a plan for a person whose page says they are technical. No web address for the review page (that is still an open item). No change to mini apps, which already go live after one question.

## Capabilities

### New Capabilities

- `reader-level`: The person's recorded technical level, the non-technical default, and how plans, questions, and reports use it.

### Modified Capabilities

- `request-routing`: A code change asked for with no command stops at the plan and again before it is published.
- `structured-asks`: Every ask and blocker report names outcomes at the reader's level, not mechanisms.
- `ux-wireframes`: The page builder prints the page's path, and a plan that stops for review ends with a link to it.

## Impact

- Skills: `explore/references/asking-the-user.md`, `plan/SKILL.md`, `plan/scripts/build-review.mjs`, `apply/SKILL.md`, `ship/SKILL.md`.
- Doctrine and docs: the `WONG-STACK` block in `AGENTS.md`, `README.md`, `wiki/development/the-change-loop.md`, `wiki/wiki-style.md` (People), and the proposal rules in `openspec/config.yaml`.
- Tests: `scripts/tests/review.test.mjs`.
- Release: `VERSION` 23.1.0 and a `CHANGELOG.md` entry. No install breaks.

## Decision log

- **2026-09-26** — Asked who the plan and its questions are written for → chose the person asking, with their level read from their people page.
- **2026-09-26** — Asked whether non-technical people must type the commands → chose no: they just ask, and the agent picks the command; the commands stay as shortcuts.
- **2026-09-26** — Asked what a non-technical person sees when a check fails → chose: the agent tries to fix it first, and asks only in outcome terms.
- **2026-09-26** — Asked what to assume when no page records the level → chose non-technical.
- **2026-09-26** — Asked how far the agent goes with no command → chose: stop at the plan review ("build it now?"), then build, return the preview, and ask "publish it?" before the merge.
- **2026-09-26** — Asked where the review link goes → chose the end of the plan reply, with a line that tells people to click it (the user's own request).
- **2026-09-26** — Assumed: the level is one line on the person page, `**Technical level:** technical` or `non-technical`, because that page already holds how the person likes work done.
- **2026-09-26** — Assumed: the agent records the level when the person says it or asks for more or less detail, and never guesses it from one message, because a wrong guess sticks for every later plan.
- **2026-09-26** — Assumed: only the Why, What Changes, questions, and reports follow the reader level; Capabilities, Impact, specs, design, and tasks stay technical, because the review page shows only the first and tools and engineers read the rest.
- **2026-09-26** — Assumed: the two stops apply to every code change asked for with no command, whatever the level, because a person who wants no stops can type `/ship`.
- **2026-09-26** — Assumed: an invoked `/ship` or `/apply` keeps its current authorization, because a change there would break one-go runs.
- **2026-09-26** — Assumed: "publish it?" comes after `/save` returns the CI result and the preview; `/ship`'s walk still runs after the yes, and a failed walk asks in outcome words, because the walk lives inside `/ship`.
- **2026-09-26** — Assumed: the link is a Markdown link to the page's absolute path, because a pull request can not show the page yet.
- **2026-09-26** — Assumed: the link line sits just above the next-step question, because every reply must end with that question.
- **2026-09-26** — Assumed: no people page is seeded in this repo, because the wiki grows from use.
- **2026-09-26** — Assumed: the release is 23.1.0, a minor version, because no existing install breaks.
- **2026-09-26** — Distill: the store held no live facts for this change or branch; no repeatable fact beyond the People rule this change already writes to `wiki/wiki-style.md`.
- **2026-09-26** — Landed all 13 tasks: the reader-level rule in the ask convention, the no-verb two-stop path, the review link after every stopping plan, and the builder's path line (tests pass). Archived; version 23.1.0.
