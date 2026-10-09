# Schedule future work and keep routines and goals visible

**Status:** blocked

**Branch:** schedule-skill-proactive

**Open questions:** May the prepared Paseo 0.10.1 repair be applied to the shared scheduler and its daemon restarted? The owner has been asked; no answer yet. Live adaptive acceptance remains blocked.

## Why

Scheduling currently installs a separate cloud runner instead of using the assistant's host. We want future sessions to pick up agreed work, with ongoing routines and unfinished goals visible to everyone using the repo.

## What Changes

- **Use `/schedule`, with cron jobs first.** First check whether predictable steps can run as a script on an existing clock. Prefer that route, including a fixed reminder that checks payment before sending, and build any required code through the normal review and publishing steps. Work that needs the assistant's judgment can run once, repeat indefinitely, or continue until a stated goal is met. The assistant finds the available host scheduler, reports where it runs and what must stay on, and checks that later sessions can do the work. New assistant schedules add no cloud runner.
- **Keep routine definitions in the repo and goal plans in OpenSpec.** An ongoing routine gets a small definition of what runs, who owns it, and where it is scheduled. It can repeat indefinitely without a permanently unfinished plan. Work with a finish line gets an OpenSpec plan that is published while its goal stays open, then archives after completion or cancellation. Later sessions read the appropriate instructions, and `/schedule` shows both kinds together.
  ```text
  publish instructions
          │
          ├─▶ ongoing routine ─▶ repeat
          │                       │
          │                     cancel
          │
          └─▶ finite goal ─▶ check progress
                              │      │
                            open    met
                              │      │
                            resume  archive
  ```
- **Follow up with judgment.** Check progress before contacting anyone, remember what has already happened, and choose a suitable next check within the agreed limits. A confirmed payment ends its payment follow-up schedule. A scheduler that cannot change or stop itself says so before an adaptive schedule is created.
- **Bring you in when needed.** Offer you a call when useful and wait for your answer. Keep that question pending across sessions, without repeatedly asking or continuing the follow-up it blocks. Sending follow-ups needs an agreed recipient, channel, and scope; scheduling alone does not grant permission to call, pay, or publish code.
- **BREAKING: retire the old skill name and its runner setup.** Existing cloud and host schedules keep running. Moving one is an explicit handoff that avoids duplicate follow-ups; removing the old cloud resources is a separate requested step.

**Non-goals:** A new scheduler service, Durable Objects, containers, automatic phone calls, payment processing, a new dashboard, silently moving existing schedules, or weakening the checks for publishing code.

## Capabilities

### New Capabilities

- `host-schedules`: deterministic cron/script work is preferred before assistant scheduling; lightweight recurring routine definitions and finite goals shown together; one-time, recurring, and goal-based host scheduling; future-session readiness; progress, adaptive wake-ups, stopping, scoped follow-ups, questions, and migration.

### Modified Capabilities

- `openspec-workflow`: keep finite scheduled-work goals separate from code changes and ongoing routine definitions, publish unfinished goals, and resume or archive them by their own lifecycle.
- `change-loop`: scheduling offers and the narrow delivery route for a routine definition or goal record, with existing code delivery checks retained.
- `dependencies`: remove the exception for installing a routine runner; scheduling uses tools the host already supplies.
- `cloud-routines`: retire the capability, replacing new scheduling with `host-schedules` and preserving management of existing installations during migration.

## Impact

Rename `.agents/skills/routine/` to `.agents/skills/schedule/`, preserving the unrelated workspace, tidy, and preset helpers and updating every live caller. Add a Node-built-ins schedule helper, host capability references, a lightweight routine-definition format, and an OpenSpec `scheduled-work` schema for finite goals. Update save, ship, continue, apply, plan, and discovery routing so ordinary delivery cannot execute or archive a scheduled goal or routine accidentally. Definitions created by an install remain target-owned and never ship as template examples of live schedules. Update payload inventory, rules, wiki links, area mappings, retired names, and release notes; remove the cloud runner from new installs while retaining a narrow legacy management and teardown path. This is a major payload release; `VERSION` stays untouched until shipping.

## Decision log

