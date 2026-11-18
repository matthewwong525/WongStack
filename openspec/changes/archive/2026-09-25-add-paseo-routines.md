<!-- openspec-archive v1 2026-09-25-add-paseo-routines -->
<!-- file proposal.md utf8 10643 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 6654 -->
## Context

See [proposal.md](proposal.md) for why. The facts below come from the installed `@getpaseo/cli` 0.9.2 and the schedules on this host.

- The daemon stores each schedule as `~/.paseo/schedules/<id>.json`. A `new-agent` target has `provider`, `cwd`, `modeId`, `model`, `thinkingOptionId`, `archiveOnFinish`, `isolation` (`local` or `worktree`), and `title`.
- `paseo schedule create` builds the target from `--provider`, `--mode`, `--thinking`, and `--cwd` only. It sends no `isolation`, and the daemon's `createScheduleRunWorkspace` uses `config.isolation ?? "local"`. A schedule made from the command line runs in `--cwd` itself.
- The daemon's `schedule/create` request accepts the full config. The CLI reaches it through `connectScheduleClient()` in `dist/commands/schedule/shared.js`, then `client.scheduleCreate(input)`.
- `ls`, `inspect`, `logs`, `pause`, `resume`, `run-once`, `update`, and `delete` are public CLI commands with `--json`.
- The daemon refuses to start a schedule that is still running, so runs of one schedule never overlap.
- The hand-made schedules use `bypassPermissions` (Claude) and `full-access` (Codex), `isolation: worktree`, and a `cwd` that is the repo's primary checkout.

## Goals / Non-Goals

**Goals:**
- One sentence in chat makes a correct schedule. The time is given in plain language, and every other default is fixed.
- All Paseo calls are deterministic code with tests. The model only turns the time into cron and picks the prompt.
- Fail safe: an unknown Paseo change creates no schedule. It never creates a local-isolation schedule.

**Non-Goals:**
- No wrapper for Paseo features that `/routine` does not need (heartbeats, `--max-runs`, `--expires-in`, `--host`). You use `paseo` directly for those.
- No support for a remote daemon. The routine is created on the local daemon only.

## Decisions

### One skill, one script

`.claude/skills/routine/SKILL.md` reads the request. It changes the time into cron and calls `scripts/routine.mjs`. The script owns every Paseo call and prints JSON. The skill only formats the reply. The alternative, a skill that runs `paseo` commands itself, gives different flags on each run, and nothing tests it.

Script commands:

| Command | Does |
|---|---|
| `create --cron <expr> --prompt <text> [--name] [--timezone] [--agent claude\|codex] [--model] [--dry-run]` | Checks the input and sends one `scheduleCreate`. `--dry-run` prints the full request and sends nothing. The skill uses it for the confirmation. |
| `ls` | `paseo schedule ls --json`, then `inspect` for each result, in parallel. Keeps the entries whose `cwd` is the primary worktree. |
| `pause`, `resume`, `run`, `logs`, `delete <name\|id>` | Finds the routine among this repo's routines, then runs the matching public CLI command. |
| `change <name\|id> [--cron] [--timezone] [--prompt]` | `paseo schedule update` with the changed fields only. |

Exit codes: `0` ok. `2` bad input (cron, a name that matches nothing or several routines). `3` Paseo not installed. `4` daemon not answering. `5` the client module is missing or changed. Codes `3` to `5` return the fallback text, so the skill does not write it.

### Create through the CLI's own client

The script finds `paseo` on `PATH` and resolves its real path to the package root. It imports `dist/commands/schedule/shared.js` and checks that `connectScheduleClient` is a function and that the client has `scheduleCreate`. Then it sends:

```js
{ prompt, name, runOnCreate: false,
  cadence: { type: "cron", expression, timezone },
  target: { type: "new-agent", config: {
    provider, cwd: primaryWorktree, modeId, isolation: "worktree",
    archiveOnFinish: false, title: name, ...(model && { model }) } } }
```

Alternatives considered:

- **The public CLI, then an update for isolation.** `schedule update` has no isolation flag either, so this still needs the private client, and it can leave a local schedule if the second call fails.
- **The in-agent `create_schedule` tool.** It sets isolation but has no mode field, and a session only has it when the Paseo MCP server is attached.
- **Edit the JSON file and `paseo reload`.** This writes the daemon's private state while it runs.
- **Wait for an upstream `--isolation` flag.** This is the right end state. `routine.mjs` keeps the client call in one function, so a later CLI flag replaces one function.

### Primary worktree and provider

The primary worktree is the first `worktree` entry of `git worktree list --porcelain`. The skill passes `--agent`, which is the agent it runs in. The script maps `claude` to `bypassPermissions` and `codex` to `full-access`. An unknown agent is exit code `2`. It does not guess a mode.

### Name and match

The default name is the prompt's first word without the `/`, plus the repo folder name: `/improve` in `ClaymooApp` gives `improve ClaymooApp`. A name or id matches only among this repo's routines. An exact id wins. Then comes a case-insensitive exact name, then a unique id prefix. More than one match is exit code `2`, with the ids.

### Timezone

The script uses `--timezone` when it is given. Otherwise it uses `Intl.DateTimeFormat().resolvedOptions().timeZone`. The dry run shows the zone. On a UTC VM, a user who means local time sees `UTC` before they accept.

## Risks / Trade-offs

