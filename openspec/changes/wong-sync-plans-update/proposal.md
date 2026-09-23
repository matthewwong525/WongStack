# Sync an update straight to a reviewable plan

**Status:** in-progress
**Branch:** wong-sync-run-plan
**Open questions:** none

## Why

A bare `/wong-sync` that finds an update stops in `/explore`: you answer its questions, then must run `/plan` yourself before you can see what the update will change. The review page is the surface you read to approve an update, so a sync run should end there — you start the sync, answer one round of questions, and come back to a finished `review.html`.

## What Changes

- **An available update goes to `/plan`, not `/explore`.** The `update` route in [`/wong-sync`](../../../.claude/skills/wong-sync/SKILL.md) invokes `/plan` with the same source context and complete preflight report. `/plan` runs its bounded `/explore` first, so update questions are still asked — as one group of at most four, before anything is drafted. (review.html#/sync-route)
- **A bare sync stops at the review.** `/plan` drafts the change and its `review.html`, validates them, presents the page, and offers the next step. Nothing in the target changes until you choose to implement. An earlier request to implement or ship still continues through that verb.
- **`current` and `error` do not change.** A proven-current payload still reports and stops with no change folder; a failed or unprovable preflight still reports its diagnostics and stops.
- **Every surface that names the handoff says `/plan`:** the skill description and body, `references/adapt.md`, the `WONG-STACK` block and intro in `AGENTS.md`, and the README command table.
- **The release ritual runs:** a minor `VERSION` bump (16.6.1 → 16.7.0), a newest-first `CHANGELOG.md` entry, and the payload checks.

**Non-goals:** `/wong-setup` still hands off to `/explore`; the preflight script, the source-refresh steps, and `/plan` itself do not change; sync still never implements without a request.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `wong-sync`: an available update invokes `/plan` instead of `/explore`; the current and error routes still invoke nothing.
- `wong-sync-adapt`: update analysis and questions run in the bounded `/explore` that `/plan` invokes, not a standalone exploration.
- `wong-sync-after-picture`: a bare sync ends at the reviewable plan instead of remaining in exploration.

## Impact

- **Payload:** `.agents/skills/wong-sync/SKILL.md`, `.agents/skills/wong-sync/references/adapt.md`, `AGENTS.md`, `README.md`, `VERSION`, `CHANGELOG.md`.
- **Behavior:** a sync that finds an update now creates an OpenSpec change folder in the target (not yet committed — `/save` owns that). A user who wanted only to discuss the update can stop at the review and discard the folder.
- **Runtime:** none; no script changes.

## Decision log

- **2026-09-23** — asked how sync should handle update questions once it hands off to `/plan` → chose **one question round**: `/plan`'s bounded `/explore` asks one group of at most four, then drafts. Ruled out no questions (a wrong guess about a local adaptation lands in the plan) and ask-only-if-blocked (needs a rule for "blocked").
- **2026-09-23** — asked whether `/wong-setup` changes the same way → chose **only `/wong-sync`**. Setup is a one-time decision about what to install, and it keeps a stop-at-explore option.
- **2026-09-23** — asked what happens after `/plan` writes the review → chose **stop at the review**, the same as a standalone `/plan`. Nothing in the target changes before approval.
- **2026-09-23** — Assumed a **minor** bump (16.7.0): the change alters what a bare `/wong-sync` produces, which is new behavior, not a fix.
- **2026-09-23** — Assumed skill text only: the handoff is one verb name in a runbook, so no deterministic code is needed.
- **2026-09-23** — Assumed the change name `wong-sync-plans-update`; the branch `wong-sync-run-plan` already existed for this session.
- **2026-09-23** — Implementation checkpoint: version 16.7.0. `/wong-sync` now invokes `/plan` on the `update` route; `current` and `error` invoke nothing. The skill description, `references/adapt.md`, the `AGENTS.md` intro and `WONG-STACK` rule, the README table, and the CHANGELOG header now say sync plans the update. The pre-16 migration now goes into the plan's tasks, and the handoff asks for the install-record update as the last task. Deltas were reconciled into `openspec/specs/`, and the `wong-sync` Purpose now says planning. The payload link and config checks pass. The `app-scaffold` spec already fails strict validation on `main` and is out of scope. CI is the remaining task.
