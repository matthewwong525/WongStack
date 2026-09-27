# Smoother publishing, with no dead ends

**Status:** ready-to-ship
**Branch:** explore-recent-changes
**Open questions:** none

## Why

The last twenty releases changed how work gets built and published, and some steps no longer fit together. Publishing from the main copy saves twice and runs the checks twice. A wiki note from a plain request is never saved. A typed `/explore` jumps into planning. Resuming saved work can start building on the wrong branch. Almost every save shows a second plan link. You want the loop to do what it says, with no extra waits and no work left behind.

## What Changes

- **Publishing saves once, from anywhere.** When you say *publish it* while working on the main copy, it saves once and runs the checks once. Today it saves, checks, and then does both again.
  ```text
  Before              After
  ──────────────      ──────────────
  publish it?         publish it?
    │                   │
  save + checks       file the plan
    │                   │
  file the plan       save + checks
    │                   │
  save + checks       go live
    │
  go live
  ```
- **Publishing code with no plan writes the plan instead of stopping.** It writes the plan from the work and carries on, the same way saving already does.
- **Every finished edit asks *publish it?*.** That covers a note the assistant writes to the wiki from a plain request, and a change that doesn't touch the app. Today the wiki guide says those just end with a report. The note is left unsaved, and it later blocks picking up other work.
- **Typing `/explore` ends with a question, not a plan.** When the thinking is done, it asks *Plan it (Recommended)*, *Keep thinking*, or *Stop*. It still moves straight into planning when a plan asked it to explore.
- **Resuming work never builds on the wrong branch.** When saved work can't be opened here, `/continue` shows where things stand and stops. It no longer starts building anyway.
- **One plan link, only when the plan changed.** A save prints the plan's link when it changed what the plan says or its checklist. It no longer prints it for its own record-keeping. The plan link also no longer counts against the one-link limit on reports.
- **Starting new work where other work is unpublished gets its own choice:** open it in a new workspace (recommended), or publish what's here first.
- **Smaller fixes:**
  - The building helper stays on the right plan store.
  - The rule for asking questions stops saying building always leads to a save.
  - The written rules now allow the *Review the plan* fourth choice and its reply with no question, and say that notes from the review page skip exploring.

Non-goals: no change to release numbering, stale wiki pages, or the automatic checks. Two other workspaces cover those.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asking-the-user`: the fourth *Review the plan* option is allowed; its reply ends with no question; the plan's link prints only when a plan's content or checklist changed, and does not count toward the one-link report limit; review notes skip the explore pass; standalone `/explore` ends with a next-step question and never starts `/plan` itself.
- `change-loop`: a plain request that edited a repo file ends by asking whether to publish.
- `delivery-gate`: `/ship` on a dirty default branch saves only once, after the archive; `/ship` on code with no change authors one instead of stopping.
- `openspec-workflow`: `/continue` that cannot check out the change's branch recaps and stops, and never builds.

## Impact

- `.agents/skills/ship/SKILL.md`: Step 1's dirty-default-branch bullet; Step 2's no-change rung; the distillation's `--branch` search on the default branch.
- `.agents/skills/save/SKILL.md` §5: when the plan link prints.
- `.agents/skills/explore/SKILL.md`: exit round's handoff; the "always runs" line. `explore/references/asking-the-user.md`: one-link exemption, the handoff list, the finished-exploration next step.
- `.agents/skills/continue/SKILL.md` §3–4: read-only means recap and stop.
- `.agents/skills/apply/SKILL.md` and `references/build-helper.md`: the store line.
- `.agents/skills/plan/references/new-workspace.md`: the busy-workspace options.
- `wiki/development/the-change-loop.md`: *Just ask* step 2, the plain-request paragraph, the steps list for `/explore` and `/continue`.
- `AGENTS.md` (`WONG-STACK` block): the plain-request rule.
- `VERSION` 26.1.0 → 26.2.0 and a `CHANGELOG.md` entry.

## Decision log

- **2026-09-27** — Asked how to split the audit's fixes → chose three parts, each in its own workspace; this one keeps the publishing flow. Workspaces *Release collisions* and *Docs, specs, and checks cleanup* opened for the others.
- **2026-09-27** — Asked how releases should stop colliding → chose numbering at publish. That belongs to the *Release collisions* part. This change still bumps to 26.2.0 by today's rule, and whichever part publishes second catches up.
- **2026-09-27** — Asked how a wiki fact from a plain request gets saved → chose to end with *publish it?*, like `/apply`.
- **2026-09-27** — Asked where a typed `/explore` should stop → chose to stop and ask *Plan it* / *Keep thinking* / *Stop*; only bounded mode hands off to `/plan`.
- **2026-09-27** — Assumed: `/ship` on a dirty default branch goes on to Step 2, and Step 3's save cuts the branch, as after the pull-in. The early save dates from 19.0.0, before the one-checkpoint rule, and no later plan gives a reason to keep it.
- **2026-09-27** — Assumed: removing the early save needs `/ship` Step 2 to author a missing change for code by `/save`'s new-plan fallback. Otherwise dirty code on `main` with no plan would stop, where today the early save writes the plan.
- **2026-09-27** — Assumed: the distillation skips its `--branch` search when `BRANCH` is the default branch, because that search would return every fact saved on `main`.
- **2026-09-27** — Assumed: `/ship`'s report keeps the archived plan's link. The plan link line is exempt from the one-link limit, and after a publish the archive is the record.
- **2026-09-27** — Assumed: a save prints the plan link when it changed the plan's sections or tasks. Status, Branch, Open questions, and Decision-log lines are record-keeping, not a change to the plan.
- **2026-09-27** — Assumed: the busy-workspace case needs no spec edit. `multi-part-workspaces` already requires offering a new workspace before planning, and the *Docs, specs, and checks cleanup* part is rewriting that spec.
- **2026-09-27** — Assumed: a read-only `/continue` ends with the same three choices its busy-workspace question offers. That question already names the ways out.
- **2026-09-27** — Wiki distillation at ship: no repeatable fact (no live facts on the change or branch).
- **2026-09-27** — Archive checkpoint: all 13 tasks done; links, retired names, and all 26 specs pass. Script tests 363/375 locally, the one failure an ENOSPC from a full /tmp on the host. Open PRs #159, #160, #161 also claim 26.2.0; whichever merges first keeps it.
- **2026-09-27** — Merged main after #160 took 26.2.0 and moved releases to numbering at publish. Rewrote this entry as `## Next (minor)`, and `number-release.mjs` numbered it 26.3.0.