- [A Paseo update renames or moves `shared.js` or changes `scheduleCreate`] → Exit code `5` with the Paseo app steps. The test suite pins the request shape against a fake module. A thread records the upstream flag request.
- [The private client's `connectScheduleClient(target)` needs a daemon target object] → Task 1.2 reads `getDaemonHost` and passes the same value the CLI passes for the local home. This is checked against the live daemon before `/save`.
- [Two different routines run at the same time in one repo] → Each run has its own worktree, so the files do not collide. Git collisions stay the job of the verbs' own active-work checks, as for any two agents.
- [Paseo's worktree base can be the local branch, not the remote] → Task 3.3 checks it with a `run` of a test routine. If the base is out of date, the skill's reply says so. A verb that needs a current checkout keeps its own check.
- [A schedule with `bypassPermissions` runs any prompt with full permissions] → The user chose this. The confirmation names the mode before the schedule is created.

## Migration Plan

This is additive. `/wong-sync` installs the skill. Existing Paseo schedules are not read or changed, except when you act on them by name. To roll back, delete `.claude/skills/routine/`. The schedules it made stay in Paseo, and you manage them there.

<!-- end design.md -->
<!-- file tasks.md utf8 2941 -->
## 1. Script

- [x] 1.1 Create `.claude/skills/routine/scripts/routine.mjs` with the `create`, `ls`, `pause`, `resume`, `run`, `logs`, `change`, and `delete` commands and the exit codes in design.md. Use only Node built-ins plus the installed Paseo CLI. Build the create request and its defaults per review.html#/routine-create/defaults.
- [x] 1.2 Read `getDaemonHost` and `connectToDaemon` in the installed CLI. Pass the same local daemon target the CLI passes. Keep the client import and `scheduleCreate` call in one function, and return exit code `5` when the module or function is missing (review.html#/routine-create).
- [x] 1.3 Add `scripts/tests/routine.test.mjs`. Cover: cron field check, primary worktree from `git worktree list --porcelain` output, agent-to-mode mapping, default name, match rules (id, name, prefix, ambiguous), repo filter on `ls`, the exact create request against a fake Paseo package, exit codes `3`, `4`, and `5`, and no create call on `--dry-run`.

## 2. Skill

- [x] 2.1 Create `.claude/skills/routine/SKILL.md` with `name`, a trigger-rich `description` that names Paseo schedules (so it does not compete with the built-in cloud `schedule` skill), and `user-invocable: true`. Describe the flow in review.html#/routine-create: change the time to cron, run `create --dry-run`, show name, cron, timezone, mode, and prompt, then create and report the next run. Link [the ask convention](../../.claude/skills/explore/references/asking-the-user.md) for the confirmation. Do not copy it.
- [x] 2.2 Describe the no-argument list and the `pause`, `resume`, `run`, `logs`, `change`, and `delete` forms. Describe the fallback reply for exit codes `3` to `5`, printed from the script's output.
- [x] 2.3 Add `routine` to `core.skillDirs` in `.claude/skills/wong-sync/references/payload-files.json`.

## 3. Docs

- [x] 3.1 Add one line to "Run it on a cadence" in `wiki/development/repository-improvement.md` that points Paseo users to `/routine`. Do not change the four scheduler requirements or the `repository-improvement` spec.
- [x] 3.2 Add Paseo to `wiki/development/required-tools.md` as an optional tool that only `/routine` uses. Link `/routine` from the `wiki/development/README.md` hub. Add `/routine` to the README command table. Do not edit the `WONG-STACK` block in `CLAUDE.md`.
- [x] 3.3 Create a test routine on this host with `run` and `--max-runs 1`. Confirm that its agent starts in a new Paseo worktree based on the default branch, that the prompt is verbatim, and that the mode is correct. Delete it after. Record the result, and the worktree base, in the Decision log.

## 4. Release

- [x] 4.1 Bump `VERSION` to 18.1.0 and add a newest-first `CHANGELOG.md` entry for `/routine`.
- [x] 4.2 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`. Fix any dead link.
- [x] 4.3 Run `/save` so CI runs the suite with `routine.test.mjs`. The task is done when CI passes.

<!-- end tasks.md -->
<!-- file specs/paseo-routines/spec.md utf8 3856 -->
## Purpose

Lets a user put any prompt or WongStack verb on a recurring Paseo schedule from chat, with isolation and permission defaults that keep scheduled runs off the user's own checkout.

## ADDED Requirements

### Requirement: Create a routine from a plain-language request
The `/routine` skill SHALL accept a cadence and a prompt in the user's own words, convert the cadence to a five-field cron expression, and create one Paseo schedule for the prompt. It SHALL accept any prompt or verb. Before it creates the schedule, it SHALL show the name, the cron expression, the timezone, and the prompt. After creation, it SHALL report the next run time that the Paseo daemon returns.

#### Scenario: Weekday improve routine
- **WHEN** the user runs `/routine every weekday at 9am: /improve` in a repo with a running Paseo daemon
- **THEN** one schedule exists with cron `0 9 * * 1-5`, prompt `/improve`, and the stated or host timezone, and the reply states its next run time

#### Scenario: Invalid cron
- **WHEN** the resolved cadence is not a valid five-field cron expression
- **THEN** no schedule is created and the reply names the invalid field

### Requirement: Fixed run defaults
Each routine SHALL start a new agent in a Paseo worktree of the repo's primary worktree. It SHALL use the full-permission mode of the agent that ran `/routine`: `bypassPermissions` for Claude or `full-access` for Codex. The prompt SHALL be stored exactly as the user wrote it, with no added unattended wording. The run's agent SHALL NOT be archived when the run ends, so a pending question stays answerable in Paseo. The model SHALL be Paseo's default unless the user names one.

#### Scenario: Routine made from a feature worktree
- **WHEN** the user runs `/routine` from a linked worktree of the repo
- **THEN** the schedule's working directory is the primary worktree and its isolation is `worktree`

#### Scenario: Run needs an answer
- **WHEN** a scheduled run asks the user a question
- **THEN** the run's agent stays open in Paseo with the question pending

### Requirement: Never run in the primary checkout
The skill SHALL NOT create a schedule whose runs start directly in the primary checkout. If worktree isolation cannot be set, it SHALL create nothing and SHALL give the steps to create the schedule in the Paseo app.

#### Scenario: Paseo client changed
- **WHEN** the installed Paseo CLI no longer provides the daemon client that the skill uses to set isolation
- **THEN** no schedule is created, and the reply gives the Paseo app steps with the same cadence, prompt, and defaults

### Requirement: Manage this repo's routines
`/routine` with no argument SHALL list the Paseo schedules whose working directory is this repo's primary worktree, with name, cadence, status, next run, and the last run's result. The skill SHALL pause, resume, run once, show logs for, change the cadence or prompt of, and delete one routine, identified by name or id. Schedules for other directories SHALL NOT be listed or changed.

#### Scenario: List hides other repos
- **WHEN** the daemon has schedules for this repo and for another directory
- **THEN** the list shows only this repo's schedules

#### Scenario: Ambiguous name
- **WHEN** a name matches more than one of this repo's routines
- **THEN** nothing changes and the reply lists the matching ids

### Requirement: No Paseo, no change
When the `paseo` command is not installed or its daemon does not answer, the skill SHALL change nothing, SHALL say which of the two is the cause, and SHALL print the `/routine` script command that would create the routine once Paseo answers, with the Paseo app steps.

#### Scenario: Paseo not installed
- **WHEN** `/routine` runs on a host without `paseo` on PATH
- **THEN** no schedule is created and the reply says Paseo is not installed and shows the command to run later

<!-- end specs/paseo-routines/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-25

~~~
<!-- end .openspec.yaml -->
<!-- file review-visuals.html utf8 7543 fence=~~~ -->
~~~html
<section class="visual flow" id="routine-create" data-kind="flow" data-title="Create a routine" data-states="after today defaults" data-state="after">
  <p class="caption">Creating a scheduled run on Paseo, today and after this change.</p>
  <div class="frame">
    <div class="state state-after"><h2>After</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="rc-ask"><h3>Ask in your own words <span class="tag">New</span> <i class="callout">1</i></h3><p><code>/routine every weekday at 9am: /improve</code></p><details><summary>Details</summary><p>Actor: you. Action: give a time and any prompt or verb. Result: the agent reads the request.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="rc-resolve"><h3>Resolve and preview <span class="tag">New</span> <i class="callout">2</i></h3><p>The agent turns the time into cron. A dry run shows name, cron, timezone, mode, and prompt. You accept it.</p><details><summary>Details</summary><p>Actor: agent. Action: write <code>0 9 * * 1-5</code>; read the first entry of <code>git worktree list --porcelain</code>; use its own provider; use the stated timezone, else the host's; run <code>routine.mjs create --dry-run</code>, which sends nothing. Result: you see the full schedule before it exists.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="rc-create"><h3>Create through the daemon <span class="tag">New</span> <i class="callout">3</i></h3><p><code>routine.mjs</code> checks the cron. It sends one <code>scheduleCreate</code> with isolation <code>worktree</code>.</p><details><summary>Details</summary><p>Actor: script. Action: check the five cron fields; load the daemon client of the installed Paseo CLI; send the full config in one call. Result: the daemon stores the schedule and returns <code>nextRunAt</code>.</p></details></div>
      <p class="flow-connector">↓ If the call cannot be made</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="rc-no-paseo"><h3>Paseo missing or daemon silent <i class="callout">4</i></h3><p>Print the command to run later.</p><details><summary>Details</summary><p>Actor: script. Action: detect no <code>paseo</code> binary, or no daemon answer. Result: you get the command; nothing changes.</p></details></div>
        <div class="flow-branch" data-target-id="rc-no-client"><h3>Client module missing or changed <i class="callout">5</i></h3><p>Print the steps to make it in the Paseo app.</p><details><summary>Details</summary><p>Actor: script. Action: detect that the private client is absent or has a new shape. Result: you get app steps. The script never makes a local-isolation schedule.</p></details></div>
      </div>
      <p class="flow-connector">↓ Both paths end here</p>
      <div class="step flow-card" data-target-id="rc-nothing"><h3>Nothing created</h3><p>No schedule exists until you make one.</p></div>
      <p class="flow-connector">↓ If the call succeeds</p>
      <div class="step flow-card" data-target-id="rc-confirm"><h3>Report the next run <span class="tag">New</span> <i class="callout">6</i></h3><p>Shows the next run time that the daemon returns.</p><details><summary>Details</summary><p>Actor: script. Action: print the daemon's <code>nextRunAt</code> in the routine's timezone. Result: you know when the first run starts.</p></details></div>
      <p class="flow-connector">↓ At each run</p>
      <div class="step flow-card" data-target-id="rc-run"><h3>Run in its own worktree <span class="tag">Changed</span> <i class="callout">7</i></h3><p>A new agent starts in its own Paseo worktree. A question stays pending in Paseo for you.</p><details><summary>Details</summary><p>Actor: Paseo. Action: start a new agent from the primary checkout. Result: your own work is not touched; the agent is kept after the run.</p></details></div>
    </div><p><a href="#/routine-create/defaults">See the fixed defaults</a></p></div>
    <div class="state state-today"><h2>Today</h2>
      <div class="step flow-card">Start: you want <code>/improve</code> every weekday</div>
      <p class="flow-connector">↓ Choose one path</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="rc-today-app"><h3>Paseo app, by hand</h3><p>Pick provider, mode, worktree isolation, cwd, and cron.</p><details><summary>Details</summary><p>Actor: you. Action: fill each field for each schedule. Result: correct only when you remember every field.</p></details></div>
        <div class="flow-branch" data-target-id="rc-today-cli"><h3><code>paseo schedule create</code> <span class="tag">Defect</span> <i class="callout">8</i></h3><p>Version 0.9.2 has no isolation flag.</p><details><summary>Details</summary><p>Actor: CLI. Action: send no <code>isolation</code>; the daemon uses <code>local</code>. Result: the run starts in the primary checkout, on top of your own work.</p></details></div>
      </div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card">Finish: a schedule, set up by hand each time</div>
    </div>
    <div class="state state-defaults"><h2>Fixed defaults</h2>
      <div class="box" data-target-id="rc-defaults">
        <dl class="kv">
          <dt>Agent</dt><dd>A new agent at each run</dd>
          <dt>Isolation</dt><dd><code>worktree</code> of the primary worktree (first entry of <code>git worktree list --porcelain</code>) <i class="callout">9</i></dd>
          <dt>Mode</dt><dd><code>bypassPermissions</code> (Claude) / <code>full-access</code> (Codex)</dd>
          <dt>Provider</dt><dd>The agent that runs <code>/routine</code></dd>
          <dt>Model</dt><dd>Paseo default, unless you name one</dd>
          <dt>archiveOnFinish</dt><dd><code>false</code> <i class="callout">10</i></dd>
          <dt>Prompt</dt><dd>Stored exactly as you wrote it; no unattended wording added</dd>
          <dt>Timezone</dt><dd>The one you state, else the host's</dd>
        </dl>
      </div>
    </div>
  </div>
  <div class="notes">
    <p class="brief"><b>Who / job:</b> a repo owner who wants a verb to run on a cadence. <b>Done:</b> Paseo holds a correct schedule and shows its next run.</p>
    <ol>
      <li>Any prompt or verb can follow the colon. The skill does not change it.</li>
      <li>Parsing the time needs judgment, so the agent does it. The dry run shows the result before anything is created. The primary worktree is used even when you call <code>/routine</code> from a feature worktree.</li>
      <li>This is the only path that sets isolation and mode together in one call. Checking the cron needs no judgment, so the script does it.</li>
      <li>Fail safe: without Paseo, <code>/routine</code> says so and changes nothing.</li>
      <li>The client is a private module of the Paseo CLI. A Paseo update can break it. The script stops and does not fall back to local isolation.</li>
      <li>The next run comes from the daemon, not from the agent, so it is the time Paseo will really use.</li>
      <li>The daemon runs one schedule at a time. A routine that is still running does not start again.</li>
      <li>This is the defect the change removes: a command-line schedule runs on top of your own work.</li>
      <li>These are the same defaults as the hand-made ClaymooApp <code>/improve</code> schedule.</li>
      <li>Runs often stop at a pending question. A kept agent is easier to find and answer than an archived one.</li>
    </ol>
  </div>
</section>

~~~
<!-- end review-visuals.html -->
<!-- file review.html utf8 54163 fence=~~~ -->
~~~html
<!-- wong-review:2 -->
<!doctype html>
<!--
  WongStack review kit. The shared offline viewer lives here.
  Authors write review-visuals.html using review-author.md and review-examples.html.
  build-review.mjs fills the proposal and visual slots. Generated pages contain
  the viewer, so archives open without a server or adjacent source files.
-->

<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review — 2026-09-25-add-paseo-routines</title>
<style>
  :root { --ink:#333; --line:#9a9a9a; --fill:#e9e9e9; --fill2:#f6f6f6; --note:#fff4c2; --mark:#1a73e8; --markbg:#eaf2fd; }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.4 "Helvetica Neue", Arial, sans-serif; color:var(--ink); background:#d9d9d9; }
  a { color:inherit; }

  /* chrome: the reviewer's toolbar */
  .chrome { position:sticky; top:0; z-index:9; background:#222; color:#eee; padding:8px 14px; display:flex; gap:18px; align-items:center; flex-wrap:wrap; font-size:13px; min-height:41px; }
  .chrome b { font-weight:600; }
  .chrome .group { display:flex; gap:6px; align-items:center; }
  .chrome .group:empty { display:none; }
  .chrome button { font:inherit; padding:3px 9px; background:#444; color:#eee; border:1px solid #666; border-radius:3px; cursor:pointer; }
  .chrome button[aria-pressed="true"] { background:#eee; color:#222; }
  .chrome button.annotate[aria-pressed="true"] { background:var(--mark); color:#fff; border-color:var(--mark); }
  .chrome .hint { opacity:.7; margin-left:auto; }
  .chrome .tools { display:contents; }
  .chrome .tools-toggle { display:none; }

  /* layout: What Changes panel + stage */
  .layout { display:flex; align-items:flex-start; }
  .panel { flex:0 0 340px; position:sticky; top:41px; max-height:calc(100vh - 41px); overflow:auto; background:#fff; border-right:2px solid var(--line); padding:16px 18px; font-size:13px; }
  .panel h2 { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#666; margin:18px 0 6px; }
  .panel h2:first-child { margin-top:0; }
  .panel p { margin:0 0 8px; }
  .panel ol.changes { margin:0; padding:0; list-style:none; counter-reset:c; }
  .panel ol.changes li { counter-increment:c; position:relative; margin:0 0 4px; padding:6px 8px 6px 30px; border:1px solid transparent; border-radius:3px; cursor:pointer; }
  .panel ol.changes li::before { content:counter(c); position:absolute; left:8px; top:7px; width:16px; height:16px; border-radius:50%; background:var(--fill); color:#666; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .panel ol.changes li:hover { background:var(--fill2); }
  .panel ol.changes li.on { border-color:var(--mark); background:var(--markbg); }
  .panel ol.changes li.on::before { background:var(--mark); color:#fff; }
  .panel ol.changes li .kind { display:block; font-size:11px; color:var(--mark); margin-top:2px; }
  .panel ol.changes li.dead .kind { color:#c00; }
  .panel ol.changes li.text .kind { color:#888; }
  .panel code { background:var(--fill); padding:0 3px; overflow-wrap:anywhere; }
  .panel .notes-list { margin:0; padding-left:18px; }
  .panel .notes-list li { margin:0 0 6px; cursor:pointer; }
  .panel .notes-list .where { color:#666; font-size:11px; display:block; }
  .panel .notes-list button { border:0; background:none; color:var(--ink); text-align:left; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-list { margin:0; padding-left:18px; }
  .panel .draft-list li { margin:0 0 6px; }
  .panel .draft-list button { border:0; background:none; color:var(--ink); text-align:left; text-decoration:underline; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-count { display:inline-block; margin-left:6px; padding:0 6px; border:1px solid var(--line); border-radius:12px; white-space:nowrap; }
  .panel .empty { color:#666; list-style:none; margin-left:-18px; }
  .stage { flex:1; min-width:0; }
  .item-header { max-width:960px; margin:24px auto 0; padding:20px 24px; background:#fff; border:2px solid var(--line); overflow-wrap:anywhere; }
  .item-header[hidden] { display:none; }
  .item-header h1 { margin:0; font-size:20px; scroll-margin-top:calc(var(--chrome-h, 41px) + 12px); }
  .item-header .position { margin:0 0 10px; color:#666; font-size:13px; }

  /* one visual at a time */
  .visual:not([data-active]) { display:none !important; }
  .visual[data-active] { display:block !important; }
  .frame { max-width:960px; margin:12px auto 24px; background:#fff; border:2px solid var(--line); box-shadow:0 2px 0 #bbb; overflow-wrap:anywhere; }
  .visual:not(.screen) .frame { padding:24px; }
  .caption { max-width:960px; margin:12px auto 0; font-size:12px; color:#666; }
  .caption + .frame { margin-top:6px; }
  .state { display:none; }
  .state[data-on] { display:block; }

  /* lo-fi screen primitives — the screen visual's vocabulary */
  .topbar { display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:2px solid var(--line); background:var(--fill2); }
  .logo { width:34px; height:34px; border:2px solid var(--line); background:var(--fill); position:relative; }
  .logo::before, .logo::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 48%, var(--line) 48%, var(--line) 52%, transparent 52%); }
  .logo::after { transform:scaleX(-1); }
  .nav { display:flex; gap:14px; }
  .nav span { padding:4px 0; border-bottom:2px solid transparent; }
  .nav span.on { border-color:var(--ink); font-weight:600; }
  .body { padding:20px; }
  h1 { font-size:20px; margin:0; }
  .row { display:flex; gap:12px; align-items:center; }
  .row.between { justify-content:space-between; }
  .btn { display:inline-block; padding:7px 14px; border:2px solid var(--ink); border-radius:3px; background:#fff; cursor:pointer; user-select:none; }
  .btn.primary { background:var(--ink); color:#fff; }
  .btn.ghost { border-color:transparent; text-decoration:underline; }
  .input { display:inline-block; min-width:220px; padding:7px 10px; border:2px solid var(--line); border-radius:3px; background:#fff; color:#888; }
  table { width:100%; border-collapse:collapse; margin-top:16px; }
  th { text-align:left; font-size:12px; color:#666; border-bottom:2px solid var(--line); padding:8px 6px; }
  td { padding:10px 6px; border-bottom:1px solid #ddd; }
  tr.click { cursor:pointer; }
  .tag { display:inline-block; padding:1px 8px; border:1px solid var(--line); border-radius:10px; font-size:12px; }
  .box { border:2px dashed var(--line); background:var(--fill2); padding:30px; text-align:center; color:#666; margin-top:16px; }
  .skeleton { height:14px; background:var(--fill); margin:14px 0; width:70%; }
  .skeleton.s { width:40%; }
  .kv { display:grid; grid-template-columns:140px 1fr; gap:8px 12px; margin:16px 0; }
  .kv dt { color:#666; } .kv dd { margin:0; }
  .muted { color:#666; }
  .hero { height:120px; background:var(--fill); border:2px solid var(--line); position:relative; margin:12px 0; }
  .hero::before, .hero::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 49.5%, var(--line) 49.5%, var(--line) 50.5%, transparent 50.5%); }
  .hero::after { transform:scaleX(-1); }
  .callout { display:inline-flex; width:18px; height:18px; border-radius:50%; background:#c00; color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; }
  .notes { max-width:960px; margin:0 auto 40px; background:var(--note); border:1px solid #d8c66a; padding:12px 18px; font-size:13px; }
  .notes ol { margin:6px 0 0; padding-left:20px; }
  .notes .brief { margin:0 0 6px; }

  /* flow: lanes of steps */
  .lane { display:flex; align-items:center; gap:10px; padding:10px 0; flex-wrap:wrap; }
  .lane + .lane { border-top:1px solid #ddd; }
  .lane .label { flex:0 0 70px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; }
  .lane.today .step { color:#777; border-style:dashed; }
  .step { padding:8px 12px; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-sequence { max-width:720px; margin:0 auto; }
  .flow-card, .flow-branch { display:block; padding:14px; min-width:0; overflow-wrap:anywhere; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-card h3, .flow-branch h3 { margin:0 0 7px; font-size:15px; }
  .flow-card p, .flow-branch p { margin:0; }
  .flow-card details, .flow-branch details { border-top:1px solid #d5d5d5; margin-top:11px; padding-top:9px; }
  .flow-card details p, .flow-branch details p { margin-top:8px; }
  .flow-connector { text-align:center; margin:10px 0; color:#666; font-weight:600; }
  .flow-branches { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; }
  .step.gone { text-decoration:line-through; color:#999; }
  .arrow { color:#999; }
  .arrow::before { content:"→"; }

  /* diff: before / after text */
  .diff { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .diff > div > .label, .tree .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:6px; }
  .diff pre { margin:0; padding:10px 12px; background:var(--fill2); border:1px solid #ddd; font:12px/1.5 Menlo, Consolas, monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
  .diff .line { display:block; }
  .diff .del { color:#999; text-decoration:line-through; }
  .diff .add { border-left:3px solid var(--mark); margin-left:-12px; padding-left:9px; background:var(--markbg); }

  /* tree: files touched */
  .tree ul { list-style:none; margin:0; padding:0; font:13px/1.8 Menlo, Consolas, monospace; }
  .tree li { padding-left:4px; }
  .tree li::before { display:inline-block; width:18px; color:#888; }
  .tree li.add::before { content:"+"; color:var(--mark); font-weight:700; }
  .tree li.edit::before { content:"~"; }
  .tree li.del::before { content:"−"; }
  .tree li.del { color:#999; text-decoration:line-through; }
  .tree li .why { color:#666; font:12px "Helvetica Neue", Arial, sans-serif; margin-left:10px; }

  /* text stage: a bullet with no visual, and the landing */
  .textstage h1 { font-size:22px; margin:0 0 12px; }
  .textstage p { font-size:16px; max-width:640px; }
  .textstage ol { font-size:15px; max-width:640px; padding-left:22px; }
  .textstage ol li { margin:0 0 6px; cursor:pointer; }
  .textstage ol li:hover { text-decoration:underline; }
  .textstage .muted { font-size:13px; }

  /* highlight: the mark named by the hash */
  .marked { outline:3px solid var(--mark); outline-offset:3px; box-shadow:0 0 0 6px var(--markbg); }
  tr.marked { outline-offset:0; }
  .diff .add.marked, .tree li.marked { outline-offset:0; box-shadow:none; }

  /* annotate */
  body.annotating .visual[data-active] .frame { cursor:crosshair; }
  .hovering { outline:2px dashed var(--mark); outline-offset:2px; }
  .pin { display:inline-flex; width:18px; height:18px; border-radius:3px; background:var(--mark); color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; cursor:pointer; }
  .pin.stale { background:#999; }
  .popover { position:fixed; z-index:10; width:300px; background:#fff; border:2px solid var(--mark); border-radius:4px; padding:10px; box-shadow:0 4px 14px rgba(0,0,0,.25); font-size:13px; }
  .popover .where { color:#666; font-size:11px; margin-bottom:6px; word-break:break-word; }
  .popover textarea { width:100%; height:70px; font:inherit; padding:6px; border:1px solid var(--line); border-radius:3px; resize:vertical; }
  .popover .row { margin-top:8px; }
  .popover button { font:inherit; padding:4px 10px; border:1px solid var(--line); background:#fff; border-radius:3px; cursor:pointer; }
  .popover button.save { background:var(--mark); color:#fff; border-color:var(--mark); }
  .popover .del { margin-left:auto; color:#c00; }
  .popover .status { margin:8px 0 0; color:#666; }
  .storage-status { font-size:12px; color:#666; }
  .toast { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#222; color:#eee; padding:8px 14px; border-radius:3px; font-size:13px; z-index:11; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
  #copybuf { position:fixed; left:-9999px; top:0; }
  .error { color:#c00; }

  /* chrome extras: step through changes, phone/desktop view, the panel toggle */
  .chrome .count { opacity:.8; min-width:44px; text-align:center; white-space:nowrap; }
  .chrome .menu { display:none; }
  .panel { top:var(--chrome-h, 41px); max-height:calc(100vh - var(--chrome-h, 41px)); }

  /* viewport: walk a screen at phone width from a desktop */
  body[data-viewport="phone"] .visual.screen .frame { max-width:390px; }
  body[data-viewport="phone"] .desktop-only, body[data-viewport="desktop"] .phone-only { display:none !important; }
  .visual.screen .body { min-width:0; overflow-wrap:anywhere; }

  /* phone: stage full width, the list is a sheet, the note box docks to the bottom */
  @media (max-width: 760px) {
    body { font-size:15px; }
    .chrome { display:grid; grid-template-columns:auto 1fr auto; gap:6px; padding:6px 8px; }
    .chrome > b, .chrome .hint, .chrome #viewport { display:none !important; }
    .chrome .menu, .chrome .tools-toggle { display:inline-block; }
    .chrome > .group { justify-content:center; gap:4px; }
    .chrome .tools { display:none; grid-column:1 / -1; min-width:0; }
    .chrome .tools.open { display:flex; flex-wrap:wrap; gap:8px; padding-top:6px; }
    .chrome .tools .group { flex-wrap:wrap; min-width:0; }
    .chrome .tools button { max-width:100%; overflow-wrap:anywhere; }
    .layout { display:block; }
    .panel { display:none; position:fixed; left:0; right:0; bottom:0; z-index:8; border-right:0; padding:14px 16px 40px; }
    body.menu .panel { display:block; }
    .panel ol.changes li { padding:10px 10px 10px 32px; }
    .frame { margin:12px 8px; }
    .item-header { margin:12px 8px 0; padding:14px; }
    .caption { margin:12px 8px 0; }
    .notes { margin:0 8px 24px; }
    .visual:not(.screen) .frame { padding:14px; }
    .body { padding:14px; }
    .diff { grid-template-columns:1fr; }
    .flow-branches { grid-template-columns:1fr; }
    .textstage p, .textstage ol { font-size:16px; }
    .popover { left:8px !important; right:8px; bottom:8px; top:auto !important; width:auto; }
    body.editor-open .stage { padding-bottom:240px; }
    .popover textarea { font-size:16px; height:90px; }
    .popover button { padding:8px 14px; }
    .chrome button { min-height:40px; min-width:40px; padding:6px 8px; }
  }
</style>
</head>
<body>

<div class="chrome">
  <b>Review · 2026-09-25-add-paseo-routines</b>
  <button class="menu" id="menu" aria-expanded="false" aria-controls="panel">Changes</button>
  <div class="group"><button id="prev" title="Previous change" aria-label="Previous change">‹</button><span class="count" id="count"></span><button id="next" title="Next change" aria-label="Next change">›</button></div>
  <button class="tools-toggle" id="tools-toggle" aria-expanded="false" aria-controls="tools">Tools</button>
  <div class="tools" id="tools">
  <div class="group" id="states"></div>
  <div class="group" id="viewport"><span>View:</span><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>
  <div class="group">
    <button class="annotate" id="annotate" aria-pressed="false">✎ Annotate</button>
    <button id="copy">Copy notes</button>
    <span class="storage-status" id="storage-status" hidden>Notes and drafts last for this session only.</span>
  </div>
  </div>
  <span class="hint">Click a change on the left. Grey = layout only. Blue = what changes. Red dots = reasoning below.</span>
</div>

<script type="text/markdown" id="proposal">
<!-- proposal:start -->
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
<!-- proposal:end -->
</script>

<div class="layout">
<aside class="panel" id="panel"></aside>
<div class="stage" id="stage">
<header class="item-header" id="item-header" hidden><p class="position" id="item-position"></p><h1 id="item-title" tabindex="-1"></h1></header>

<!-- short fallback for an empty proposal or an invalid direct link -->
<section class="visual textstage" id="_landing" data-kind="text">
  <div class="frame" id="landing"></div>
</section>

<!-- text stage for a bullet with no visual -->
<section class="visual textstage" id="_text" data-kind="text">
  <div class="frame" id="textframe"></div>
</section>

<section class="visual flow" id="routine-create" data-kind="flow" data-title="Create a routine" data-states="after today defaults" data-state="after">
  <p class="caption">Creating a scheduled run on Paseo, today and after this change.</p>
  <div class="frame">
    <div class="state state-after"><h2>After</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="rc-ask"><h3>Ask in your own words <span class="tag">New</span> <i class="callout">1</i></h3><p><code>/routine every weekday at 9am: /improve</code></p><details><summary>Details</summary><p>Actor: you. Action: give a time and any prompt or verb. Result: the agent reads the request.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="rc-resolve"><h3>Resolve and preview <span class="tag">New</span> <i class="callout">2</i></h3><p>The agent turns the time into cron. A dry run shows name, cron, timezone, mode, and prompt. You accept it.</p><details><summary>Details</summary><p>Actor: agent. Action: write <code>0 9 * * 1-5</code>; read the first entry of <code>git worktree list --porcelain</code>; use its own provider; use the stated timezone, else the host's; run <code>routine.mjs create --dry-run</code>, which sends nothing. Result: you see the full schedule before it exists.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="rc-create"><h3>Create through the daemon <span class="tag">New</span> <i class="callout">3</i></h3><p><code>routine.mjs</code> checks the cron. It sends one <code>scheduleCreate</code> with isolation <code>worktree</code>.</p><details><summary>Details</summary><p>Actor: script. Action: check the five cron fields; load the daemon client of the installed Paseo CLI; send the full config in one call. Result: the daemon stores the schedule and returns <code>nextRunAt</code>.</p></details></div>
      <p class="flow-connector">↓ If the call cannot be made</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="rc-no-paseo"><h3>Paseo missing or daemon silent <i class="callout">4</i></h3><p>Print the command to run later.</p><details><summary>Details</summary><p>Actor: script. Action: detect no <code>paseo</code> binary, or no daemon answer. Result: you get the command; nothing changes.</p></details></div>
        <div class="flow-branch" data-target-id="rc-no-client"><h3>Client module missing or changed <i class="callout">5</i></h3><p>Print the steps to make it in the Paseo app.</p><details><summary>Details</summary><p>Actor: script. Action: detect that the private client is absent or has a new shape. Result: you get app steps. The script never makes a local-isolation schedule.</p></details></div>
      </div>
      <p class="flow-connector">↓ Both paths end here</p>
      <div class="step flow-card" data-target-id="rc-nothing"><h3>Nothing created</h3><p>No schedule exists until you make one.</p></div>
      <p class="flow-connector">↓ If the call succeeds</p>
      <div class="step flow-card" data-target-id="rc-confirm"><h3>Report the next run <span class="tag">New</span> <i class="callout">6</i></h3><p>Shows the next run time that the daemon returns.</p><details><summary>Details</summary><p>Actor: script. Action: print the daemon's <code>nextRunAt</code> in the routine's timezone. Result: you know when the first run starts.</p></details></div>
      <p class="flow-connector">↓ At each run</p>
      <div class="step flow-card" data-target-id="rc-run"><h3>Run in its own worktree <span class="tag">Changed</span> <i class="callout">7</i></h3><p>A new agent starts in its own Paseo worktree. A question stays pending in Paseo for you.</p><details><summary>Details</summary><p>Actor: Paseo. Action: start a new agent from the primary checkout. Result: your own work is not touched; the agent is kept after the run.</p></details></div>
    </div><p><a href="#/routine-create/defaults">See the fixed defaults</a></p></div>
    <div class="state state-today"><h2>Today</h2>
      <div class="step flow-card">Start: you want <code>/improve</code> every weekday</div>
      <p class="flow-connector">↓ Choose one path</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="rc-today-app"><h3>Paseo app, by hand</h3><p>Pick provider, mode, worktree isolation, cwd, and cron.</p><details><summary>Details</summary><p>Actor: you. Action: fill each field for each schedule. Result: correct only when you remember every field.</p></details></div>
        <div class="flow-branch" data-target-id="rc-today-cli"><h3><code>paseo schedule create</code> <span class="tag">Defect</span> <i class="callout">8</i></h3><p>Version 0.9.2 has no isolation flag.</p><details><summary>Details</summary><p>Actor: CLI. Action: send no <code>isolation</code>; the daemon uses <code>local</code>. Result: the run starts in the primary checkout, on top of your own work.</p></details></div>
      </div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card">Finish: a schedule, set up by hand each time</div>
    </div>
    <div class="state state-defaults"><h2>Fixed defaults</h2>
      <div class="box" data-target-id="rc-defaults">
        <dl class="kv">
          <dt>Agent</dt><dd>A new agent at each run</dd>
          <dt>Isolation</dt><dd><code>worktree</code> of the primary worktree (first entry of <code>git worktree list --porcelain</code>) <i class="callout">9</i></dd>
          <dt>Mode</dt><dd><code>bypassPermissions</code> (Claude) / <code>full-access</code> (Codex)</dd>
          <dt>Provider</dt><dd>The agent that runs <code>/routine</code></dd>
          <dt>Model</dt><dd>Paseo default, unless you name one</dd>
          <dt>archiveOnFinish</dt><dd><code>false</code> <i class="callout">10</i></dd>
          <dt>Prompt</dt><dd>Stored exactly as you wrote it; no unattended wording added</dd>
          <dt>Timezone</dt><dd>The one you state, else the host's</dd>
        </dl>
      </div>
    </div>
  </div>
  <div class="notes">
    <p class="brief"><b>Who / job:</b> a repo owner who wants a verb to run on a cadence. <b>Done:</b> Paseo holds a correct schedule and shows its next run.</p>
    <ol>
      <li>Any prompt or verb can follow the colon. The skill does not change it.</li>
      <li>Parsing the time needs judgment, so the agent does it. The dry run shows the result before anything is created. The primary worktree is used even when you call <code>/routine</code> from a feature worktree.</li>
      <li>This is the only path that sets isolation and mode together in one call. Checking the cron needs no judgment, so the script does it.</li>
      <li>Fail safe: without Paseo, <code>/routine</code> says so and changes nothing.</li>
      <li>The client is a private module of the Paseo CLI. A Paseo update can break it. The script stops and does not fall back to local isolation.</li>
      <li>The next run comes from the daemon, not from the agent, so it is the time Paseo will really use.</li>
      <li>The daemon runs one schedule at a time. A routine that is still running does not start again.</li>
      <li>This is the defect the change removes: a command-line schedule runs on top of your own work.</li>
      <li>These are the same defaults as the hand-made ClaymooApp <code>/improve</code> schedule.</li>
      <li>Runs often stop at a pending question. A kept agent is easier to find and answer than an archived one.</li>
    </ol>
  </div>
</section>

</div><!-- /stage -->
</div><!-- /layout -->

<div class="toast" id="toast"></div>
<textarea id="copybuf" aria-hidden="true"></textarea>

<script>
  // kit: a load-time failure shows on the page instead of a blank stage
  window.addEventListener('error', function (e) {
    var p = document.getElementById('panel');
    if (p) p.innerHTML = '<p class="error"><b>Review script error:</b> ' + String(e.message).replace(/</g, '&lt;') + ' <span class="muted">(line ' + e.lineno + ')</span></p>' + p.innerHTML;
  });

  // ── routing: #/<visual>[/<state>][/<mark>] ──
  const FILE = 'review.html';
  const CHANGE = document.title.replace(/^Review — /, '');
  const visuals = [...document.querySelectorAll('.visual')];
  const $states = document.getElementById('states');
  const $panel = document.getElementById('panel');
  let current = { id: '_landing', state: 'default', mark: null, bullet: -1 };
  let bullets = [];   // [{text, anchor, id, state, mark, ok}]

  function statesOf(v) { return (v.dataset.states || 'default').split(' '); }
  // resolve the two optional segments: a state if it names one, else a mark
  function resolve(id, a, b) {
    const v = visuals.find(x => x.id === id);
    if (!v || id[0] === '_') return null;
    const allowed = statesOf(v);
    let state, mark;
    if (a && allowed.includes(a)) { state = a; mark = b || null; }
    else if (a && b) return null;               // a is not a state, but a mark follows: bad state
    else { state = allowed[0]; mark = a || null; }
    if (mark && !v.querySelector('[data-mark="' + mark + '"]')) return null;
    return { v, state, mark };
  }
  function ownerIndex(id) { return bullets.findIndex(x => x.ok && x.id === id); }
  function show(id, a, b) {
    if ($pop) closePopover(false);
    const r = resolve(id, a, b);
    const v = r ? r.v : visuals.find(x => x.id === (id === '_text' ? '_text' : '_landing'));
    const state = r ? r.state : 'default', mark = r ? r.mark : null;
    visuals.forEach(x => x.toggleAttribute('data-active', x === v));
    v.dataset.state = state;
    v.querySelectorAll('.state').forEach(function (block) { block.toggleAttribute('data-on', block.classList.contains('state-' + state)); });
    current = { id: v.id, state, mark, bullet: r ? ownerIndex(v.id) : -1 };
    document.querySelectorAll('.marked').forEach(x => x.classList.remove('marked'));
    if (mark) v.querySelectorAll('[data-mark="' + mark + '"]').forEach(x => x.classList.add('marked'));
    renderStates(v, state);
    renderHeader();
    renderPanelState();
    renderFeedback();
    const multi = statesOf(v).length > 1;
    const want = v.id[0] === '_' ? '#/' : '#/' + v.id + (multi && (state !== statesOf(v)[0] || mark) ? '/' + state : '') + (mark ? '/' + mark : '');
    if (location.hash !== want) { try { history.replaceState(null, '', want); } catch (e) { location.hash = want; } }
  }
  function showText(i) {      // a bullet with no visual
    document.getElementById('textframe').innerHTML = '<p class="muted">No visual for this change. Read its full text above and leave feedback if needed.</p>';
    current = { id: '_text', state: 'default', mark: null, bullet: i };
    document.querySelectorAll('.marked').forEach(function (x) { x.classList.remove('marked'); });
    visuals.forEach(x => x.toggleAttribute('data-active', x.id === '_text'));
    renderStates(null); renderHeader(); renderPanelState(); renderFeedback();
    try { history.replaceState(null, '', '#/change/' + (i + 1)); } catch (e) { location.hash = '#/change/' + (i + 1); }
  }
  function renderStates(v, state) {
    $states.innerHTML = '';
    if (!v || statesOf(v).length < 2) return;
    const lab = document.createElement('span'); lab.textContent = 'State:'; $states.appendChild(lab);
    statesOf(v).forEach(st => {
      const b = document.createElement('button');
      b.textContent = st; b.setAttribute('aria-pressed', st === state);
      b.onclick = () => { show(v.id, st, null); requestAnimationFrame(() => window.scrollTo(0, 0)); }; $states.appendChild(b);
    });
  }
  function fromHash() {
    const seg = location.hash.split('/').slice(1);
    // no change chosen: a phone opens the list over the landing, a desktop opens the first bullet
    if (!seg[0] && bullets.length) {
      if (!phoneMedia.matches) return goBullet(0);
      show('_landing', null, null);
      return setMenu(true);
    }
    if (seg[0] === 'change' && bullets[+seg[1] - 1]) return goBullet(+seg[1] - 1);
    show(seg[0] || '_landing', seg[1] || null, seg[2] || null);
  }
  window.addEventListener('hashchange', fromHash);

  // ── proposal panel + landing ──
  function inline(md) {
    return md.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }
  function renderHeader() {
    const header = document.getElementById('item-header');
    const b = bullets[current.bullet];
    header.hidden = !b;
    if (!b) return;
    document.getElementById('item-position').textContent = 'Change ' + (current.bullet + 1) + ' of ' + bullets.length;
    document.getElementById('item-title').innerHTML = inline(b.text);
  }
  function parseProposal() {
    const raw = document.getElementById('proposal').textContent.replace(/<\\\/script/gi, '</script').replace(/<!--[\s\S]*?-->/g, '');
    const sections = {}; let cur = null;
    raw.split('\n').forEach(line => {
      const h = line.match(/^## (.+)/);
      if (h) { cur = h[1].trim(); sections[cur] = []; return; }
      if (cur) sections[cur].push(line);
    });
    const why = (sections['Why'] || []).join('\n').trim().split(/\n\s*\n/).map(p => '<p>' + inline(p.replace(/\n/g, ' ')) + '</p>').join('');
    bullets = []; let tail = [];
    const items = []; let open = false;   // fold a wrapped bullet back onto one line
    (sections['What Changes'] || []).forEach(line => {
      if (/^- /.test(line)) { items.push(line); open = true; return; }
      if (open && line.trim()) { items[items.length - 1] += ' ' + line.trim(); return; }
      if (!line.trim()) open = false;
      items.push(line);
    });
    items.forEach(line => {
      const li = line.match(/^- (.+)/);
      if (!li) { if (line.trim()) tail.push(line.trim()); return; }
      const m = li[1].match(/\(?(?:review\.html)?#\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?\)?\s*$/);
      if (m) {
        const r = resolve(m[1], m[2] || null, m[3] || null);
        bullets.push({ text: li[1].slice(0, m.index).trim(), anchor: '#/' + [m[1], m[2], m[3]].filter(Boolean).join('/'), id: m[1], state: r ? r.state : null, mark: r ? r.mark : null, ok: !!r, kind: r ? r.v.dataset.kind : null });
      } else bullets.push({ text: li[1].trim(), anchor: null });
    });
    const seen = new Set();
    bullets.forEach(b => { if (!b.ok) return; if (seen.has(b.id)) b.ok = false; else seen.add(b.id); });
    return { why, tail: tail.map(t => '<p>' + inline(t) + '</p>').join('') };
  }
  function renderPanel() {
    const p = parseProposal();
    let html = '<h2>Why</h2>' + p.why + '<h2>What Changes</h2><ol class="changes">';
    bullets.forEach((b, i) => {
      const cls = !b.anchor ? 'text' : b.ok ? '' : 'dead';
      const kind = !b.anchor ? 'no visual' : b.ok ? b.kind + ' · ' + b.anchor : 'dead link · ' + b.anchor + ' — no such visual, state, or mark';
      html += '<li class="' + cls + '" data-i="' + i + '" role="button" tabindex="0" aria-current="false">' + inline(b.text) + '<span class="kind">' + kind + '</span><span class="draft-count" hidden></span></li>';
    });
    html += '</ol>' + p.tail + '<h2>Notes <span id="notecount"></span></h2><ol class="notes-list" id="notelist"></ol><h2>Drafts <span id="draftcount"></span></h2><ol class="draft-list" id="draftlist"></ol>';
    $panel.innerHTML = html;
    document.getElementById('landing').innerHTML = bullets.length
      ? '<h1>Choose a change</h1><p class="muted">Use the change list or Next to open a visual.</p>'
      : '<h1>No changes to review</h1><p class="muted">This proposal has no What Changes entries yet.</p>';
  }
  function renderPanelState() {
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i];
      const on = current.bullet === i;
      li.classList.toggle('on', on);
      li.setAttribute('aria-current', on ? 'true' : 'false');
    });
    renderCount();
  }
  function goBullet(i) {
    const b = bullets[i]; if (!b) return;
    closePopover(); setMenu(false);
    if (!b.anchor || !b.ok) showText(i); else show(b.id, b.state, b.mark);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.getElementById('item-title').focus({ preventScroll:true }); });
  }

  // ── annotation and browser-local feedback ──
  const ANNOTATABLE = '.btn, .input, tr, .box, .tag, .hero, .kv dt, .kv dd, h1, .nav span, .logo, .notes li, .notes .brief, .step, .flow-branch, .diff .line, .diff pre, .tree li, .caption, .textstage p';
  const KEY = 'rv-notes:' + CHANGE;
  const DRAFT_KEY = 'rv-drafts:v1:' + CHANGE;
  let storageAvailable = true;
  function readStored(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { storageAvailable = false; return fallback; }
  }
  let notes = readStored(KEY, []);
  if (!Array.isArray(notes)) notes = [];
  const draftStore = readStored(DRAFT_KEY, { version:1, drafts:[] });
  let drafts = draftStore && draftStore.version === 1 && Array.isArray(draftStore.drafts) ? draftStore.drafts : [];
  function persist() {
    if (storageAvailable) {
      try {
        localStorage.setItem(KEY, JSON.stringify(notes));
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ version:1, drafts:drafts }));
      } catch (e) { storageAvailable = false; }
    }
    document.getElementById('storage-status').hidden = storageAvailable;
    renderFeedback();
  }
  const $ann = document.getElementById('annotate');
  let annotating = false, $pop = null, editor = null, editorTrigger = null;
  $ann.onclick = () => setAnnotating(!annotating);
  function setAnnotating(on) {
    annotating = on; $ann.setAttribute('aria-pressed', String(on)); document.body.classList.toggle('annotating', on);
    closePopover(false); document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
  }
  function target(el) {
    if (el.closest('.popover, .chrome, .pin, details, a[href^="#/"]')) return null;
    const scope = el.closest('.visual[data-active]');
    if (!scope) return null;
    const t = el.closest('.flow-card, .flow-branch') || el.closest(ANNOTATABLE);
    return t && scope.contains(t) ? { scope:scope, el:t } : null;
  }
  document.addEventListener('mouseover', e => {
    if (!annotating) return;
    document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
    const t = target(e.target); if (t) t.el.classList.add('hovering');
  });
  function pathOf(scope, el) {
    const steps = [];
    for (let n = el; n && n !== scope; n = n.parentElement) steps.unshift([...n.parentElement.children].indexOf(n));
    return steps.join('.');
  }
  function elAt(scope, path) {
    if (!scope || !path) return null;
    let n = scope;
    for (const i of path.split('.')) n = n && n.children[+i];
    return n || null;
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('.pin, .callout, .kind, .why').forEach(x => x.remove());
    if (el.matches('.flow-card, .flow-branch')) c.querySelectorAll('details').forEach(x => x.remove());
    const content = el.tagName === 'TR' ? [...c.cells].map(td => td.textContent.trim()).join(' · ') : c.textContent;
    const value = content.replace(/\s+/g, ' ').trim().slice(0, 60);
    const kind = el.classList.contains('btn') ? 'button' : el.classList.contains('input') ? 'input' : el.tagName === 'TR' ? 'row'
      : el.classList.contains('box') ? 'panel' : el.tagName === 'H1' ? 'heading' : el.classList.contains('flow-branch') ? 'branch'
      : el.classList.contains('step') ? 'step' : el.classList.contains('line') ? 'line' : el.closest('.tree') ? 'file' : el.tagName.toLowerCase();
    return kind + ' "' + value + '"';
  }
  function recordFor(el) {
    const scope = el.closest('.visual[data-active]');
    return { itemId:current.id === '_text' ? '_text:' + current.bullet : current.id,
      scope:'visual', visual:current.id, state:current.state, targetId:el.dataset.targetId || null,
      path:pathOf(scope, el), label:labelOf(el) };
  }
  function sameTarget(a, b) {
    return a.itemId === b.itemId && a.visual === b.visual && a.state === b.state &&
      (a.targetId && b.targetId ? a.targetId === b.targetId : a.path === b.path && a.label === b.label);
  }
  function findTarget(n) {
    const scope = document.getElementById(n.visual);
    if (!scope) return null;
    let el = null;
    if (n.targetId) el = [...scope.querySelectorAll('[data-target-id]')].find(x => x.dataset.targetId === n.targetId && (!x.closest('.state') || x.closest('.state').classList.contains('state-' + n.state)));
    if (!el && !n.targetId) el = elAt(scope, n.path);
    return el && labelOf(el) === n.label ? el : null;
  }
  function whereOf(n) {
    if (n.visual === '_text') return '#/change/' + (Number(String(n.itemId).split(':')[1]) + 1);
    const v = visuals.find(x => x.id === n.visual);
    return '#/' + n.visual + (v && statesOf(v).length > 1 ? '/' + n.state : '');
  }
  function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function newId() { return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8); }
  function renderFeedback() {
    document.querySelectorAll('.pin').forEach(p => p.remove());
    const list = document.getElementById('notelist'), draftList = document.getElementById('draftlist');
    if (!list || !draftList) return;
    list.innerHTML = ''; draftList.innerHTML = '';
    document.getElementById('notecount').textContent = notes.length ? '(' + notes.length + ')' : '';
    document.getElementById('draftcount').textContent = drafts.length ? '(' + drafts.length + ')' : '';
    notes.forEach((n, i) => {
      const el = findTarget(n), stale = !el;
      if (el) {
        const pin = document.createElement('button'); pin.className = 'pin'; pin.dataset.note = n.id;
        pin.setAttribute('aria-label', 'Open note ' + (i + 1)); pin.textContent = String(i + 1);
        (el.tagName === 'TR' ? el.cells[0] : el).appendChild(pin);
      }
      const li = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button';
      button.innerHTML = '<span class="where">' + escapeHtml(whereOf(n)) + ' · ' + escapeHtml(n.label) + (stale ? ' · moved target' : '') + '</span>' + escapeHtml(n.text);
      button.onclick = () => openRecord(n, false);
      li.appendChild(button); list.appendChild(li);
    });
    if (!notes.length) list.innerHTML = '<li class="empty">No saved notes yet.</li>';
    drafts.forEach(d => {
      const li = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
      button.textContent = whereOf(d) + ' · ' + d.label + (findTarget(d) ? '' : ' · moved target');
      button.onclick = () => openRecord(d, true);
      li.appendChild(button); draftList.appendChild(li);
    });
    if (!drafts.length) draftList.innerHTML = '<li class="empty">No drafts.</li>';
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i], itemId = b && b.ok ? b.id : '_text:' + i;
      const count = drafts.filter(d => d.itemId === itemId).length;
      const badge = li.querySelector('.draft-count'); badge.hidden = !count;
      badge.textContent = count + (count === 1 ? ' draft' : ' drafts');
    });
    document.getElementById('storage-status').hidden = storageAvailable;
  }
  function closePopover(restore) {
    if ($pop) $pop.remove();
    $pop = null; editor = null; document.body.classList.remove('editor-open');
    if (restore && editorTrigger && editorTrigger.isConnected) editorTrigger.focus();
    editorTrigger = null;
  }
  function openRecord(n, isDraft) {
    closePopover(false); setMenu(false);
    if (n.visual === '_text') goBullet(Number(String(n.itemId).split(':')[1]));
    else show(n.visual, n.state, null);
    const el = findTarget(n);
    if (el) el.scrollIntoView({ block:'center' });
    const saved = isDraft && n.savedId ? notes.find(x => x.id === n.savedId) : !isDraft ? n : null;
    openPopover(isDraft ? n : saved || n, el, saved || null);
  }
  function openPopover(record, anchorEl, saved) {
    closePopover(false);
    const original = record || recordFor(anchorEl);
    const prior = saved || (record && record.id ? record : null);
    const matching = drafts.find(d => sameTarget(d, original) && (d.savedId || null) === (prior ? prior.id : null));
    editor = { meta:{ itemId:original.itemId, scope:'visual', visual:original.visual, state:original.state,
      targetId:original.targetId || null, path:original.path, label:original.label },
      savedId:prior ? prior.id : null, draftId:matching ? matching.id : (record && record.savedId !== undefined ? record.id : null) };
    editorTrigger = anchorEl;
    const initial = matching ? matching.text : (record && record.text !== undefined ? record.text : prior ? prior.text : '');
    $pop = document.createElement('div'); $pop.className = 'popover';
    const moved = !anchorEl ? '<p class="status">Original target moved. This draft stays here until you choose a new target.</p>' : '';
    $pop.innerHTML = '<div class="where">' + escapeHtml(whereOf(original)) + ' · ' + escapeHtml(original.label) + '</div>' + moved
      + '<textarea aria-label="Note text" placeholder="What should change here?"></textarea>'
      + '<div class="row"><button class="save">Save</button><button class="close">Close</button><button class="discard">Discard draft</button>'
      + (prior ? '<button class="del">Delete saved note</button>' : '') + '</div><p class="status">Drafts are excluded from Copy notes.'
      + (storageAvailable ? '' : ' Notes and drafts last for this session only.') + '</p>';
    const ta = $pop.querySelector('textarea'); ta.value = initial;
    ta.oninput = () => {
      const text = ta.value;
      let d = drafts.find(x => x.id === editor.draftId);
      if (!text.trim() && !editor.savedId) {
        if (d) drafts = drafts.filter(x => x.id !== d.id);
        editor.draftId = null;
      } else if (d) d.text = text;
      else { d = Object.assign({ id:newId(), savedId:editor.savedId, text:text }, editor.meta); drafts.push(d); editor.draftId = d.id; }
      persist();
    };
    $pop.querySelector('.save').onclick = () => {
      const text = ta.value.trim(); if (!text) return;
      const id = editor.savedId || newId();
      const savedNote = Object.assign({ id:id, text:text }, editor.meta);
      const index = notes.findIndex(x => x.id === id);
      if (index < 0) notes.push(savedNote); else notes[index] = savedNote;
      drafts = drafts.filter(x => x.id !== editor.draftId);
      closePopover(true); persist();
    };
    $pop.querySelector('.close').onclick = () => closePopover(true);
    $pop.querySelector('.discard').onclick = () => { drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    const del = $pop.querySelector('.del');
    if (del) del.onclick = () => { notes = notes.filter(x => x.id !== editor.savedId); drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); $pop.querySelector('.save').click(); } };
    document.body.appendChild($pop); document.body.classList.add('editor-open');
    if (!phoneMedia.matches) {
      const r = anchorEl ? anchorEl.getBoundingClientRect() : document.getElementById('item-header').getBoundingClientRect();
      const W = 300, H = $pop.offsetHeight || 190;
      let top = r.top, left = r.right + 10;
      if (left + W > innerWidth) { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 8; if (top + H > innerHeight) top = r.top - H - 8; }
      $pop.style.top = Math.max(50, top) + 'px'; $pop.style.left = left + 'px';
    }
    ta.focus();
  }
  let touchStart = null, touchMoved = false;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; if (t) { touchStart = { x:t.clientX, y:t.clientY }; touchMoved = false; } }, { passive:true });
  document.addEventListener('touchmove', e => { const t = e.touches[0]; if (t && touchStart && Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) > 8) touchMoved = true; }, { passive:true });
  document.addEventListener('click', e => {
    if (e.target.closest('.popover')) return;
    const pin = e.target.closest('.pin');
    if (pin) { e.preventDefault(); const n = notes.find(x => x.id === pin.dataset.note); if (n) openRecord(n, false); return; }
    const li = e.target.closest('.panel ol.changes li');
    if (li) { goBullet(+li.dataset.i); return; }
    const panelLink = e.target.closest('.panel a[href*="#/"]');
    if (panelLink) { e.preventDefault(); const s = panelLink.getAttribute('href').split('#/')[1].split('/'); show(s[0], s[1], s[2]); return; }
    const local = e.target.closest('.visual[data-active] a[href^="#/"]');
    if (local) {
      e.preventDefault(); const s = local.getAttribute('href').split('#/')[1].split('/');
      if (s[0] === current.id) { show(s[0], s[1], s[2]); requestAnimationFrame(() => window.scrollTo(0, 0)); }
      else toast('Use Changes to select another change.');
      return;
    }
    if (e.target.closest('details')) return;
    if (touchMoved) { touchMoved = false; return; }
    if (annotating) {
      const t = target(e.target);
      if (t) { e.preventDefault(); openPopover(recordFor(t.el), t.el, null); }
      return;
    }
    const localState = e.target.closest('.visual[data-active] [data-local-state]');
    if (localState) { show(current.id, localState.dataset.localState, null); return; }
    const step = e.target.closest('.visual[data-active] .flow-card, .visual[data-active] .flow-branch');
    if (step) { const detail = step.querySelector('details'); if (detail) detail.open = !detail.open; }
  });
  document.addEventListener('keydown', e => {
    const editing = e.target.matches('textarea,input,[contenteditable="true"]') || !!e.target.closest('[contenteditable="true"]');
    if (e.key === 'Escape') { if ($pop) closePopover(true); return; }
    if (editing) return;
    if (e.key === 'a') { setAnnotating(!annotating); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.panel ol.changes li')) { e.preventDefault(); goBullet(+e.target.dataset.i); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.flow-card, .flow-branch')) {
      e.preventDefault();
      if (annotating) openPopover(recordFor(e.target), e.target, null);
      else { const detail = e.target.querySelector('details'); if (detail) { detail.open = !detail.open; detail.querySelector('summary').focus(); } }
    }
  });
  document.querySelectorAll('.flow-card, .flow-branch').forEach(el => { if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from ' + FILE + ' (' + notes.length + '):'];
    notes.forEach((n, i) => lines.push((i + 1) + '. ' + whereOf(n) + ' · ' + n.label + ' — ' + n.text));
    return lines.join('\n');
  }
  document.getElementById('copy').onclick = function () {
    if (!notes.length) return toast('No saved notes yet');
    const text = notesText(), buf = document.getElementById('copybuf'); buf.value = text;
    const done = () => toast('Copied ' + notes.length + ' saved note' + (notes.length === 1 ? '' : 's'));
    const fallback = () => { buf.select(); buf.setSelectionRange(0, 99999); document.execCommand('copy'); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  };
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

  // ── phone: the chrome's height drives the panel; the list is a sheet; step through changes ──
  function chromeHeight() { document.documentElement.style.setProperty('--chrome-h', document.querySelector('.chrome').offsetHeight + 'px'); }
  window.addEventListener('resize', chromeHeight);
  function setMenu(open) {
    document.body.classList.toggle('menu', open);
    document.getElementById('menu').setAttribute('aria-expanded', open);
  }
  document.getElementById('menu').onclick = () => setMenu(!document.body.classList.contains('menu'));
  document.getElementById('tools-toggle').onclick = function () {
    const open = document.getElementById('tools').classList.toggle('open');
    this.setAttribute('aria-expanded', open);
    chromeHeight();
  };
  function currentBullet() { const li = document.querySelector('.panel ol.changes li.on'); return li ? +li.dataset.i : -1; }
  function renderCount() {
    const i = currentBullet();
    document.getElementById('count').textContent = i < 0 ? bullets.length + ' changes' : (i + 1) + ' / ' + bullets.length;
    document.getElementById('prev').disabled = i <= 0;
    document.getElementById('next').disabled = i >= bullets.length - 1;
    const v = document.querySelector('.visual[data-active]');
    document.getElementById('viewport').style.display = v && v.classList.contains('screen') ? '' : 'none';
    chromeHeight();
  }
  document.getElementById('prev').onclick = () => { const i = currentBullet(); if (i > 0) goBullet(i - 1); };
  document.getElementById('next').onclick = () => { const i = currentBullet(); if (i < bullets.length - 1) goBullet(i + 1); };
  document.addEventListener('keydown', e => { if (e.target.matches('textarea,input,[contenteditable="true"]') || e.target.closest('[contenteditable="true"]')) return; if (e.key === 'ArrowRight') document.getElementById('next').click(); if (e.key === 'ArrowLeft') document.getElementById('prev').click(); });

  // ── viewport: phone or desktop layout of a screen; a phone is a phone already ──
  const phoneMedia = matchMedia('(max-width: 760px)');
  function setViewport(vp) {
    document.body.dataset.viewport = vp;
    document.querySelectorAll('#viewport button').forEach(b => b.setAttribute('aria-pressed', b.dataset.vp === vp));
  }
  document.querySelectorAll('#viewport button').forEach(b => b.onclick = () => setViewport(b.dataset.vp));
  setViewport(phoneMedia.matches ? 'phone' : 'desktop');
  phoneMedia.addEventListener('change', e => setViewport(e.matches ? 'phone' : 'desktop'));

  renderPanel();
  fromHash();
  chromeHeight();
</script>
</body>
</html>

~~~
<!-- end review.html -->
