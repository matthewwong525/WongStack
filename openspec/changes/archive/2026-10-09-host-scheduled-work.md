<!-- openspec-archive v1 2026-10-09-host-scheduled-work -->
<!-- file proposal.md utf8 14013 -->
# Schedule future work and keep routines and goals visible

**Status:** ready-to-ship

**Branch:** schedule-skill-proactive

**Open questions:** none; ordinary Paseo periodic checks are the chosen default.

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
- **Follow up through scheduled goal checks.** Use ordinary host schedules to start periodic sessions. Every session checks whether the goal has been achieved before contacting anyone; verified completion marks the goal finished and stops its owned schedule. While pending, remember prior actions, respect agreed follow-up timing, and keep dependent work waiting for your answer. These checks are useful work. Exact changes to the next native wake-up are optional and require verified host support; they are not a prerequisite for goal checks or a reason to patch the host.
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

- **2026-10-09** — Asked: proceed with ordinary Paseo Schedules for periodic goal checking and stopping, without patching the shared host? → yes, move to the next step. Every pending-goal session can discover completion; these are useful checks, not automatically extra sessions. Exact native wake changes remain optional and capability-bound. The earlier host-repair question is withdrawn; do not apply the prepared patch or restart the shared daemon.

- **2026-10-09** — Check: fixed periodic goal checking already works in the lifecycle; the new multi-session regression forbids clock updates and verifies waiting, identified answer, authorized read and completion-based stopping. The full local pre-check passed, with shellcheck retained in CI. Save the prepared source for the chosen real periodic trial.

- **2026-10-09** — Check: gated source `7168534e1d2bef6ed153e680e89cfaa0aad1af5f` passed every remote check without a rerun. The actual fixed-mode trial passed four recurring routine reads and five finite-goal sessions: read, one question, waiting with a completion check, identified answer/read, and verified completion/owned stopping. The completed goal archived through record-only delivery without capability spec changes. Trial jobs, closed agents, four private fixture repositories and both fixture directories are removed; all four original native schedule definitions remain unchanged. Ordinary periodic checks require no shared-host patch or restart. Implementation publication remains the next user decision; see [acceptance evidence](acceptance-evidence.md).

- **2026-10-09** — Asked: publish the finished change after the chosen fixed-mode trial? → publish it; final checks and merge are authorized. Archive checkpoint retains branch `schedule-skill-proactive`, all 31 completed tasks, observed acceptance and cleanup. Prepare merged the latest published revision, numbered release 40.0.0 from 39.1.0, and passed every local check; shellcheck remains enabled in remote CI.

<!-- end proposal.md -->
<!-- file design.md utf8 25980 -->
# Host scheduling, routine definitions, and goal plans

## Context

See [the proposal](proposal.md) for the agreed behavior. The current `.agents/skills/routine/scripts/routine.mjs` installs and manages `scripts/routine-runner/`; its Worker owns a Durable Object clock, Workflows, and Sandbox computers. Workspace creation, presets, and tidy helpers share the routine folder but are independent of that clock.

Code changes currently live on feature branches and archive before `/ship` merges. Publishing an incomplete scheduled goal therefore needs an explicit record type and delivery route; passing `--allow-others` or pretending its goal tasks are complete would weaken the code workflow. No implementation is built by this plan.

## Goals / Non-Goals

**Goals:** one scheduling skill, using the host's clock and session launcher; repo-visible instructions that remain open; verifiable adaptation and stopping; explicit authority and persistent progress across fresh sessions.

**Non-goals:** a replacement cloud service, a background daemon WongStack installs, new billing/model selection, live phone integration, or taking over every schedule in a user's account. Fixed-step jobs in an app still use deterministic code when that fits the task better.

## Decisions

### 0. Choose the executable before choosing its clock

`/schedule` first decides whether the work can run as predictable code. Prefer a script triggered by the app's existing scheduled-job facility, an existing host clock, or a suitable installed cron facility when the steps can be expressed reliably. Examples include exports, fixed reports, and reminders that query invoice state and send an agreed template only while unpaid. A stop condition alone does not require an assistant. Cron supplies timing and can launch either kind of executable; the preference is for deterministic work without an assistant session on each tick.

Use an assistant session when each run must interpret changing information, choose a response, or otherwise exercise judgment the script cannot reasonably encode. A fixed script may contain a narrowly scoped model call and still remain a deterministic job; assess who chooses the steps. Do not ask the user to choose a complex assistant route when code reliably meets the request. Explain the reason when judgment is needed or when the person explicitly requests an assistant anyway.

Creating or changing an app script goes through the ordinary code plan, tests, staging manual trigger, and publishing gate. The schedule-record route cannot merge that implementation. Use an available execution environment, report its uptime and access constraints, and add no generic scheduling service. The implementation of an ongoing cron job has a finished setup plan that archives when shipped; its live code/configuration continues running.

### 1. Resolve the scheduling host separately from the model

Rename the skill directory to `schedule`, including existing workspace, tidy, presets, and Paseo library helpers, and update callers. A Codex agent running inside Paseo can use Paseo's scheduler; detecting the model alone is insufficient. Prefer the person's recorded choice, then the enclosing host's persistent scheduler, then another already available provider that can satisfy the request. Ask only when a materially different destination is needed. Never install a host or create cloud infrastructure as a fallback.

For work that needs assistant judgment, the short skill reads host-specific references only when needed. `schedule.mjs` uses Node built-ins for record handling, normalized results, readiness checks, and the Paseo public CLI. Exposed Codex or Claude native tools are called directly by the agent according to their actual schemas; the helper validates their receipts rather than inventing tool names or writing private application databases. Other hosts can use the same receipt contract after discovery; unknown hosts are not assumed supported.

Represent capabilities independently: durable one-off, recurrence, fresh session, inspect, update, stop, runtime progress read/write, non-overlap, and delivery of a pending question. Readiness records which capabilities exist **in the later execution environment**, not just here. Include model/defaults, working directory, timezone, required tools/connections, local versus cloud operation, and what must remain running. Credentials stay outside the repo and scheduled prompt.

Official documentation establishes product possibilities, not account readiness:

| Host | Established behavior | Build obligation |
|---|---|---|
| Codex / ChatGPT desktop | Standalone scheduled tasks start fresh chats; local project tasks need the computer and app running | Discover callable tools, actual account access, and future-session update/stop authority |
| Claude Code cloud | Recurring and timestamp-based one-off runs start fresh sessions | Cloud `/schedule` management is unavailable inside a cloud session; do not claim self-management without another supported control tool |
| Claude Code local loops | Session-bound polling and dynamic delays exist | Do not use an open-session loop as an independent future-session scheduler |
| Paseo | Public scheduling CLI creates new-agent runs, updates timing/prompt, pauses, and deletes | Verify future agents can manage their own job and reach records/progress; CLI isolation support must be checked, not inferred from old private imports |

