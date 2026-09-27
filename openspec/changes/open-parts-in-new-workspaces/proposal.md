# Open each part of a request in its own workspace

**Status:** ready-to-ship
**Branch:** plan-multi-part-paseo-workspaces
**Open questions:** none

## Why

When you ask for several separate things at once, the assistant works through them one after another in the same chat. Each part needs its own plan, review, and publish, so they tangle: a second plan waits beside a first change that isn't published yet, and you end up asking "is this two changes in one?" Paseo can open a fresh workspace for each part, so every part gets its own place, its own plan, and its own publish.

## What Changes

- **Several parts: one question, then a workspace each.** When a request holds parts that could each be published on its own, the assistant lists them and asks once. On yes, it does the first part here and opens a new Paseo workspace for each of the others.
  ```text
  This is 3 separate parts:
   A. Shorter instructions
   B. Thinner specs
   C. A help page

  What next?
  1. Do A here, open new
     workspaces for B and C
     (Recommended)
  2. Do them here, one at a time
  3. Keep them as one change
  ```
- **Each new workspace plans its part, then waits for you.** It appears in Paseo beside this one, named after its part. It starts knowing what you said here about that part, writes its plan, and stops at the review link with *build it now?* You carry on there, as with any request.
  ```text
  you: do A, B, and C
     │
     ▼
  this chat asks once
     │ yes
     ├──▶ this workspace:
     │      plans A
     ├──▶ new workspace:
     │      plans B, waits
     └──▶ new workspace:
            plans C, waits
  ```
- **A part that builds on another doesn't wait.** If B needs A, B's workspace still opens now. It is told that A is being built or is about to publish, and plans on top of it. Whichever part publishes second catches up then, as it does today.
- **The next piece of work is one choice away.** When a part is published and more work you asked for is left, the closing question offers to open it in a new workspace. The same offer appears when you ask for something new, or pick up saved work, in a workspace that is still holding an unpublished change.
  ```text
  It's live.

  What next?
  1. Open a new workspace for
     "Thinner specs"
     (Recommended)
  2. Stop here
  ```
- **The same settings as this chat.** A new workspace uses the same AI model and permission setting as the chat that opened it, and starts from the latest published version, not from this workspace's unpublished work.
- **Without Paseo, nothing changes.** The parts are done one at a time in this chat, as now. A scheduled run with nobody watching never opens a workspace: it does the first part and notes the rest.

Non-goals: new workspaces never build or publish on their own; no dashboard that tracks the parts; a one-part request works exactly as today; small steps of one change are never split out.

## Capabilities

### New Capabilities

- `multi-part-workspaces`: splitting a request into separately publishable parts, the one ask before opening Paseo workspaces, what each new workspace starts with, the next-work offer, and the fallbacks without Paseo or without a person.

### Modified Capabilities

None.

## Impact

- `.agents/skills/routine/scripts/workspace.mjs` (new): the one Paseo call that opens a workspace with a new agent.
- `.agents/skills/routine/scripts/lib/paseo.mjs` (new): the Paseo lookup, JSON call, and exit codes, shared with `routine.mjs`.
- `.agents/skills/plan/references/new-workspace.md` (new): what counts as a part, the ask, the brief, and the report.
- `.agents/skills/explore/SKILL.md`: the exit round carries the split question.
- `.agents/skills/plan/SKILL.md`: opens the workspaces after a yes and plans only the part it keeps.
- `.agents/skills/ship/SKILL.md`: the closing question offers the next work in a new workspace.
- `.agents/skills/continue/SKILL.md`: offers a new workspace instead of switching branches when this one holds other unpublished work.
- `.agents/skills/explore/references/asking-the-user.md`: one next-step bullet.
- `wiki/development/the-change-loop.md`: a new `### Several parts, several workspaces` section owns the rule.
- `wiki/development/required-tools.md` and `README.md`: Paseo is optional for schedules and for new workspaces.
- `.agents/skills/wong-sync/references/payload-manifest.md`: the routine skill ships its scripts, plural.
- `scripts/tests/workspace.test.mjs` (new), and `scripts/tests/routine.test.mjs` still passes on the shared lib.
- `VERSION` minor bump and a `CHANGELOG.md` entry.

## Decision log

