# Schedule recurring work through Paseo

**Status:** ready-to-ship
**Branch:** explore/wongstack-vs-grokbot-muse
**Open questions:** none

## Why

Grok Bot and Muse run work on a schedule and come back only when they need you. WongStack says "WongStack does not install a scheduler", so you schedule by hand in the Paseo app. The runs on this host show three schedules made that way: `/improve` for ClaymooApp, `/process-source`, and a usage reset. Paseo already has schedules, worktree isolation, run logs, and phone approvals. What is missing is one command that sets a schedule up with the correct defaults. Also, `paseo schedule create` 0.9.2 cannot set worktree isolation, so a schedule made from the command line runs in your primary checkout, on top of your own work.

## What Changes

- New skill **`/routine`**. You say what to run and when, in your own words: `/routine every weekday at 9am: /improve`. The skill changes the time into a cron expression, shows the schedule, and creates it through the Paseo daemon. Any prompt or verb can be scheduled. (review.html#/routine-create)
- Each routine has fixed defaults, the same as the hand-made `/improve` schedule: a new agent in its own Paseo worktree of the repo's primary checkout, `bypassPermissions` for Claude or `full-access` for Codex, and the agent is kept after the run. A question from the run stays pending in Paseo until you answer it. The prompt runs exactly as you wrote it, with no unattended wording added.
- `/routine` with no argument lists this repo's routines, with cadence, next run, and last result. `pause`, `resume`, `run`, `logs`, `change`, and `delete` act on one routine, by name or id.
- A deterministic script, `routine.mjs`, does every Paseo call. It uses only Node's built-in modules and the installed Paseo CLI. It creates the schedule through the CLI's own daemon client, because the command line has no isolation flag. If that client is missing or has changed, the script creates no schedule. It prints the steps to make the schedule in the Paseo app instead. It never creates a schedule that runs in the primary checkout.
- When Paseo is not installed or its daemon does not answer, `/routine` says so. It prints the command to run later and changes nothing.
- The README command table, the [development hub](../../../wiki/development/README.md), and [required tools](../../../wiki/development/required-tools.md) name `/routine`. Paseo is listed as an optional tool, used only by `/routine`. [Repository improvement](../../../wiki/development/repository-improvement.md) gets one line that points Paseo users to `/routine`. Its scheduler requirements do not change.
- Release as WongStack 18.1.0.

**Non-goals:** No `/teach` or learn-from-a-demo skill. No approval rules: Claude Code's permission prompts and `paseo permit` already cover them. No notifications (Paseo already pushes to your phone). No recap, no memory `forget`, and no secret entry. No committed schedule file: Paseo keeps the schedules, and a rebuilt VM loses them. No scheduler for hosts without Paseo, and no Claude cloud routines or GitHub Actions cron. No change to `/improve`, its spec, or how any verb acts in a run. `/routine` is generic and has no `/improve` preset.

## Capabilities

### New Capabilities

- `paseo-routines`: The `/routine` skill and its script. It creates, lists, pauses, resumes, runs, changes, and deletes Paseo schedules for this repo with fixed isolation and permission defaults. It fails safe when Paseo or its client is missing.

### Modified Capabilities

None.

## Impact

This change adds `.claude/skills/routine/` (`SKILL.md` and `scripts/routine.mjs`) and `scripts/tests/routine.test.mjs`. It edits `payload-files.json`, `wiki/development/repository-improvement.md`, `wiki/development/required-tools.md`, `wiki/development/README.md`, `README.md`, `VERSION`, and `CHANGELOG.md`. Installed repos get `/routine` from `/wong-sync`. Existing Paseo schedules are not changed. The script relies on a private module of `@getpaseo/cli` 0.9.2, so a Paseo update can break creation. The script finds that break and stops. It does not fall back to local isolation.

## Decision log

- **2026-09-25** — Asked, in `/explore`, what WongStack lacks compared with Grok Bot and Muse → the user first chose `/teach` with schedules. Then they dropped `/teach`: "the only important part is likely the schedules part and being able to set that thru paseo".
- **2026-09-25** — Asked what runs scheduled work → chose Paseo when present.
- **2026-09-25** — Asked about memory `forget` → not in scope. Asked about other QoL items → the user said nothing else is needed, and that Claude Code already does approval rules.
- **2026-09-25** — Asked what can be scheduled → chose any prompt or verb.
- **2026-09-25** — Asked how a scheduled run acts when it needs you → chose the ClaymooApp defaults: `bypassPermissions` in its own worktree, with questions pending in Paseo.
- **2026-09-25** — Asked where schedules live → chose Paseo only, with nothing committed.
- **2026-09-25** — Found: `paseo schedule create` 0.9.2 has no isolation option. The CLI then sends no `isolation`, and the daemon uses `local`, so the run starts in the `--cwd` checkout. The daemon's `schedule/create` request and the in-agent `create_schedule` tool accept `isolation: worktree`. The in-agent tool has no mode field. Assumed: the script calls `connectScheduleClient` from the installed CLI's `dist/commands/schedule/shared.js` and sends one `scheduleCreate` with the full config. The reason: this is the only path that sets isolation and mode together in one call. The fallback is the Paseo app, not a local schedule.
- **2026-09-25** — Found: the daemon runs one schedule at a time. A schedule that is still running cannot start again (`Schedule … is already running`). This meets the guide's serialization rule for each routine. Two different routines can still overlap.
- **2026-09-25** — Assumed: the skill is named `routine`. `schedule` is taken by Claude Code's built-in skill for cloud routines, and the same name would split one request between two tools. The name is cheap to change in review.
- **2026-09-25** — Assumed: the working directory is the primary worktree, the first entry in `git worktree list --porcelain`, so a routine made from a feature worktree still bases its runs on the main checkout.
- **2026-09-25** — Assumed: the provider is the agent that runs `/routine`. The model is left to Paseo's default unless you name one. The timezone is the one you state, else the host's. The dry run shows the resolved timezone before you accept, so a wrong guess is visible. The next run time is reported after creation.
- **2026-09-25** — Assumed: the agent changes plain-language times into cron, and the script checks the five fields and reports the daemon's `nextRunAt`. Parsing the time needs judgment. Checking the result does not.
- **2026-09-25** — Assumed: `archiveOnFinish` is `false`, as in the ClaymooApp schedule. Runs often stop at a pending question or a background task, and an archived agent is harder to find and answer.
- **2026-09-25** — Assumed: the list is filtered to schedules whose target `cwd` is this repo's primary worktree. Schedules for other repos are hidden, not deleted.
- **2026-09-25** — Review page: one `flow` visual, `routine-create`, owned by the `/routine` bullet, with `after`, `today`, and `defaults` states. The defaults bullet has no anchor, because a visual has only one owning bullet. The review checker passes at 1280 px and 390 px. The author drew the confirmation after the create step, which was not correct; this was changed to a dry-run preview before the create, as the spec requires.
- **2026-09-25** — Asked whether to remove `/improve` → chose to keep the skill and decouple it from this change. The `repository-improvement` spec delta is dropped. The guide gets one pointer line, and the `CLAUDE.md` block is not edited, because its `/improve` sentence stays true: scheduling is still outside `/improve`. Also answered: `/ship` already distills each change's reusable memory facts into the owning wiki page before the archive, so no change is needed there.
- **2026-09-25** — Changed during apply: when Paseo is missing or its daemon does not answer, the reply prints the `routine.mjs create` command to run later, plus the Paseo app steps. It does not print a raw `paseo schedule create` command, because that command makes a local-isolation schedule, which the spec forbids.
- **2026-09-25** — Live check (tasks 1.2 and 3.3) on this host with Paseo 0.9.2. `routine.mjs create` made schedule `cb8d3d86` through `connectScheduleClient(selectDaemonTarget({}))`. The stored target is `cwd: /root/WongStack`, `isolation: worktree`, `modeId: bypassPermissions`, `archiveOnFinish: false`. `run` started one agent in a new Paseo worktree (`horrible-bird`), branched from `main` at `8609a37`, which equals `origin/main`. It replied `hello` and was kept, not archived. Local and remote `main` were equal, so this does not show whether Paseo bases worktrees on local `main` or on `origin/main`. The schedule is deleted and its workspace archived. After the cleanup below, a second create, change, and delete cycle (`c94d2e14`) also passed and left nothing behind.
- **2026-09-25** — Ran `/simplify`. Applied: one cron helper for create and change, one `paseo` lookup, a flat command dispatch, `inspect` calls in parallel, only the tested helpers exported, and shared constants in the tests. Skipped: moving list and manage to the private client, so that a Paseo client change breaks only `create`; a claim that the public `inspect --json` has no `cwd`, which is false on 0.9.2 (the live `ls` from ClaymooApp filtered correctly); limiting the duplicate-name check to this repo, because default names include the repo folder; and the `.claude/` path in the retry command, which is the payload convention.
- **2026-09-25** — Saved the implementation on PR #104 (`12daf5a`), and CI passed, which completes task 4.3. The new `paseo-routines` spec is reconciled into `openspec/specs/`.
- **2026-09-25** — Distilled facts before the archive: no reusable fact. The change's three live facts are a user preference and two open threads about Paseo (an upstream `--isolation` flag, and which ref a schedule worktree branches from). They are not reusable process.
- **2026-09-25** — Archive checkpoint from `/ship`: the change moved to `openspec/changes/archive/2026-09-25-add-paseo-routines` with `--skip-specs`, because the main `paseo-routines` spec already equals the delta.