Sources read during exploration: [official OpenAI scheduled-task documentation](https://learn.chatgpt.com/docs/scheduled-tasks), [Claude routines](https://code.claude.com/docs/en/routines), [Claude session scheduling](https://code.claude.com/docs/en/scheduled-tasks), and [Paseo scheduling tools](https://paseo.sh/docs/mcp#schedules-and-heartbeats). The installed Paseo CLI's `schedule create` and `schedule update` help confirms public cadence, prompt, maximum-run, and expiration flags.

Periodic goal checks use the host’s ordinary fixed-cadence schedules by default, with persistent progress and verified owned stopping. Each session checks completion first, retains a pending question without repeating it, and performs only due authorized follow-ups. A finished session leaves a pending goal open; verified goal completion stops its trigger. Exact native wake changes are optional and require verified future-session timing updates; fixed checks are not presented as exact adaptation. No shared-host patch is required. A completed-goal guard stops follow-up actions even if a cancellation fails, but a still-active host job is reported as cleanup pending, not successfully cancelled.

### 2. Keep ongoing definitions separate from finite goal plans

Choose the record by whether the work has a finish line, independently of whether a script or assistant executes it. An ongoing routine uses one versioned `schedules/<name>.json` definition in the working repository. It contains its stable key, owner, instructions or script reference, execution type, cadence policy, authorized scope, native binding, instruction revision, and lifecycle checkpoint. It has no task checklist, OpenSpec change, or generated review page. Its creation preview is the actual definition and execution destination shown in chat. Pausing or cancelling retains the definition with a disabled state and no live owned trigger; successful runs keep it active. Reference the script's actual code/configuration instead of duplicating its timetable or business logic. Definitions are target-owned operational data; the template ships the format/helper, never another install's live files.

For finite scheduled goals, ship a project-local `scheduled-work` schema, created and validated through the CLI during implementation. Create its records through `openspec new change ... --schema scheduled-work`, using the selected root/store and CLI-reported artifact paths. The schema has a human-readable proposal and goal checklist plus a validated schedule binding artifact. The proposal holds the goal, owner, instructions, authoritative completion source, allowed actions and contacts, escalation rules, timing limits, and cancellation rule. The binding holds a stable schedule key, schema version, repository/store reference, host or script execution reference, owned job/item ID(s), plan revision, lifecycle checkpoint, and last reconciliation time. Do not modify OpenSpec's installed package or bypass the CLI. Neither record type contains tokens, personal message transcripts, or copied credentials. Repo-wide visibility must not publish private operational details; reference a permitted private source for sensitive facts.

Normalize both record types through a single schedule-helper interface with `kind: routine|goal` and an exact published record reference. `/schedule` combines repo routine definitions and active scheduled goals, with kind, owner, state, execution destination, and live next wake-up/result. `openspec list` exposes active goals and code changes; ongoing definitions stay outside that index. `/continue` can offer both kinds beside code plans and dispatch to the corresponding schedule lifecycle without guessing a feature branch. The generated goal review page renders its stable plan. Live next-run times come from the execution host and are labelled unavailable or stale when they cannot be read; they are not promised by a stale Git snapshot.

A routine can repeat indefinitely without creating unfinished work in OpenSpec. Its setup implementation, if code was needed, has an ordinary code plan that archives when shipped. A one-off has a finite assigned task and closes after that work succeeds, not just because an agent exited. A goal-based task closes only after its explicit completion check succeeds. Permanent cancellation closes a finite goal; a pause or pending user answer keeps its plan open. Completion/cancellation archives only the selected goal, with its evidence reference; it never reconciles business task checkboxes into capability specs. A routine definition remains as configuration after cancellation instead of entering the OpenSpec archive.

If the user adds a terminal goal to a routine or removes a goal to make it ongoing, explicitly transition the record type, preserve the stable schedule identity, and verify its native binding. Update the run's published reference without creating a second trigger. Retire the old instruction record with a reference to its successor; a goal that becomes ongoing archives as superseded after the authorized transition, not falsely completed. Exactly one published instruction source controls each schedule at a time.

Alternatives considered: putting every recurrence in an open OpenSpec change would leave routine operation permanently unfinished; storing routines only in the host would hide them from the repo. Lightweight definitions keep the inventory visible. A separate goal schema still prevents code delivery from accidentally building or archiving a business goal.

### 3. Add a narrow schedule-record route to the delivery skills

`/schedule` prepares the actual routine definition or goal plan and host capability preview before asking to activate it. Creating a schedule and publishing its record are part of that concrete confirmation; it does not authorize code deployment or arbitrary later actions. `/save` and `/ship` remain the only owners of Git operations. Add an explicit schedule-record mode selected by the validated record type, exact file scope, and binding, not by a permissive CLI flag alone.

For a routine this mode saves, checks, and merges only its selected definition; it generates no OpenSpec change or review page. For a goal it carries only the selected scheduled-work folder and generated review page, leaving the goal tasks unchecked and folder active. Both reject mixed application/source edits and ordinary incomplete code plans, and both retain the normal branch/PR gate. Ordinary `/ship` excludes already-published goals from code-change completion checks and rejects either record type passed as a code change. `/apply` and `/plan` likewise dispatch selected operational records before their ordinary code paths. Finite-goal completion uses a separate archive-record operation after stopping the owned execution and verifying the goal or cancellation request. Routine cancellation disables and checkpoints its definition without an OpenSpec archive.

Schedule registration is a recoverable sequence, not an atomic transaction across Git and a host. Prefer native creation in a paused state, publish its bound record, then arm and inspect it. If paused creation is unavailable, publish the agreed definition or goal plan first and create/bind the native job with a startup guard that refuses work before the published record and matching binding are available. Publish the binding checkpoint through the same narrow route. Registration stays pending until both publication and host inspection succeed. Persist operation IDs; an uncertain create/enable response is read back before retrying. A failure leaves an identifiable pending/paused record and repair instruction, never an unexplained active job.

Routine-definition validation checks the versioned format, instructions, execution reference, and binding without using the OpenSpec CLI. Goal-schema validation for registration checks that the instructions and bindings are complete; goal checkboxes remain incomplete by design. Goal completion validation is separate. The schema and its two validation meanings must be proved against the installed OpenSpec CLI before the route is called ready. Do not use `--no-validate`, mark business goals done to pass a gate, or broaden the ordinary archive exception. A goal executed by a shared cron handler stops its own work item rather than disabling a timetable serving other goals or routines.

### 4. Keep live execution state outside Git, with one authoritative store

Git owns agreed instructions, native-job binding, and lifecycle checkpoints. The host owns timing and native run history. Progress between sessions is carried by the host's supported persistent state or by the existing memory service as session facts, according to a verified execution-context capability; the binding identifies the selected route. Use no new database, Worker, or memory credential copied into Git. A local-only progress path must be outside disposable worktrees and is never offered to a cloud session.

Select exactly one authoritative progress route per schedule. It carries the instruction revision, progress/evidence references, last action receipts, current pending question and its ID, deferred action, finite-goal completion marker where applicable, and any uncertain result. The repo keeps concise lifecycle checkpoints and references to this evidence, not a second mutable action log. Reconcile meaningful transitions through record-only saves, not every clock change. If future sessions cannot read or persist progress, stop readiness for autonomous follow-ups; stateless recurring read-only tasks can still be scheduled with their narrower scope.

Use a non-overlap guarantee the chosen host actually supplies, or a shared claim mechanism available in that execution context. A second run that cannot acquire ownership does no outward work. Creating a replacement wake-up invalidates the previous generation; completed or obsolete generations perform no follow-ups. If the host/store cannot establish ownership or uniquely identify prior sends, automatic contacting is unavailable. Do not claim exactly-once delivery: after an ambiguous send, inspect the service's receipt/history and wait for help when it cannot be resolved.

### 5. Every wake-up reads its instructions and rechecks authority

The native prompt identifies the repo, selected root/store where relevant, record kind, exact routine definition or finite-goal plan, binding, and startup instructions. It invokes a schedule-run entry point, not `/schedule create` recursively. Each fresh session reads the published instruction revision and progress and verifies ownership/binding and authorized tools. A goal run checks completion from the named source **before** taking an outward step. A routine run checks that its definition is active and executes the agreed recurring instructions without inventing a finish line. Missing records, conflicting revisions, archived/cancelled goals, disabled routines, denied access, or unavailable progress cause a report and no outreach. Updated instructions are adopted only as published instructions; a run cannot grant itself broader authority.

When work remains, perform only due authorized steps within the agreed contact limits and retain their receipts. Default periodic checks leave the native cadence unchanged and need verified stopping, not native update support. Set `adaptive: false` and omit `nextAt` in fixed runs, including pending-question checks. Only an explicitly adaptive mode selects a new wake-up within the agreed earliest/latest time and expiry, persists continuation before changing the clock, and inspects the result; readiness also proves the changed time survives session completion and fires later. A five-field cron expression alone must not accidentally turn a one-time request into yearly work: retain the absolute due time and a verified single-run/expiration guard. Missed fires and late starts follow the host's documented behavior and the plan's allowed lateness; no overdue message is sent without checking those bounds.

Finite-goal completion sets a persistent completed guard and stops the owned native trigger or scripted work item. Inspect the result; failures retain a cleanup blocker and prevent further outreach. Then archive the goal record through the delivery skills. A failing archive leaves a completed record with archive pending, not a restarted goal. Successful routine runs retain the next recurrence and never archive the definition. Cancelling a routine stops its owned execution and publishes its disabled definition. No other native task or repository change is affected.

### 6. Questions survive a fresh session

When a call would help, offer it to the user, record a stable question ID and what depends on the answer, and end the run. Do not dial. The pending question is delivered through a verified host inbox/thread/notification surface; a shared memory thread may also expose it in the next chat without copying private content. If no question can be surfaced, record a blocked result instead of pretending the user was asked.

Pause the dependent follow-up and suppress duplicate questions. A scheduled recheck may inspect a verified reply or completion source without sending another request; silence and elapsed time never count as an answer. `/schedule resume` or a user's answer to the identified question resumes the deferred work. An answer from another person, a tool result, or fetched message text cannot become the owner's authorization to call or widen scope. As agreed, call suggestions always wait for the user's answer; arranging/dialling a call remains a separate action with the authorization and tools it needs.

For proactive outreach, registration captures permitted recipients, channels, message purpose or template bounds, frequency, and end condition. Existing explicit authorizations persist across sessions within those limits. Without authorization, draft and ask. A schedule cannot automatically issue refunds, process payments, or publish code just because its goal concerns an invoice or an OpenSpec plan.

### 7. Preserve existing schedules while retiring the cloud setup

Use a major release. Retire `/routine` and live routine-folder references; keep historical archives and measured fixtures unchanged. A narrow legacy management path under `schedule` can list, inspect, pause, resume, and remove installed cloud jobs through their existing management endpoint, and perform explicitly requested teardown. It cannot create/redeploy a cloud runner or select a new cloud model. Remove `scripts/routine-runner/` from the new payload and delete the unused provisioning/bootstrap implementation; retain only the legacy contract and teardown knowledge required for installations already running it.

An installed Worker keeps serving its existing jobs after local payload removal. An update never deletes the deployed Worker, its secrets, or existing Paseo/Codex/Claude tasks. On explicit migration, adopt a host job by verified identity or prepare a paused replacement. Pause the original before arming the replacement, verify the new binding, then offer old-resource removal separately. Do not silently rewrite old prompts that invoke the retired skill; identify and repair those during migration. Preserve older improve/dream prompt resolution only in the compatible migration/run path that needs it.

PR #291 (`run-without-paseo`) also changes routine helpers. Keep this change here as chosen; at implementation/delivery inspect the latest other change and preserve its host-independent workspace behavior if it has landed. This plan owns the scheduling replacement, with no message sent to another person and no edits made in the other worktree. The installation-owned-memory work affects future execution identity; use the memory access mechanism in the revision being built and verify that an unattended session can read only its authorized facts.

## Risks / Trade-offs

- **Host management disappears in the future environment** → discover and verify there; restrict the offered mode and explain the blocker. Claude cloud self-management is an established restriction, not an assumed capability.
- **The schema or delivery helpers reject persistent active records** → finish schema/routing changes first and prove pending goal tasks survive publication while incomplete code still fails.
- **A new session has no access to local instructions or progress** → require a reachable published revision and progress route before activation; no ephemeral worktree paths in a durable prompt.
- **Create, pause, send, or archive succeeds but its response is lost** → read back by stable ID, retain uncertain state, and never blindly repeat an outward action.
- **Repo checkpoint and live host state differ** → display host truth with reconciliation time; keep the goal guarded, and report pending repair rather than claiming completion.
- **Renaming breaks unrelated helpers or installed prompts** → inventory every live reference, preserve helpers' behavior, test setup/close/workspace consumers, and provide explicit migration notes.

## Migration and validation

Source changes occur only in `/apply`. Add a `## Next (major)` changelog entry and an Updating note covering the new name, cron-first selection, routine definitions versus finite-goal plans, local host uptime, existing jobs staying active, explicit migration, and optional cloud-resource teardown. Ship the goal schema, definition format, and route helpers in the manifest, replace live documentation links, and map the new capability, definition path, and schema area. An install's `schedules/` data and business goal records never enter the payload inventory. Leave `VERSION` to `/ship`.

Verification has one final phase after source and test authoring: focused behavior tests for definition/goal lifecycle, type transitions, routing, and uncertain results; routine-format validation and strict CLI validation for the ordinary implementation change and a finite scheduled-work fixture; prove that the combined view includes ongoing definitions while OpenSpec lists only finite goals and code changes; payload links, retired names, config, and context budget; the required local checks; harmless real future-session trials in Paseo proving a routine remains configured after a successful run and a finite goal reawakens on a fixed cadence, reads its published instructions, checks completion, waits across sessions on a simulated user question, resumes only on the identified answer, and stops on synthetic completion. Use synthetic sources and send no real follow-ups. Verify other available hosts with their actual tools; unavailable tools receive an explicit capability limit rather than a claim of a passed test. Preserve normal remote checks and preview evidence for delivery.

Rollback pauses new native schedules before reverting the payload; it preserves their repo records and progress for recovery. It never recreates deleted legacy cloud resources or migrates old jobs back automatically.

## Review

[Read the plan](review.html). This is a skill, CLI, and workflow change with no new app screen; the proposal's schedule lifecycle drawing covers the user-facing flow.

## Integration evidence during build

On 2026-10-09, read-only PR inspection found run-without-paseo (#291, remove-paseo) still open, last updated 2026-10-05. Its older cloud-scheduler overlap is superseded by the landed cloud implementation that this change retires. This build renames the current workspace/tidy/preset/paseo helpers without rewriting their behavior; their existing behavioral tests follow only the directory move. It does not modify the other worktree or merge its unlanded plain-workspace changes.

The current memory interfaces enforce installation ownership: machine-id lives in the OS user's data directory, repoContext identifies that installation, and openStore rejects a credential whose keyMachine differs, uses the primary recorded Worker, and grants only its installed role. Schedule bindings store only a route reference; neither helper issues/copies credentials nor changes machine identity. A real later execution session must observe the same installed memory grant with a read/write check before memory continuation can be advertised. Host/memory continuation adapters remain unavailable unless callable in that runtime; local trials use an explicitly selected durable local route and do not claim to test cloud memory access.

<!-- end design.md -->
<!-- file tasks.md utf8 10314 -->
# Tasks

Implementation and test authoring are grouped by surface. Verify source tasks by review of the delivered code and assertions; execute automatic tests and remote checks only after all implementation is complete. No source implementation is part of `/plan`.

## 1. Scheduling skill and its existing helpers

- [x] 1.1 Rename the skill directory and entry point to `.agents/skills/schedule/`, preserve workspace/tidy/preset behavior, and update live callers; verify by a reference inventory and review of unchanged helper behavior.
- [x] 1.2 Write the concise schedule skill and conditional host references for discovery, registration, management, goal checks, questions, and migration; verify instructions never assume future-session tools or recursively invoke the same creation skill.
- [x] 1.3 Handle Claude's native `/schedule` naming collision through verified native tools or the unshadowed native alias, and detect the enclosing host independently of model; author routing cases covering Codex inside Paseo and unavailable hosts, then review their assertions.
- [x] 1.4 Make script-first selection explicit before host discovery: assess predictable work, prefer an existing cron/timed-job route, and hand required implementation to the ordinary code change loop; author cases for an export, a fixed invoice reminder with a stop condition, a narrow model-call script, and judgment-based follow-ups, and review their assertions and staging manual-trigger documentation.

## 2. Routine definitions and finite-goal lifecycle

- [x] 2.1 Create and ship the `scheduled-work` schema for finite goals through the OpenSpec schema CLI with proposal, goal checklist, and binding artifacts; verify by source review that registration and goal completion are distinct, ongoing routines use no goal checklist, and no business task revises capability specs.
- [x] 2.2 Add CLI-driven finite-goal creation, validation, listing, and lifecycle handling to the Node schedule helper, including selected root/store, approved plan revision, owner, execution binding, and completion/cancellation evidence; author fixtures for registering, scheduled, paused, waiting, completed, cancelled, and cleanup pending states and inspect coverage.
- [x] 2.3 Add the startup resolver and one authoritative continuation route per schedule, independent of disposable worktrees; author cases for missing/changed plans, denied progress access, stale generations, and credential-free binding output and inspect their assertions.
- [x] 2.4 Add bounded one-time/recurring/goal-based timing, registration recovery, and verified stop/archive behavior; author cases for annual cron hazards, missed due times, unknown mutation results, cancellation failures, and archive failures and review coverage.
- [x] 2.5 Add the versioned lightweight `schedules/<name>.json` definition format, validation and management, normalized routine/goal references, and explicit type-transition handling; author cases proving successful routine runs create no open OpenSpec goals, cancelled definitions remain disabled, transitions preserve one native identity, and target-owned definitions never enter the template payload, then inspect coverage.

## 3. Host scheduling and follow-up execution

- [x] 3.1 Implement the normalized capability and receipt contract and the public Paseo CLI adapter; verify create/inspect/update/pause/resume/run/cancel arguments and identity preservation by source review, without private client imports or new dependencies.
- [x] 3.2 Add Codex and Claude native-tool runbooks and validated receipt handling, with future-context restrictions and a clear unsupported result; author contract cases for fresh-session access and self-management limits, then inspect their assertions.
- [x] 3.3 Implement fixed-cadence goal checks with optional capability-bound timing changes; check completion first, verify execution ownership and scoped authority, and retain prior receipts. Author cases for paid-before-send, pending question across fixed sessions, identified answer, duplicate fires, ambiguous sends, stale bindings, and rescheduling failures; inspect assertions.
- [x] 3.4 Persist one pending user question and its deferred action, deliver it through an available host surface, pause dependent outreach, and resume only on the identified user's answer; author cases proving no automatic call, no duplicate suggestion, and no timeout-as-consent, then inspect them.
- [x] 3.5 Implement `/schedule` listing and management that combines routine definitions and finite goals, with kind, owner, state, native next-run/result truth, stale indicators, stable IDs, and one-time expiration guards; author cases for conflicting names, unavailable hosts, partial registrations, and repeated safe repairs and review them.

## 4. Save ship continue and discovery routing

- [x] 4.1 Add the explicit schedule-record save/ship route, gated by routine-format or goal-schema validation, binding validation, and an exact record-only file scope; author cases proving a routine publishes without an OpenSpec change/page, goal publication leaves goal tasks open, mixed source/unfinished code is rejected, and the normal PR/check gate is preserved, then review the route and assertions.
- [x] 4.2 Make ordinary ship selection and archive preflight leave published goals and routine definitions alone; author cases for shipping unrelated finished code beside active goals/routines and for rejecting either record type selected as a code change, then inspect them.
- [x] 4.3 Route selected finite goals or lightweight routines in continue/apply/plan to their corresponding schedule lifecycle before code branch/build logic; update discovery so both are visible without being reported as unpublished overlapping code, and review fixtures for fresh-clone resumption and selected stores.
- [x] 4.4 Update the shared CLI contract and change-loop documentation with record publication, registration confirmation, scope limits, and terminal archival; verify ordinary non-code errands and code publishing keep their current reach and checks.

## 5. Legacy migration and removal of new cloud setup

- [x] 5.1 Retain a narrow legacy cloud inspect/list/pause/resume/remove and requested teardown path under schedule, with no create/setup/model bootstrap; remove the old runner and provisioning from new payloads and source consumers, and review migration fixtures for preserving existing deployed jobs and secrets.
- [x] 5.2 Implement explicit adoption or migration with pause-before-activation, read-back verification, recoverable partial state, and unrelated-job preservation; author cases for lost responses and old prompts needing repair, then inspect their assertions.
- [x] 5.3 Review the latest run-without-paseo change and installation-owned-memory interfaces before integrating; document exactly how this implementation preserves landed workspace changes and verifies future-session memory identity without editing another worktree.

## 6. Wiki payload and release surfaces

- [x] 6.1 Replace the cloud-routine guide with the host-scheduling owner page and a linked legacy migration/teardown reference; update development/stack hubs, getting-started, required tools, secret-key guidance, offers, README/site mentions where present, and AGENTS.md's shared block; inspect every remaining live old-name reference.
- [x] 6.2 Update the payload inventory and manifest to ship schedule, the finite-goal schema, and the routine-definition format, excluding target-owned definitions and business goals; retire the routine directory/name and cloud-routines capability with justified legacy exceptions, and map host-schedules/schema/helper/definition paths in memory areas; inspect inventory, retirement, and area fixtures without rewriting historical records.
- [x] 6.3 Add the single `## Next (major)` changelog entry with Updating instructions for the new name, host uptime, preserved jobs, explicit migration, and optional cloud teardown; leave `VERSION` unchanged and verify the entry covers every hand step.
- [x] 6.4 Balance the new skill/reference text within the context baseline and preserve linked wiki headings where required; inspect text scope and offsets before the final checks.

## 7. Final verification and reviewable evidence

- [x] 7.1 Run focused authored scheduling, record-routing, migration, workspace/helper, and schema tests after all implementation is complete; resolve failures and verify unfinished ordinary code still cannot merge.
- [x] 7.2 Run routine-format validation, `openspec schema validate scheduled-work`, strict validation of this implementation change and a finite-goal fixture, and an end-to-end record publication/archive check; verify `/schedule` combines routines and goals, OpenSpec has no permanently open routine plans, a published unfinished goal remains listed, and its terminal archive does not revise capability specs.
- [x] 7.3 Run payload links, retired names, OpenSpec config, context-budget checks, and `node .github/scripts/checks.mjs --worktree`; repair failures, report results as local pre-checks, and keep normal remote checks for delivery.
- [x] 7.4 Through `/save` when required for published fixtures, trial a harmless Paseo routine that starts a later fresh session from its lightweight definition and remains scheduled after success, plus a finite goal on ordinary fixed-cadence Paseo Schedules that reads its published plan, checks completion each session, waits across sessions on a simulated user question, resumes on the identified answer, and stops on synthetic completion; inspect native state and evidence, send no real messages, and remove only the trial's jobs and records after verification.
- [x] 7.5 Check other available hosts using actual native tools and future-session capabilities, including the Claude name collision and cloud self-management restriction; record verified modes and unavailable capabilities without claiming untested support, and leave any substantive promised acceptance blocker open.
- [x] 7.6 Rebuild the review page, report the observed host behavior and migration limits, and provide the host preview or linked read-only evidence for the normal publish decision; verify no business schedule or code is activated/published beyond the task's existing authorization.

<!-- end tasks.md -->
<!-- file specs/change-loop/spec.md utf8 1953 -->
## ADDED Requirements

### Requirement: Publishing a schedule record preserves the code gate

An explicitly confirmed schedule registration or lifecycle checkpoint SHALL be publishable through a record-only delivery route with the repo's normal checks or review gate. The route SHALL carry only the selected lightweight routine definition or finite scheduled-work goal and its review material where applicable, SHALL keep an unfinished finite goal open, and SHALL reject unrelated source changes or unfinished code plans. Publishing an ongoing routine definition SHALL not require a permanently open OpenSpec change. Registration SHALL not authorize publishing code in a future run.

#### Scenario: A confirmed schedule registration

- **WHEN** the user confirms the concrete schedule plan and its host destination
- **THEN** the selected record can be saved and merged after its gate while the goal remains unfinished

#### Scenario: Source changes ride with a record

- **WHEN** a record-only publish also contains application changes or an incomplete code plan
- **THEN** that route stops and the ordinary code change loop is required

## MODIFIED Requirements

### Requirement: A task that will come back gets one offer

When a task done by hand will clearly come back (the person says it recurs, or memory shows they asked before), the next-step question SHALL include one option for a schedule or a mini app, named by its outcome. The agent SHALL NOT offer on a guess, after a code change it built, in an unattended run, or after a decline for that task.

#### Scenario: The person says it recurs

- **WHEN** the person asks for a support email summary and says they need it every Monday
- **THEN** the next-step question includes doing it every Monday, beside stopping

#### Scenario: The person declines

- **WHEN** the person turns down the offer
- **THEN** the decline is recorded in memory and a later request for the same task gets no offer

<!-- end specs/change-loop/spec.md -->
<!-- file specs/cloud-routines/spec.md utf8 3605 -->
## REMOVED Requirements

### Requirement: Create a routine from a plain request

**Reason:** Host scheduling replaces cloud-only creation and the old skill name.

**Migration:** Use `/schedule` for new work; preserve and explicitly migrate existing jobs.

### Requirement: Fixed steps become a script, not a routine

**Reason:** The host-schedules capability explicitly prefers deterministic jobs before assistant sessions; classification is no longer tied to installing the cloud runner.

**Migration:** Keep fixed app jobs on their normal code delivery path; use the host scheduling plan for assistant work.

### Requirement: The first routine installs the cloud pieces

**Reason:** New scheduling installs no cloud runner.

**Migration:** Existing deployed resources remain until explicitly requested teardown; new work uses the host.

### Requirement: A run happens in a short-lived cloud computer

**Reason:** Execution location and uptime now depend on the verified host.

**Migration:** Show the new destination and its uptime needs before explicitly moving a job.

### Requirement: The person picks the model, through Cloudflare by default

**Reason:** New runs inherit or select their host's available model settings.

**Migration:** Existing cloud jobs keep their current model; new host jobs do not invoke cloud model setup.

### Requirement: Any pasted model key is recognised and tested

**Reason:** New scheduling uses the host's authentication and connections.

**Migration:** Preserve installed legacy secrets until the person requests teardown; never expose or copy them into a scheduled plan.

### Requirement: A run gets only what it needs

**Reason:** Verified host execution context and scoped schedule authority replace the cloud runner's fixed environment.

**Migration:** Check future-session access and authorize only the schedule's required tools before activating the host job.

### Requirement: A run never waits for an answer

**Reason:** A follow-up now persists a question and waits for the user when required.

**Migration:** Pending user decisions block their dependent action; elapsed time is not consent.

### Requirement: Manage this install's routines

**Reason:** The schedule skill manages typed repo records and native jobs instead of one cloud list.

**Migration:** Retain narrow legacy management for installed cloud jobs until explicitly moved or removed.

### Requirement: When the cloud cannot be reached, nothing changes

**Reason:** Read-back, uncertainty handling, and host capability reporting replace cloud-specific failure handling.

**Migration:** Preserve existing bindings on failures and verify uncertain mutations before retrying.

### Requirement: Teardown removes the routine pieces

**Reason:** New schedules add none of these resources; legacy teardown remains an explicit migration action.

**Migration:** Keep the legacy teardown route for exactly the installed resources the person requests removing.

### Requirement: Paseo schedules are left alone

**Reason:** Host-schedules extends the preservation promise to every existing host and cloud job.

**Migration:** Adopt by verified identity or explicitly move a job; pause the original before a replacement acts.

### Requirement: A renamed skill's old name still runs

**Reason:** New host runs use the published instructions and current entry point rather than the removed cloud bootstrap.

**Migration:** Preserve legacy deployed behavior and resolve older improve/dream prompts in migration or the compatible host run path; identify retired scheduling prompts that need explicit repair.

<!-- end specs/cloud-routines/spec.md -->
<!-- file specs/dependencies/spec.md utf8 1601 -->
## REMOVED Requirements

### Requirement: Stack-pack tools stay in the repo's build and CI

**Reason:** Host scheduling removes the cloud routine runner installation exception.

**Migration:** Use the replacement requirement below; preserve installed legacy jobs while moving them explicitly.

## ADDED Requirements

### Requirement: Stack-pack tools retain only the check-runner exception

The Cloudflare stack pack's `node`, `npm`, and `wrangler` use SHALL run only in that repo's own build and CI, and provisioning SHALL use `curl` against the Cloudflare API so the person's machine needs no app dependency. The exception is the check runner of an Artifacts install: it is installed from the pack's own pinned and locked tools, outside the app, needs no container software on the computer, and adds nothing to the app's dependencies. Assistant scheduling SHALL use an available host's tools and SHALL not install a separate routine runner; deterministic scheduled app jobs SHALL use the app's ordinary build and delivery path.

#### Scenario: Setup provisions Cloudflare and the check runner

- **WHEN** setup provisions an Artifacts install and its check runner on a fresh computer
- **THEN** provisioning uses the Cloudflare API, the runner uses only the pack's pinned and locked tools, and no app dependency or container software is added to the computer

#### Scenario: First host schedule after updating

- **WHEN** a person requests their first schedule after updating from the cloud routine skill
- **THEN** no routine runner is installed and the available host's verified scheduler is used

<!-- end specs/dependencies/spec.md -->
<!-- file specs/host-schedules/spec.md utf8 13592 -->
## Purpose

Let a person schedule future assistant sessions through an available host, follow an agreed goal across sessions, and see what remains open without installing another scheduling service.

## ADDED Requirements

### Requirement: Predictable scheduled work prefers a script

Before selecting an assistant scheduler, `/schedule` SHALL assess whether the requested work can reliably run as deterministic steps and SHALL prefer a script on an available clock when it can. A completion condition or a narrowly scoped model call SHALL not alone make the task require an assistant session. Required script implementation SHALL use the ordinary code change loop and publishing gate. Assistant scheduling SHALL be used for work requiring judgment, or an explicit informed choice by the person.

#### Scenario: A fixed invoice reminder

- **WHEN** the request is to check payment and send the same authorized reminder at a predictable interval until an invoice is paid
- **THEN** a timed script is preferred when it can reliably perform those checks and actions, with no assistant session required on every tick

#### Scenario: Follow-ups require interpretation

- **WHEN** each follow-up must interpret different replies and decide how to respond
- **THEN** the assistant scheduling route is considered and its need for judgment is explained

### Requirement: Scheduling uses a verified available host

For work selected to run as assistant sessions, `/schedule` SHALL use the person's chosen or available host scheduler, distinguish it from the assistant model, and verify the capabilities needed in the future execution environment. It SHALL add no scheduling service, Durable Object, container, or host installation. Before activation it SHALL show the task, destination, absolute next time and timezone, required uptime, and material capability limits.

#### Scenario: Codex runs inside Paseo

- **WHEN** a Codex session in Paseo requests future work and Paseo supplies the suitable scheduler
- **THEN** the schedule uses the verified Paseo destination and reports what must remain running

#### Scenario: Only an open-session loop is available

- **WHEN** the person requests a fresh session after this chat ends but only a session-bound loop is available
- **THEN** no independent future schedule is claimed, and the missing capability is reported

### Requirement: Ongoing routines have lightweight repo definitions

An ongoing routine with no terminal goal SHALL have a lightweight repository definition of its owner, instructions, execution reference, timing policy, authorized scope, and scheduler binding. It SHALL not require a permanently open OpenSpec change or goal checklist. The definition SHALL stay available after a successful run and after pausing or cancelling, with its lifecycle state identifiable. The routine's setup code change, if one is needed, SHALL finish through ordinary delivery independently of later routine runs.

#### Scenario: A weekly research routine

- **WHEN** the person schedules weekly research with no end condition
- **THEN** its definition is published in the repo without an ongoing OpenSpec goal, and a successful weekly run leaves the routine scheduled

#### Scenario: A cron job is implemented

- **WHEN** code for an ongoing cron job is delivered
- **THEN** its setup plan can archive while the job's live code and configuration remain visible and continue running

### Requirement: Routines and finite goals share a schedule view

`/schedule` SHALL show repo-defined ongoing routines and finite scheduled goals together with their kind, owner, state, host, and available live timing and results. Each schedule SHALL have one authoritative repo instruction record. Selecting a routine SHALL resume or manage that definition; selecting a finite goal SHALL resume or manage its goal plan, without changing the type automatically.

#### Scenario: List all scheduled work

- **WHEN** the repo has a weekly routine and an invoice follow-up goal
- **THEN** both appear in the schedule view, and only the finite goal appears as an open OpenSpec goal

#### Scenario: Add an end condition to a routine

- **WHEN** the person changes an ongoing routine into work with a finish line
- **THEN** the record transition is explicit, its native identity and approved scope remain traceable, and no duplicate job is silently created

### Requirement: One-time recurring and goal-based tasks have distinct endings

The person SHALL be able to request work once, on a recurring cadence, or until a stated completion condition is verified. One-time work SHALL not repeat annually or become an unbounded recurrence. A recurring routine without an end condition SHALL remain configured until stopped, with no permanently unfinished plan; a successful one-time task SHALL close its finite goal.

#### Scenario: A task next Tuesday

- **WHEN** the person schedules one task for next Tuesday
- **THEN** its absolute due time and one-time behavior are preserved, and success leaves no future run

#### Scenario: A weekly review

- **WHEN** a weekly review succeeds with no terminal goal
- **THEN** its next run remains scheduled and its lightweight definition stays available without an unfinished OpenSpec goal

### Requirement: Fresh sessions read the agreed published instructions

Each run SHALL locate its exact published routine definition or finite goal plan and its approved scope, identify its own native job, and read available progress before acting. Missing records, mismatched bindings, revoked access, or an unapproved instruction revision SHALL block dependent actions. Disposable checkout paths SHALL not be the only way to reach instructions or their continuation.

#### Scenario: A fresh checkout

- **WHEN** a native scheduler starts a new session without the prior conversation
- **THEN** the session reads the published instructions for its record type and their continuation and can identify what to do

#### Scenario: The binding belongs to another job

- **WHEN** a run's native job does not match the published schedule binding
- **THEN** it performs no follow-up and reports the mismatch

### Requirement: Completion is checked before outreach

A goal-based run SHALL check the named authoritative completion source before contacting anyone. Goal checks SHALL default to an agreed periodic cadence and SHALL not require native timing updates. Ending a session with a pending goal SHALL leave that schedule active; confirmed completion SHALL mark the goal finished, prevent further goal actions and stop its owned execution items or native schedule triggers, without disabling a shared clock used by other work. Missing or ambiguous evidence SHALL not be treated as completion. A failed stop SHALL remain visible as cleanup pending while further outreach is suppressed.

#### Scenario: An invoice was paid

- **WHEN** the payment source confirms the scheduled invoice is fully paid before the next follow-up
- **THEN** no follow-up is sent, the schedule is stopped and verified, and its record can close

#### Scenario: The host refuses cancellation

- **WHEN** the goal is complete but cancellation fails
- **THEN** later runs perform no outreach and the report identifies the still-active trigger and pending cleanup

### Requirement: Adaptive wake-ups are capability-bound and scoped

An optional adaptive schedule SHALL let a future session choose and verify its next wake-up within the agreed timing, contact-hour, and expiry limits. It SHALL be activated only when that session can persist continuation, change timing, and stop the schedule. Fixed periodic checks SHALL be described as fixed; replacing an explicitly requested exact adaptive wake-up SHALL need the person's agreement.

#### Scenario: The person promises to pay Friday

- **WHEN** an authorized follow-up learns of a Friday payment promise and the schedule permits a later check
- **THEN** the next wake-up is adjusted within the agreed limits and its actual time is reported

#### Scenario: Management is unavailable in a cloud run

- **WHEN** a host can start future sessions but those sessions cannot adjust or stop their schedule
- **THEN** autonomous adaptation is not claimed or activated on that host

### Requirement: Adaptive clock changes survive session completion

Adaptive readiness SHALL require a changed wake-up to survive session completion and start the requested later session. Immediate in-run read-back alone SHALL NOT establish readiness.

#### Scenario: The host overwrites an in-run clock change

- **WHEN** a clock change reads back correctly during a run but the host overwrites it when that session ends
- **THEN** adaptive readiness remains unverified until a change survives completion and produces the later requested session; immediate read-back alone is insufficient

### Requirement: Follow-ups preserve progress and avoid duplicate actions

Automatic follow-ups SHALL require persistent continuation, identifiable prior actions, and execution ownership that prevents overlapping runs from contacting the same person for the same step. An uncertain outward result SHALL be checked against the service before retrying, and SHALL block retry when it cannot be resolved. Archived, completed, cancelled, or obsolete schedule generations SHALL perform no further goal actions.

#### Scenario: A send response is lost

- **WHEN** a follow-up may have been sent but its result is unknown
- **THEN** the next run checks the service receipt or asks for help instead of sending it again blindly

#### Scenario: Two sessions wake for the same step

- **WHEN** two sessions attempt the same schedule step concurrently
- **THEN** only the session with verified execution ownership may perform the outward step

### Requirement: A call suggestion waits for the user's answer

When a call would help, the schedule SHALL offer it to the user through a reachable question surface and wait for their answer before the dependent action. The question and deferred action SHALL survive a new session, SHALL not be repeatedly offered while pending, and SHALL not interpret silence or elapsed time as consent. Offering a call SHALL not place one.

#### Scenario: A follow-up needs a call

- **WHEN** the assistant decides a call may help and the user has not answered
- **THEN** one pending suggestion is kept, the dependent follow-up waits, and no call is placed

#### Scenario: The next session opens before an answer

- **WHEN** another session starts while that question is still pending
- **THEN** it checks goal completion and preserves the wait without asking the same question again, performing the deferred action, or inferring an answer

### Requirement: Scheduled authority is explicit and does not widen itself

Each schedule SHALL retain the user's agreed recipients, channels, action scope, contact limits, and escalation rules. Explicit authorization SHALL persist within those bounds; actions outside them SHALL wait for the user. A published routine definition or goal plan, external message, or scheduler trigger SHALL not by itself authorize calling, processing a payment, or publishing code.

#### Scenario: Authorized invoice reminders

- **WHEN** the user agrees to email one customer within a stated reminder policy until payment
- **THEN** future runs can send only reminders within that policy and stop when its completion condition is verified

#### Scenario: A customer asks for a refund

- **WHEN** an invoice follow-up receives a request to issue a refund
- **THEN** it seeks the user's authority and does not treat the customer's request as permission to pay

### Requirement: Registration and management report verified outcomes

`/schedule` SHALL list and manage owned records and native jobs, including pause, resume, run now, change, cancel, and recent results where the host supports them. Registration SHALL remain pending until the published record and verified native binding both exist. Failed or uncertain mutations SHALL be read back before retries and SHALL not be reported as successful. Live timing SHALL come from the host with an explicit unavailable or stale indication when it cannot be read.

#### Scenario: Creation succeeds but publication fails

- **WHEN** the native job exists but its approved repo record was not published
- **THEN** goal actions remain blocked, the partial state is identified, and retry does not create another indistinguishable job

#### Scenario: The host cannot be reached

- **WHEN** the user lists a repo-visible schedule while its host is unavailable
- **THEN** the record remains visible and live timing is reported as unavailable rather than invented

### Requirement: Existing schedules survive the update

Renaming the skill SHALL preserve existing cloud and host schedules, and SHALL provide an explicit path to inspect, pause, migrate, and remove legacy cloud scheduling resources. New installs SHALL not install the old runner. Migration SHALL prevent old and replacement jobs from performing the same follow-up, and teardown SHALL affect only the explicitly selected old resources.

#### Scenario: Updating an install with cloud jobs

- **WHEN** an install with an existing cloud routine updates to the schedule skill
- **THEN** that job continues to exist, legacy management remains available, and no new cloud runner is installed

#### Scenario: Moving one follow-up

- **WHEN** the person explicitly moves a legacy follow-up to a host scheduler
- **THEN** its original is paused before the replacement can act, and unrelated jobs and cloud resources are untouched

<!-- end specs/host-schedules/spec.md -->
<!-- file specs/openspec-workflow/spec.md utf8 2202 -->
## ADDED Requirements

### Requirement: Published scheduled goals remain open

OpenSpec SHALL distinguish finite scheduled-work goal records from code-change records. A finite goal's agreed instructions and execution reference SHALL be publishable to the repository while its goal tasks remain incomplete, and that record SHALL stay discoverable as open work. Completion or cancellation SHALL close and archive the selected goal; a pause or unanswered question SHALL keep it open. Publication SHALL not represent the goal as achieved. Ongoing routines without a terminal goal SHALL use lightweight repo definitions and SHALL not create permanently open OpenSpec records.

#### Scenario: Publish a payment follow-up

- **WHEN** the person activates a schedule to follow up until an invoice is paid
- **THEN** its plan is available from the default branch with its goal unfinished and is visible among open scheduled work

#### Scenario: Finish the scheduled goal

- **WHEN** the invoice payment is verified and the native schedule is stopped
- **THEN** the record closes with evidence and is archived without altering capability specs for the business task

### Requirement: Delivery and resumption honor a record's lifecycle

The WongStack verbs SHALL identify a finite scheduled-work goal or lightweight routine definition before choosing a code build, archive, or branch-resumption path. Saving or publishing a goal record SHALL preserve its goal checklist; continuing scheduled work SHALL load the corresponding plan or definition. Existing published goals and ongoing routines SHALL not prevent an unrelated code change from shipping, and ordinary code delivery SHALL not execute or archive them accidentally.

#### Scenario: Ship code beside an open schedule

- **WHEN** the repo contains a published unfinished schedule and a finished code change is shipped
- **THEN** the code change ships through its ordinary gate and the scheduled goal remains open

#### Scenario: Continue a schedule

- **WHEN** the user continues a scheduled-work record from a fresh session
- **THEN** its current host binding and progress are loaded instead of treating the business goal as unchecked code implementation

<!-- end specs/openspec-workflow/spec.md -->
<!-- file .openspec.yaml utf8 185 fence=~~~ -->
~~~yaml
schema: spec-driven
retire_capabilities: true
created: 2026-10-09
goal: Rename routine to schedule, use host scheduling, and keep unfinished
  scheduled goals visible in the repository

~~~
<!-- end .openspec.yaml -->
<!-- file acceptance-evidence.md utf8 9629 -->
# Observed acceptance — 2026-10-09

Implementation is built on `schedule-skill-proactive`, PR #346, and remains unmerged. The chosen default is ordinary fixed-cadence goal checks. Exact adaptive wake-ups retain post-session verification guards but are optional. The chosen fixed-mode live acceptance passed. Optional exact adaptive clock changes remain unavailable on this installed host.

## Local checks

All 77 scheduling `schedule-*.test.mjs` tests passed, including format/schema, record-only publication/archive, CLI listing, legacy management, native receipts, progress ownership and lifecycle. The newest cases cover consecutive read/draft runs without an outreach interval, contact frequency after a read, wrong-year timing receipts, the combined view's timing mismatch, unavailable post-run update capability, and completion suppressing work even when adaptation is unavailable. The full repository worktree pre-check passed, including the script suite, app checks, payload links/config/retirement/specs, wiki, lint and context budget. Shellcheck is unavailable locally and remains enabled in CI. These are pre-checks; remote CI is the delivery gate.

## Isolated publication and actual later sessions

Temporary private repository `matthewwong525/wongstack-schedule-trial-20261009-021416-v3` used gated source `d86d435bd5aba1d88b1b21b5bc9c77f3c7327b76`, synthetic input, an external durable local progress route, read-only authority, bounded expiry, and explicitly selected full-access mode for the diagnostic. No real contact, call or payment was made. Each selected record used the ordinary save/ship record route and confirmed no configured CI before the PR-review gate. The implementation PR was never merged.

| Observation | Actual evidence | Result |
| --- | --- | --- |
| Routine definition published separately from goals | Routine PRs 1/2; combined schedule listing | Passed; no routine OpenSpec goal |
| Unfinished finite goal published and remains open | Goal PRs 3/4; combined listing and OpenSpec index | Passed; goal task remains unchecked |
| Fresh probe can read instructions/progress and inspect its own job | Job `820df7fb`, agent `696fe20a-6efe-4331-a056-ab7fee233e3f`, natural fire 04:07 UTC | Passed for local access and owned stopping; probe self-deleted before session end, so not post-run adaptation proof |
| Routine fires later and stays scheduled | Job `efffb5a7`, agent `52a0d69b-05e2-4f30-ad4c-12280ae27c7c`, natural fire 04:15 UTC, next fire 04:20 | First read passed; second read exposed the now-fixed contact interval bug. The subsequent fixed-mode trial below verified four successful reads |
| Goal checks published instructions and requests new wake | Job `3a2a7a58`, agent `69c4a4f8-2328-4bdc-807d-d6bbe0bfebd1`, natural fire 04:15 UTC | Requested 2026-10-09 04:18, but Paseo rewrote it to 2027-10-09 04:18 after session end; failed |
| One persisted question delivered | Parent repaired the clock after session end; agent `203ab024-2a0b-486c-a456-23c295f5a518` fired naturally 04:23 UTC | One synthetic inbox question, pending with deferred read; no answer or call. Its 04:26 wake was again moved to 2027 |
| Owned cancellation and terminal archive | Routine PR13 merged `bec6f71783e240901a506248048eef8819cd2a39`; goal archive PR14 merged `24db6d2ec5dd0f26daa552a385ec3326fac1957e` | Passed; disabled routine retained, cancelled goal archived with its unchecked completion task. No capability spec files changed |

That first goal was cancelled, not completed. Its unobserved waiting/answer/completion phases were verified in the subsequent fixed-mode trial below.

## Host findings and optional adaptation

Installed public Paseo CLI 0.10.1 advertises `--no-max-runs` but rejects it with `INVALID_INTEGER`. The adapter avoids needless clearing only after inspecting an already-unlimited owned job. Default auto mode requested command approval in a later session; approved trial mode was retained explicitly, never widened silently.

Paseo's `finishRun` advances the already-updated `nextRunAt` instead of retaining a future time chosen during the run. A one-time cron consequently jumps a year. A repair is prepared at `/tmp/wong-paseo-reschedule.patch`; it retains a future clock when it differs from that run's `scheduledFor`. Isolated tests of the installed original reproduced the year jump; the patched copy preserved the requested time and retained normal recurrence, pause, run-cap and terminal behavior. Neither the installed scheduler nor daemon has been modified. The owner chose ordinary periodic goal checks instead; the repair question is withdrawn. No shared-host modification or restart is authorized.

The prepared patch is not a requirement for this change. The final trial uses ordinary Paseo Schedules with `adaptive:false`, `update:false`, `updateAfterRun:false` and no requested `nextAt`. Every natural session checks completion first, retains one unanswered question, and only completion triggers owned cancellation. Exact clock changes remain unavailable on this installed host and are not claimed.

Codex and Claude CLI help and the callable-tool inventory expose no independent native scheduler for these repository sessions. Page-controller and Sites automations are different destinations, not evidence of repo-session readiness. Their adaptive modes remain unavailable here. Host runbooks and contract fixtures are authored; no real later Codex/Claude native session or cloud self-management is claimed. The Claude native-name collision and cloud restrictions are retained in the documented discovery route.

## Cleanup

All captured synthetic native IDs were cancelled/deleted and inspected absent. Eight closed agents from the initial trial and eleven from the fixed trial were deleted only from the exact synthetic checkouts. Final agent inventory has no remaining trial agents. Native inventory contains only pre-existing IDs `719bc428`, `dc101425`, `704743e2`, `d9a87abe`; their names, targets, cadence and bounds match the pretrial capture. No existing job, secret or cloud resource was changed.

The four owner-verified private fixture repositories (`wongstack-schedule-trial-20261009-021416`, its `-v2` and `-v3` variants, and `wongstack-fixed-schedule-trial-20261009-145658`) and both exact local trial directories were removed after the terminal archives passed. Nonsecret native evidence, journals, publication receipts and final preservation proof were retained outside Git at `/root/.local/share/wongstack/schedule-trial-evidence/20261009-host-scheduled-work`; fixture clones, business integrations and credentials are excluded. The finite archive diff confirms no `openspec/specs/` modifications.

## Fixed-mode source verification

The approved fixed-mode refinement needed no lifecycle implementation change. Its multi-session regression forbids host clock updates and covers one question, a later completion check while waiting, the identified answer, an authorized read, and completion before any more work with verified owned cancellation. The full local repository pre-check passed; shellcheck stays enabled in remote CI. The following observations come from actual later native sessions.

## Passed fixed-mode native trial

Gated source `7168534e1d2bef6ed153e680e89cfaa0aad1af5f` passed all remote checks without a rerun. The temporary private fixture `matthewwong525/wongstack-fixed-schedule-trial-20261009-145658` used ordinary every-minute Schedules, bounded expiry, synthetic input, read-only authority, explicitly approved diagnostic full-access mode and a durable local continuation. `adaptive`, `update` and `updateAfterRun` were false; the harness throws if a native timing update is attempted. No shared-host repair or restart occurred.

- Probe `d83bacca`: two distinct later sessions read published routine/goal records, persisted/read progress, excluded another claim, and then verified owned stopping.
- Routine `07c3d7c9`: four successful naturally scheduled reads; it stayed configured after success and had no OpenSpec routine goal. Parent then verified owned cancellation and published its disabled definition.
- Goal `6b33dd08`: five distinct fresh sessions on the same native identity. At 15:15 UTC it checked incomplete input and read; 15:16 delivered one question; 15:17 checked completion again and preserved waiting without a duplicate or deferred action; after the identified synthetic owner answer, 15:18 performed the authorized read; 15:19 checked the now-complete input before more work, marked completion and verified native deletion. The native session then ended. The question count stayed one and the receipt count stayed two.
- The completed goal archived through the normal record-only prepare/save/inspect/finish route, retaining completion evidence and verified stop. Archive publication merged `35eb6a9edebe00bb85439123684de1bfd68cbc28` (saved record `d5a518f1620da166303fb52d9efe38cdd424039b`, no configured CI, confirmed PR-review gate). Its checklist is complete; the active goal disappeared. Diff inspection confirms no capability spec changes.
- Final native read-back shows all three captured trial IDs absent and all four pre-existing schedule definitions unchanged. No real messages, calls, payments, business schedules or implementation merge occurred.

Record-scope guards also rejected an incomplete baseline and a new archive branch carrying a previous routine publication. Completing the declared fixture baseline and basing the selected archive branch on the actual latest published main revision resolved these fixture setup issues without changing code or bypassing checks.

<!-- end acceptance-evidence.md -->
<!-- file acceptance.md utf8 12821 -->
# Retained live acceptance

The chosen fixed-mode trial passed; observed results and cleanup are in [acceptance evidence](acceptance-evidence.md). This retained recipe describes how to repeat the isolated acceptance. Local unit fixtures alone do not establish later-session capability. No business schedule, call, message or deployment is authorized by this recipe.

## Published instructions prerequisite

1. Use `/save` for this implementation branch with the remaining acceptance tasks honestly unchecked. Preserve the normal gate. Do not merge the implementation merely to make a fixture reachable.
2. Parent creates a separate private synthetic repository whose initial default-branch baseline is the gated source snapshot, outside `.paseo/worktrees/`. Remove production workflows/config/credentials and the active implementation plan from that initial baseline; keep helpers/schema and a review gate when no CI is configured. A fixture branch based on the implementation branch cannot pass record-only scope because it carries source changes. Publish each selected synthetic record on its own branch in this isolated repository. The implementation remains unmerged and trial data stays outside its checkout.
3. Use only owner-labelled synthetic state in a durable private local directory, e.g. `$XDG_DATA_HOME/wongstack/schedule-trials/<trial-id>/` (fall back to the OS user's data directory). Do not write credentials or copy installation identity. The two records each choose one separate local continuation file and share only a synthetic input file with `{ "complete": false }`. No production integration is connected.

## Concrete record and native contract

In the isolated trial repository, set `TRIAL_REPOSITORY` to its actual credential-free remote, `TRIAL_DATA` to an absolute private trial directory and `TRIAL_UPTIME` to the actual computer/daemon that must remain running. This prepares unpublished drafts with every unobserved capability false. Publish the draft record, then parent gathers bounded, genuinely later read-only probe evidence in `capabilities.json` there. It must observe PASEO_AGENT_ID in the probe's active native run, read published instructions, prove exclusive claim/read/write and owned stopping. A synthetic inbox proves only the trial's question surface. Checkpoint observed capability evidence through record-only delivery before registration; never fill unobserved capabilities with true.

```sh
node --input-type=module <<'NODE'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { routineRevision, digest } from './.agents/skills/schedule/scripts/lib/records.mjs';
const data = process.env.TRIAL_DATA, repository = process.env.TRIAL_REPOSITORY;
if (!data || !path.isAbsolute(data) || !repository || !process.env.TRIAL_UPTIME) throw Error('Set actual TRIAL_DATA, TRIAL_REPOSITORY and TRIAL_UPTIME');
mkdirSync(data, { recursive: true, mode: 0o700 });
const evidenceFile = path.join(data, 'capabilities.json');
const capabilities = existsSync(evidenceFile) ? JSON.parse(readFileSync(evidenceFile, 'utf8')) : {
  futureVerified: false, oneOff: false, recurrence: false, freshSession: false, inspect: false,
  update: false, stop: false, progressRead: false, progressWrite: false, nonOverlap: false, questionDelivery: false,
  context: { location: 'local', uptime: process.env.TRIAL_UPTIME },
};
const authority = { actions: ['read'], recipients: [], channels: [] };
const now = Math.ceil(Date.now() / 60000) * 60000;
const at = minutes => new Date(now + minutes * 60000).toISOString();
const input = path.join(data, 'input.json');
writeFileSync(input, JSON.stringify({ complete: false }), { mode: 0o600 });
const baseTiming = { timezone: 'UTC', every: '5m', earliest: at(0), latest: at(75), expiresAt: at(90), allowedLatenessMs: 60000 };
const bind = (key, record, timing, revision) => ({
  version: 1, key, owner: 'schedule-trial@example.test', repository, record, revision,
  execution: { type: 'assistant', host: 'paseo', nativeId: null, generation: 1, capabilities,
    context: { location: 'local', cwd: process.cwd(), provider: 'codex', uptime: capabilities.context.uptime } },
  progress: { type: 'local', reference: path.join(data, `${key}.json`) }, timing, authority,
  lifecycle: { state: 'registering', published: false },
});
const key = 'host-schedule-trial-routine';
const routine = { version: 1, kind: 'routine', key, name: 'Read synthetic trial input',
  owner: 'schedule-trial@example.test', instructions: `Read ${input}; record a digest locally. No business integration or outreach.`,
  execution: { type: 'assistant' }, authority, timing: { ...baseTiming, mode: 'recurring' } };
routine.binding = bind(key, `schedules/${key}.json`, routine.timing, routineRevision(routine));
writeFileSync(path.join(data, 'routine-request.json'), JSON.stringify(routine, null, 2));
const name = 'host-schedule-trial-goal';
const sections = {
  Goal: 'Observe synthetic completion, then stop only this trial trigger.',
  Instructions: `Read ${input}. Use executeRun with verified native identity and local-only adapters. Use ordinary periodic checks with no requested nextAt; check completion before work and while waiting. Never send/call.`,
  'Completion source': input,
  Authority: 'Read trial files only; no outreach or business changes.',
  Timing: `UTC every5m; latest ${baseTiming.latest}; expires ${baseTiming.expiresAt}.`,
  'Questions and cancellation': 'One synthetic inbox item; exact owner answer only. Silence grants no authority. Stop only the captured trial native ID.',
};
const proposal = `# Goal: ${name}\n\n` + Object.entries(sections).map(([heading, body]) => `## ${heading}\n${body}\n`).join('\n');
const binding = bind(name, `openspec/changes/${name}`, { ...baseTiming, mode: 'goal' }, digest(proposal));
binding.completionSource = input; binding.questionSurface = path.join(data, 'inbox.json'); binding.adaptive = false;
writeFileSync(path.join(data, 'goal-request.json'), JSON.stringify({ name, proposal, binding,
  tasks: '- [ ] Observe authoritative synthetic completion and verified owned stopping.\n' }, null, 2));
NODE
node .agents/skills/schedule/scripts/schedule.mjs create-routine --file "$TRIAL_DATA/routine-request.json"
```

Parent publishes that routine alone before creating the goal on a separate clean record branch:

```sh
node .agents/skills/schedule/scripts/schedule.mjs create-goal --file "$TRIAL_DATA/goal-request.json"
node .agents/skills/schedule/scripts/schedule.mjs list
```

Retain the goal's actual CLI-returned `reference` (and selected `--store <id>` consistently if used). Record-only checkpoint/prepare/finish uses `--schedule-record <exact-reference>`; goals retain unchecked tasks. After each actual merge, use `checkpoint(loadRecord(...), binding)` to set lifecycle published true and publication to `<actual-repository>@<actual-merged-commit>:<record-path>`, then publish that exact binding checkpoint through the same selected record route. This is instruction publication, not implementation publication or proof of activation.

Both bindings have version1, unique trial key, synthetic owner, credential-free published repository reference, exact record path, approved revision, `execution: {type: assistant, host: paseo, nativeId: null, generation: 1, capabilities, context: {location: local, cwd: <durable-trial-checkout>, provider: codex, uptime: <actual-daemon/computer>}}`, sole local progress reference, explicit authority `{actions:[read],recipients:[],channels:[]}`, and lifecycle registering. The routine timing is recurring every5m. The finite timing is goal every5m with UTC, absolute earliest/latest/expiry and allowedLatenessMs. Give both a short expiry so abandoned trials cannot run indefinitely. Optional one-time/adaptive rearming requires separately verified capability and minute-aligned absolute times; this fixed trial uses neither.

Capability evidence must come from an actual harmless later probe: read its published record, inspect its own native job, read/write the selected continuation, acquire/release its claim, and inspect/stop a trial-owned job. Keep unavailable capabilities false; do not fabricate `futureVerified`. Read-only probe creation is an explicitly authorized diagnostic trial, not business adaptive activation.

The public native adapter is `paseoAdapter()` in schedule/scripts/lib/hosts.mjs: public `paseo schedule create <startupPrompt(binding)> --name wong-<key>-<operation> --cwd <durable-clone> --provider codex --every 5m --expires-in <bounded-duration> --json`. There is no paused-create/isolation flag here. Publish guarded instructions before creating; persist operation IDs and inspect/read back lost responses. Do not use `--run-now` as evidence of a later session.

After a helper-created native receipt: `register --record <ref>`, `bind --record <ref>`, record-only publish the bound checkpoint with the actual immutable instructions publication reference, then `reconcile --record <ref>`. Reconciliation checks future capabilities and exact guarded prompt, native active state and nextRunAt. Adoption uses the same ID, explicit prompt repair and guarded resume; no second trigger.

## Observe later runs

Paseo fresh agents expose PASEO_AGENT_ID. `start --record <ref> --native-id <id> --generation 1 --revision <sha>` requires that agent in the exact job's active runs. It holds a local claim; `release --record <ref> --run-id <id>` releases it. For an executable trial harness, alternatively call `executeRun` with actual native ownership verified first; it takes its own claim. Do not acquire both claims.

Use actual local read-only adapters: `checkCompletion` reads the synthetic input; `performAction` reads it and records a digest as evidence; `deliverQuestion` writes one synthetic inbox item in the trial directory and exposes it in the native run result. No send/call adapter exists. `chooseStep` uses the persisted progress to demonstrate these phases:

- Routine: a later run reads published instructions and input, persists its result, and leaves the native recurrence active. Inspect its native run history and nextRunAt, and verify no OpenSpec routine goal appeared.
- Goal first run: check synthetic completion false, persist a read receipt, leave the ordinary fixed cadence intact. Inspect the same native ID after session end and observe the next naturally scheduled session. Native timing update capability stays false; do not patch or restart Paseo.
- Goal later run: retain one pending synthetic question/deferred read. Observe waiting and no duplicate question on another check. Parent answers its exact question ID as the identified synthetic owner using `answer`; resume the same native job if the record route pauses it. A timeout must produce no answer.
- Set synthetic completion true. The next native session must check it before work, persist the terminal guard, cancel/read back only its own trigger, checkpoint completion evidence and verified stop, then use the terminal record archive route. The original goal remains open until that evidence; cancellation/archival touches no capability spec.

Record exact native IDs, agent IDs, observed timestamps, publication revision, read/clock/stop receipts and question transitions in trial evidence; exclude prompts containing private data and credentials. Actual other-host tools must prove their own later access; absent Codex/Claude tools and Claude cloud self-management remain reported limits, never passes.

## Cleanup and final preview

Parent owns trial cleanup: pause/cancel only the captured trial IDs, including its capability probe, inspect absence, remove their selected routine/goal records through exact record delivery, then remove only this trial's local directory/clone. Preserve every pre-existing native/cloud job, secret and resource. Rebuild the implementation review page, attach observed evidence/limits and provide the host preview or read-only evidence. Task7.6 does not authorize publishing business code or activating business work.

## Chosen final trial mode

The owner chose ordinary periodic Paseo goal checks. Author the harmless fixture with `adaptive:false`, `update:false`, `updateAfterRun:false`, no requested `nextAt`, read-only actions, one-minute cadence and bounded expiry. Every actual later session checks completion even while waiting. Verify two successful routine reads, goal read, one question, another waiting session without duplicate/deferred work, the identified synthetic answer, a subsequent authorized read, and completion-based owned cancellation/archive. Retain optional adaptation safeguards, but do not treat the installed host’s unavailable exact clock changes as a blocker for the chosen fixed mode. No shared host modification or restart is authorized.

<!-- end acceptance.md -->
<!-- file review.html utf8 54645 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its Ready section
  asks the chat to build, or to build and publish, by an action's name alone.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-09-host-scheduled-work</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:var(--bar, 76px); background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready, #ready .row { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
  #ready-says, #ready-confirm span { margin:0; font-size:14px; }
  #ready-says { font-weight:600; }
  @media (max-width:700px) {
    #ready, #ready .row, #ready-says, #ready-confirm span { flex:1 1 100%; }
    #ready button { flex:1; }
  }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:#fff; color:var(--ink); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-09-host-scheduled-work">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-09-host-scheduled-work</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Scheduling currently installs a separate cloud runner instead of using the assistant's host. We want future sessions to pick up agreed work, with ongoing routines and unfinished goals visible to everyone using the repo.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Use <code>/schedule</code>, with cron jobs first.</b> First check whether predictable steps can run as a script on an existing clock. Prefer that route, including a fixed reminder that checks payment before sending, and build any required code through the normal review and publishing steps. Work that needs the assistant's judgment can run once, repeat indefinitely, or continue until a stated goal is met. The assistant finds the available host scheduler, reports where it runs and what must stay on, and checks that later sessions can do the work. New assistant schedules add no cloud runner.</div></div></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Keep routine definitions in the repo and goal plans in OpenSpec.</b> An ongoing routine gets a small definition of what runs, who owns it, and where it is scheduled. It can repeat indefinitely without a permanently unfinished plan. Work with a finish line gets an OpenSpec plan that is published while its goal stays open, then archives after completion or cancellation. Later sessions read the appropriate instructions, and <code>/schedule</code> shows both kinds together.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">publish instructions</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">        │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">        ├─▶ ongoing routine ─▶ repeat</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">        │                       │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">        │                     cancel</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">        │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">        └─▶ finite goal ─▶ check progress</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">                            │      │</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">                          open    met</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">                            │      │</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">                          resume  archive</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Follow up through scheduled goal checks.</b> Use ordinary host schedules to start periodic sessions. Every session checks whether the goal has been achieved before contacting anyone; verified completion marks the goal finished and stops its owned schedule. While pending, remember prior actions, respect agreed follow-up timing, and keep dependent work waiting for your answer. These checks are useful work. Exact changes to the next native wake-up are optional and require verified host support; they are not a prerequisite for goal checks or a reason to patch the host.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Bring you in when needed.</b> Offer you a call when useful and wait for your answer. Keep that question pending across sessions, without repeatedly asking or continuing the follow-up it blocks. Sending follow-ups needs an agreed recipient, channel, and scope; scheduling alone does not grant permission to call, pay, or publish code.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>BREAKING: retire the old skill name and its runner setup.</b> Existing cloud and host schedules keep running. Moving one is an explicit handoff that avoids duplicate follow-ups; removing the old cloud resources is a separate requested step.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> A new scheduler service, Durable Objects, containers, automatic phone calls, payment processing, a new dashboard, silently moving existing schedules, or weakening the checks for publishing code.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked: how should ongoing routines be recorded? → use lightweight repo definitions for ongoing routines and OpenSpec for work with a finish line, keeping both visible without permanently unfinished plans.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked: how should predictable scheduled work run? → prioritize a cron-triggered script before starting scheduled assistant sessions; any required code uses the ordinary change loop.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked: how should scheduling work? → use the available host scheduler to start later sessions, with no new Durable Objects.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked: what should remain in OpenSpec? → publish an unfinished schedule's plan so open scheduled work is visible in the repo.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked: who should be offered a call? → offer the user a call when useful, and wait for their answer.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked: where should overlapping work continue? → keep going here and coordinate with the existing run-anywhere change during planning and delivery.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: rename and scheduling behavior stay in one change, because the new name should introduce the complete agreed behavior.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: use a separate scheduled-work schema for finite goals, because code completion and the completion of a scheduled goal have different publishing and archiving rules.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: store each ongoing routine in one versioned <code>schedules/&lt;name&gt;.json</code> definition, because a small readable file can carry its instructions and binding without an OpenSpec task checklist.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: the repo owns stable instructions and lifecycle checkpoints; the host owns live timing, so changing the next wake-up does not require a repo commit.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: preserve existing schedules and require an explicit move, because switching schedulers silently could duplicate messages or lose work.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: a request to follow up authorizes only the agreed recipients, channels, and actions; calls and broader actions await the user's answer.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: source and test authoring finishes before the single final verification phase; intermediate checks are moved there without dropping any acceptance.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: retire <code>scripts/tests/routine-list.test.mjs</code>, <code>scripts/tests/routine-models.test.mjs</code>, <code>scripts/tests/routine-run.test.mjs</code>, <code>scripts/tests/routine-runner-payload.test.mjs</code>, <code>scripts/tests/routine-runner.test.mjs</code>, <code>scripts/tests/routine-schedule.test.mjs</code>, and <code>scripts/tests/routine.test.mjs</code> with their removed cloud runner/model/clock/bootstrap implementation. Host scheduling and narrow legacy-management tests replace their scheduling obligations. Generic setup tests retain scoped token-widening coverage using check-runner rows. No coverage threshold or check setting is reduced.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: implementation source is authored; use <code>/save</code> only to obtain the gated source snapshot needed for harmless later-session acceptance. Trial records publish in an isolated synthetic repository, leaving this implementation unmerged. Remaining acceptance stays unchecked until observed.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: <code>/save</code> reconciled capability deltas, including deletion of the retired empty cloud capability; the host capability now owns its main-spec area mapping. No operational goal is archived or executed by this reconciliation.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: the first remote payload run exposed an unprivileged-filesystem error in continuation construction. Read-only access now creates no directory, permission errors remain visible, and unknown CLI commands are rejected before opening progress. All checks and thresholds remain enabled.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: selected goal stores now persist into later-session startup commands, and lifecycle updates use the same exact guarded startup prompt as registration. Focused schedule checks pass; these corrections preserve all gates.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: the real record-only trial exposed ship treating a confirmed no-CI default branch as unreadable after publication. Ship now verifies the API's zero check count before using the existing PR-review gate; unreadable or conflicting responses still stop. This enables the agreed no-CI record route without weakening a configured gate.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: Paseo fired the bounded probe at its actual later UTC time, but the default auto mode requested command approval. Creation now retains an explicitly chosen execution mode and requires matching native read-back; it never silently widens a default. The next synthetic probe selects full-access for its approved local diagnostic only. The blocked probe and its agent were removed; original jobs remain untouched.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: the installed public Paseo CLI advertises <code>--no-max-runs</code> but rejects it with <code>INVALID_INTEGER</code>. Adaptive updates now inspect the owned job first and omit unnecessary clearing for already-unlimited jobs. Existing caps still require verified clearing; failures remain unknown and never count as adaptation. No private API, host installation, or check bypass is used.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: the actual routine read succeeded and stayed active, but its next read exposed a frequency guard applied to read/draft receipts with no outreach interval. Read-only receipts now retain their type and do not impose contact limits; actual contacts still obey the agreed interval.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: Paseo 0.10.1 advances a newly selected one-time wake again when the current run finishes, moving it a year ahead. Adaptive execution now requires <code>updateAfterRun</code> evidence, one-time receipts verify the absolute native wake, and the view flags timing outside the agreed window. The shared-host repair is prepared and isolated regression-tested; applying it and restarting the shared daemon awaits separate approval. Remaining live adaptive acceptance stays unchecked.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: all 76 focused schedule tests pass after the live-trial corrections. Actual record publication, ongoing definition visibility, unfinished goal visibility, cancellation and terminal archive passed in an isolated repository. Adaptive wake-up survival and completion-based stopping remain unverified; see <a href="acceptance-evidence.md">acceptance evidence</a>. No shared-host repair or implementation merge has been performed.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: the final full worktree pre-check passed (script suite, app checks, payload links/config/retirement/specs, wiki and context budget). Shellcheck is unavailable locally and remains enabled in remote CI. Save this source revision for the still-required later adaptive trial; blocked acceptance is not a publishing approval.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked: proceed with ordinary Paseo Schedules for periodic goal checking and stopping, without patching the shared host? → yes, move to the next step. Every pending-goal session can discover completion; these are useful checks, not automatically extra sessions. Exact native wake changes remain optional and capability-bound. The earlier host-repair question is withdrawn; do not apply the prepared patch or restart the shared daemon.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: fixed periodic goal checking already works in the lifecycle; the new multi-session regression forbids clock updates and verifies waiting, identified answer, authorized read and completion-based stopping. The full local pre-check passed, with shellcheck retained in CI. Save the prepared source for the chosen real periodic trial.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: gated source <code>7168534e1d2bef6ed153e680e89cfaa0aad1af5f</code> passed every remote check without a rerun. The actual fixed-mode trial passed four recurring routine reads and five finite-goal sessions: read, one question, waiting with a completion check, identified answer/read, and verified completion/owned stopping. The completed goal archived through record-only delivery without capability spec changes. Trial jobs, closed agents, four private fixture repositories and both fixture directories are removed; all four original native schedule definitions remain unchanged. Ordinary periodic checks require no shared-host patch or restart. Implementation publication remains the next user decision; see <a href="acceptance-evidence.md">acceptance evidence</a>.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked: publish the finished change after the chosen fixed-mode trial? → publish it; final checks and merge are authorized. Archive checkpoint retains branch <code>schedule-skill-proactive</code>, all 31 completed tasks, observed acceptance and cleanup. Prepare merged the latest published revision, numbered release 40.0.0 from 39.1.0, and passed every local check; shellcheck remains enabled in remote CI.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button>
  <div id="ready" hidden>
    <div class="row" id="ready-choose"><button type="button" data-ready="build">Build it</button><button type="button" data-ready="publish">Build and publish</button></div>
    <div class="row" id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><span>Goes live, can't be undone.</span><button type="button" data-ready="yes">Yes, publish</button><button type="button" data-ready="cancel">Cancel</button></div>
    <p id="ready-says" role="status" hidden></p>
  </div>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, sending = false;
  function setLive(key) {
    live = key;
    if (!key) $('ready').hidden = true;
    $('copy').textContent = key ? 'Send notes' : 'Copy notes';
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  function sendNotes() {
    const notes = unsent(), n = notes.length;
    if (sending || nothing('sent')) return;
    sending = true;
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      sending = false; setLive(null);
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    ask('send', live, { text: bullets(notes).join('\n') }).then(function (r) {
      if (r.status === 429) { sending = false; toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      r.json().then(function (answer) {
        if (!answer || answer.sent !== true) { closed(); return; }
        sending = false;
        notes.forEach(function (note) { note.sent = true; });
        persist();
        toast('Sent ' + plural(n) + ' to the chat.');
      }, closed);
    }, closed);
  }
  $('copy').addEventListener('click', function () {
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── ready: on a reply link that offers both, the bar's second row asks the chat to build, or to build and publish ──
  // The page sends an action's name and the version of the plan it read; the link's opener fixed each message.
  let version = null, acting = false;
  function says(text) { $('ready-says').textContent = text; $('ready-says').hidden = !text; bar(); }
  function readyStep(step) {
    $('ready-choose').hidden = step !== 'choose';
    $('ready-confirm').hidden = step !== 'confirm';
    bar();
  }
  // One primary button in the bar: the notes button while a note is unsent or no build button shows, else the build one.
  // The page's bottom padding follows the bar's height, so a taller bar never covers the end of the page.
  function bar() {
    const el = $('copy').parentNode, ready = $('ready');
    const build = !ready.hidden && !unsent().length && !($('ready-choose').hidden && $('ready-confirm').hidden);
    $('copy').classList.toggle('primary', !build);
    all('[data-ready="build"], [data-ready="yes"]', function (b) { b.classList.toggle('primary', build); });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  // Unsent notes would change the plan the chat is about to build: say so. True when it spoke.
  function notesFirst() {
    if (!unsent().length) return false;
    says('Send or delete your notes first.');
    return true;
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  function act(name) {
    if (acting || !live || notesFirst()) return;
    acting = true; says('');
    const closed = function () { acting = false; $('ready').hidden = true; bar(); toast('This link has closed. Choose in the chat.'); };
    ask('act', live, { action: name, version: version }).then(function (r) {
      if (r.status === 429) { acting = false; says('Wait a few seconds, then tap again.'); return; }
      r.json().then(function (answer) {
        const a = answer || {};
        const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
          : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
          : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
        if (!line) { closed(); return; }
        acting = false; readyStep('done'); says(line);
      }, closed);
    }, closed);
  }
  $('ready').addEventListener('click', function (e) {
    const step = e.target.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || (step === 'publish' && !notesFirst())) {
      says(''); readyStep(step === 'cancel' ? 'choose' : 'confirm');
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) ask('alive', key).then(function (r) {
    if (!r.ok) return;
    setLive(key);
    r.json().then(offer, function () { /* no actions: notes only */ });
  }, function () { /* not live: the page copies */ });
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