- **2026-09-27** — Asked when a request has several separate parts, what the current chat should do → chose do the first part here and open a new workspace for each of the rest.
- **2026-09-27** — Asked what each new workspace should do when it opens → chose plan its part, then wait at the review link.
- **2026-09-27** — Asked when a part that needs another part published first should open → chose not to wait: its workspace opens now and is told the other part is being built or about to publish; what matters is a multiple-choice question asking whether to open a new workspace for the next work.
- **2026-09-27** — Asked whether the chat should ask before opening new workspaces → chose ask once, listing the parts.
- **2026-09-27** — Assumed: a part is work that could be planned and published on its own; the steps of one change never split, and when unsure it stays one change, because each part costs its own review and publish.
- **2026-09-27** — Assumed: the split question rides in `/explore`'s exit round, because that is the one question round before a plan, and the answer decides what this plan covers.
- **2026-09-27** — Assumed: the same offer appears when a new change is asked for in a workspace holding another unpublished change, and in `/continue` when switching branches would leave other unpublished work, because that is where the old flow parked a plan on a side branch.
- **2026-09-27** — Assumed: after `/ship`, when this conversation or a memory thread names more work, the closing question offers to open it in a new workspace, recommended, beside *stop here*, because the user asked for that choice to continue on the next work.
- **2026-09-27** — Assumed: the new agent copies the calling agent's provider, model, thinking, and mode, read with `paseo inspect`; outside a Paseo agent it takes Paseo's default model and `/routine`'s full-permission mode, because a part should run like the chat that opened it.
- **2026-09-27** — Assumed: the new agent stands alone, not as this chat's sub-agent, because `paseo run` makes a sub-agent whenever `PASEO_AGENT_ID` is set, and the person works in the new workspace on its own.
- **2026-09-27** — Assumed: each workspace branches from the remote default branch after a fetch, created from the primary worktree, and Paseo names the branch, because a part starts from the latest published version and `/save` records whatever branch it gets.
- **2026-09-27** — Assumed: the new agent's first message is `/plan` followed by a brief with the part in the person's words, the settled answers, the other parts and where they are, and what it builds on, because it starts with no conversation.
- **2026-09-27** — Assumed: the script lives beside `routine.mjs` and shares a Paseo lib with it, and the how lives in `plan/references/new-workspace.md`, because `/routine` is already WongStack's one door to Paseo and the reference then loads only when parts exist.
- **2026-09-27** — Assumed: no new rule in the always-loaded `WONG-STACK` block, because every request that becomes a change passes through `/explore`'s exit round, where the rule loads.
- **2026-09-27** — Assumed: an unattended run never opens a workspace, and without Paseo the question offers only the other choices, because a new agent with nobody to answer waits and spends usage.
- **2026-09-27** — Assumed: this replaces the 2026-08-02 preference for one branch, one PR, and one version when several changes are ready together, because the user now wants each part separate; the part published second takes the next version at publish, as `/ship`'s conflict step already does.
- **2026-09-27** — Assumed: a minor release, 25.12.0 on today's main (25.11.0), because it changes how the payload's verbs behave; open PRs #150, #151, and #153 may publish first, so the number is settled at publish.
- **2026-09-27** — Built: `routine/scripts/workspace.mjs` opens a workspace through `paseo run`, and `routine/scripts/lib/paseo.mjs` now holds the Paseo lookup, call, and exit codes for both scripts. `routine.test.mjs` passed unchanged; `workspace.test.mjs` adds 16 tests. The rule is the change-loop section *Several parts, several workspaces*, and `plan/references/new-workspace.md` is the runbook, linked from `/explore`, `/plan`, `/continue`, `/ship`, and the next-step list.
- **2026-09-27** — Built: one real run on this host opened workspace `precious-monkey` from `origin/main` (58cdfdc, the latest), with this chat's model (`claude-opus-5-5`), thinking (`xhigh`), and mode (`bypassPermissions`), no parent agent, and `.env` seeded by setup. Its agent answered the brief. Archiving the workspace removed the worktree and agent but left an empty local branch, deleted by hand.
- **2026-09-27** — Assumed: a missing `Created workspace` line is a warning, not exit 5, because the agent is already open by then, and a failure report would send the person to open a second one by hand.
- **2026-09-27** — Assumed: `/continue` also recommends a new workspace when the tree is clean but this branch carries another active change, because switching would move this workspace away from that change.
- **2026-09-27** — Assumed: release 25.14.0, because main reached 25.13.0 (#150, #152, #153) during this build.
- **2026-09-27** — Saved: every task but the CI check is done; lint, link, retired-name, and config checks and 362 script tests pass locally. The branch predates main's 25.11.0 to 25.13.0, so `VERSION` and `CHANGELOG.md` will conflict and are merged at publish.
- **2026-09-27** — CI passed on PR #154 (build, payload, and test checks), so every task is done.