- **2026-10-09** — Asked: how should ongoing routines be recorded? → use lightweight repo definitions for ongoing routines and OpenSpec for work with a finish line, keeping both visible without permanently unfinished plans.
- **2026-10-09** — Asked: how should predictable scheduled work run? → prioritize a cron-triggered script before starting scheduled assistant sessions; any required code uses the ordinary change loop.
- **2026-10-09** — Asked: how should scheduling work? → use the available host scheduler to start later sessions, with no new Durable Objects.
- **2026-10-09** — Asked: what should remain in OpenSpec? → publish an unfinished schedule's plan so open scheduled work is visible in the repo.
- **2026-10-09** — Asked: who should be offered a call? → offer the user a call when useful, and wait for their answer.
- **2026-10-09** — Asked: where should overlapping work continue? → keep going here and coordinate with the existing run-anywhere change during planning and delivery.
- **2026-10-09** — Assumed: rename and scheduling behavior stay in one change, because the new name should introduce the complete agreed behavior.
- **2026-10-09** — Assumed: use a separate scheduled-work schema for finite goals, because code completion and the completion of a scheduled goal have different publishing and archiving rules.
- **2026-10-09** — Assumed: store each ongoing routine in one versioned `schedules/<name>.json` definition, because a small readable file can carry its instructions and binding without an OpenSpec task checklist.
- **2026-10-09** — Assumed: the repo owns stable instructions and lifecycle checkpoints; the host owns live timing, so changing the next wake-up does not require a repo commit.
- **2026-10-09** — Assumed: preserve existing schedules and require an explicit move, because switching schedulers silently could duplicate messages or lose work.
- **2026-10-09** — Assumed: a request to follow up authorizes only the agreed recipients, channels, and actions; calls and broader actions await the user's answer.

- **2026-10-09** — Assumed: source and test authoring finishes before the single final verification phase; intermediate checks are moved there without dropping any acceptance.
- **2026-10-09** — Check: retire `scripts/tests/routine-list.test.mjs`, `scripts/tests/routine-models.test.mjs`, `scripts/tests/routine-run.test.mjs`, `scripts/tests/routine-runner-payload.test.mjs`, `scripts/tests/routine-runner.test.mjs`, `scripts/tests/routine-schedule.test.mjs`, and `scripts/tests/routine.test.mjs` with their removed cloud runner/model/clock/bootstrap implementation. Host scheduling and narrow legacy-management tests replace their scheduling obligations. Generic setup tests retain scoped token-widening coverage using check-runner rows. No coverage threshold or check setting is reduced.

- **2026-10-09** — Check: implementation source is authored; use `/save` only to obtain the gated source snapshot needed for harmless later-session acceptance. Trial records publish in an isolated synthetic repository, leaving this implementation unmerged. Remaining acceptance stays unchecked until observed.

- **2026-10-09** — Check: `/save` reconciled capability deltas, including deletion of the retired empty cloud capability; the host capability now owns its main-spec area mapping. No operational goal is archived or executed by this reconciliation.

- **2026-10-09** — Check: the first remote payload run exposed an unprivileged-filesystem error in continuation construction. Read-only access now creates no directory, permission errors remain visible, and unknown CLI commands are rejected before opening progress. All checks and thresholds remain enabled.

- **2026-10-09** — Check: selected goal stores now persist into later-session startup commands, and lifecycle updates use the same exact guarded startup prompt as registration. Focused schedule checks pass; these corrections preserve all gates.

- **2026-10-09** — Check: the real record-only trial exposed ship treating a confirmed no-CI default branch as unreadable after publication. Ship now verifies the API's zero check count before using the existing PR-review gate; unreadable or conflicting responses still stop. This enables the agreed no-CI record route without weakening a configured gate.

- **2026-10-09** — Check: Paseo fired the bounded probe at its actual later UTC time, but the default auto mode requested command approval. Creation now retains an explicitly chosen execution mode and requires matching native read-back; it never silently widens a default. The next synthetic probe selects full-access for its approved local diagnostic only. The blocked probe and its agent were removed; original jobs remain untouched.

- **2026-10-09** — Check: the installed public Paseo CLI advertises `--no-max-runs` but rejects it with `INVALID_INTEGER`. Adaptive updates now inspect the owned job first and omit unnecessary clearing for already-unlimited jobs. Existing caps still require verified clearing; failures remain unknown and never count as adaptation. No private API, host installation, or check bypass is used.

- **2026-10-09** — Check: the actual routine read succeeded and stayed active, but its next read exposed a frequency guard applied to read/draft receipts with no outreach interval. Read-only receipts now retain their type and do not impose contact limits; actual contacts still obey the agreed interval.

- **2026-10-09** — Check: Paseo 0.10.1 advances a newly selected one-time wake again when the current run finishes, moving it a year ahead. Adaptive execution now requires `updateAfterRun` evidence, one-time receipts verify the absolute native wake, and the view flags timing outside the agreed window. The shared-host repair is prepared and isolated regression-tested; applying it and restarting the shared daemon awaits separate approval. Remaining live adaptive acceptance stays unchecked.

- **2026-10-09** — Check: all 76 focused schedule tests pass after the live-trial corrections. Actual record publication, ongoing definition visibility, unfinished goal visibility, cancellation and terminal archive passed in an isolated repository. Adaptive wake-up survival and completion-based stopping remain unverified; see [acceptance evidence](acceptance-evidence.md). No shared-host repair or implementation merge has been performed.

- **2026-10-09** — Check: the final full worktree pre-check passed (script suite, app checks, payload links/config/retirement/specs, wiki and context budget). Shellcheck is unavailable locally and remains enabled in remote CI. Save this source revision for the still-required later adaptive trial; blocked acceptance is not a publishing approval.
