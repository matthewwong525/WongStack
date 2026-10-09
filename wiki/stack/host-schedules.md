# Host schedules

A schedule starts agreed work later, using a clock and tools you already have. [`/schedule`](../../.agents/skills/schedule/SKILL.md) first checks whether a script can do the work, then chooses where it runs and shows what must stay on.

## Script or routine

Prefer predictable code on an existing timed-job facility: an export, a fixed report, or a reminder that checks an invoice and sends an agreed message only while unpaid. A script can contain a narrow model call. Use an assistant session when each run must interpret changing information or choose its next step. Any new code follows [the change loop](../development/the-change-loop.md), including a [staging manual trigger](staging-bindings.md#cron-triggers-inherit-omitting-them-does-not-disable-them).

## Where it runs

The host is the app running your assistant, independently of which model you use. A Codex session inside Paseo can use Paseo's clock. New schedules add no cloud runner or model key. The assistant checks the actual tools and account before offering a mode; a product's documentation alone does not prove this account can run it.

Before activation, it reports the destination, timezone, due time or cadence, working folder, model settings, required connections, and what must remain running. Local schedules may need the computer and app on. A loop tied to this chat cannot promise a fresh session after it closes. Claude cloud sessions cannot manage their cloud schedules from inside the run; stopping needs a separate verified control route. Future sessions must read instructions and progress and stop their owned schedule when the goal is achieved. Fixed checks do not need native timing updates.

## What stays in the repo

An ongoing routine has a lightweight `schedules/<name>.json` definition: owner, instructions, timing, permitted actions, and the host binding. It stays visible after successful runs and after cancellation, when its definition is disabled. Its format ships with [the schedule helper](../../.agents/skills/schedule/scripts/schedule.mjs); each install owns its definitions.

Work with a finish line has a finite OpenSpec goal using [the scheduled-work schema](../../openspec/schemas/scheduled-work/schema.yaml). Its plan names the completion source and keeps its goal checklist open after registration. A successful one-time task finishes its goal; a goal is archived only after verified completion or cancellation and trigger cleanup. Publishing instructions does not mark the goal achieved.

[`/schedule`](../../.agents/skills/schedule/SKILL.md) lists both kinds together, with owner, state, host, and available live timing and results. OpenSpec lists only finite goals and code changes. Changing a routine into a finite goal is an explicit transition; it does not silently create a second job.

## How a run works

Each fresh session reads the exact published instructions and persistent progress, checks its owned job and approved revision, then acts within your agreed scope. It needs a stable route to those instructions, beyond a temporary workspace. Missing records, changed bindings, revoked access, or obsolete runs block dependent actions.

A goal uses ordinary periodic schedules by default. Each session checks its completion source before outreach. Confirmed payment marks an invoice follow-up finished and stops its owned schedule. A pending goal stays scheduled after the session ends; checking again can discover completion. A successful ongoing routine keeps its next recurrence.

Exact native wake-up changes are optional. They require proof that a changed clock survives session completion and starts the later session. When adapting, the run saves its continuation before changing the clock and reads the result back. One-time jobs retain an absolute due time and an expiration guard, so a five-field cron expression cannot make them repeat every year.

Automatic contacting requires an agreed recipient, channel, message purpose, frequency, and end condition. It also requires durable progress and verified ownership that prevents overlapping sends. After an uncertain send, the next run checks the service's receipt; it waits for help if the result cannot be resolved. A schedule never grants itself permission to call, pay, refund, or publish code.

## When it needs your answer

When a call would help, the assistant offers it through a verified question surface and waits. One pending question and its deferred action survive later sessions. The dependent follow-up pauses; silence and elapsed time are never consent. Offering a call does not place one. Answer the identified question or use `/schedule resume` to continue within the agreed scope.

## Manage a schedule

Use `/schedule` to list, inspect, pause, resume, run now, change, or cancel owned schedules where their host supports it. Live timing comes from the host; unreachable hosts show unavailable or stale information. Registration stays pending until both the published instruction record and verified native binding exist. A failed or uncertain change is inspected before retrying.

Cancelling stops only that schedule's owned execution and preserves its disabled definition or terminal goal evidence. If stopping fails after goal completion, further outreach remains blocked and cleanup stays pending. Normal code publishing retains [its checks](../development/the-change-loop.md#the-gate); a [record-only delivery](../development/the-change-loop.md) carries no new implementation.

## Existing schedules

Updates preserve installed cloud jobs and existing host tasks. They do not move a job, rewrite its prompt, delete secrets, or remove cloud resources. [Legacy migration and teardown](legacy-cloud-schedules.md) explains how to inspect older jobs and move one without duplicate follow-ups.

Back to [the Cloudflare stack](README.md), or [development](../development/README.md).
