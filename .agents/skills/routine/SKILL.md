---
name: routine
description: Schedule a prompt or verb to recur through Paseo; list, pause, resume, run, change, or delete one. Claude cloud routines use schedule.
user-invocable: true
---

# /routine

`/routine` turns what to run and when into a [Paseo](https://paseo.sh) schedule. [`routine.mjs`](scripts/routine.mjs) makes every Paseo call; never call `paseo schedule` yourself, because `paseo schedule create` cannot set worktree isolation.

```bash
R="$(git rev-parse --show-toplevel)/.claude/skills/routine/scripts/routine.mjs"
```

The script prints one JSON object. Exit `0` is success; `2` is bad input: fix it or ask. On `3` to `5` (Paseo unusable), show the script's `error` and `fallback` as is, and stop.

## Create

**Invocation:** `/routine <when>: <prompt>`.

1. **Turn the time into five-field cron** (`0 9 * * 1-5`); ask when the time is unclear. Omit the timezone unless the user states one.
2. **Preview.** Run `node "$R" create --cron '<cron>' --prompt '<prompt>' --agent <claude|codex> [--name '<name>'] [--timezone <iana>] [--model <id>] --dry-run`, with `--agent` naming your own agent. Keep the prompt verbatim; add no unattended wording.
3. **Confirm.** Show the name, cron and its plain meaning, timezone, directory, mode, and prompt, and say the mode grants full permissions. Ask in [the ask format](../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks): create it *(Recommended)*, or change the time or prompt. When nobody can answer, create it.
4. **Create.** Rerun without `--dry-run`; report its name, id, and `nextRunAt` in its timezone.

The script sets the rest: a new agent in its own Paseo worktree of the primary worktree, even from a linked one; `bypassPermissions` for Claude or `full-access` for Codex; kept after the run, so its questions wait in Paseo; Paseo's default model unless the user names one.

## List and manage

- `/routine` alone → `node "$R" ls`. Show each routine's name, cadence, status, next run, and last result, for this repo only.
- `/routine pause|resume|run|logs|delete <name or id>` → `node "$R" <action> '<name or id>'`. `run` runs once now. Confirm a `delete` first, in [the ask format](../explore/references/asking-the-user.md).
- `/routine change <name or id> <new time or prompt>` → `node "$R" change '<name or id>' [--cron '<cron>'] [--timezone <iana>] [--prompt '<prompt>']`.

An ambiguous name returns exit `2` with the matching ids; ask which.

For Paseo features `/routine` lacks (heartbeats, `--max-runs`, remote daemons), use `paseo` directly; [required tools](../../../wiki/development/required-tools.md) lists it as optional. [`workspace.mjs`](scripts/workspace.mjs) here also opens a new workspace for one part of a request; [open a part in a new workspace](../plan/references/new-workspace.md) owns its use. [`presets.mjs`](scripts/presets.mjs) `add` adds WongStack's agent presets; [required tools](../../../wiki/development/required-tools.md) owns when.

End every reply with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step), normally to list routines or run the new one now.
