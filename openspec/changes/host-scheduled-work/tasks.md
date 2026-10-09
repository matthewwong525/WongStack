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
- [ ] 7.4 Through `/save` when required for published fixtures, trial a harmless Paseo routine that starts a later fresh session from its lightweight definition and remains scheduled after success, plus a finite goal on ordinary fixed-cadence Paseo Schedules that reads its published plan, checks completion each session, waits across sessions on a simulated user question, resumes on the identified answer, and stops on synthetic completion; inspect native state and evidence, send no real messages, and remove only the trial's jobs and records after verification.
- [x] 7.5 Check other available hosts using actual native tools and future-session capabilities, including the Claude name collision and cloud self-management restriction; record verified modes and unavailable capabilities without claiming untested support, and leave any substantive promised acceptance blocker open.
- [ ] 7.6 Rebuild the review page, report the observed host behavior and migration limits, and provide the host preview or linked read-only evidence for the normal publish decision; verify no business schedule or code is activated/published beyond the task's existing authorization.
