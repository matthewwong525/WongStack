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
