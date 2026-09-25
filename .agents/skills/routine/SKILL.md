---
name: routine
description: Put any prompt or WongStack verb on a recurring Paseo schedule for this repo, and list, pause, resume, run, change, or delete those Paseo schedules. Each run is a new agent in its own Paseo worktree with full permissions; its questions wait in Paseo for you. Use to schedule, repeat, or automate work through Paseo ("every weekday at 9am run /improve", "run this nightly", "pause the nightly routine", "what routines does this repo have"). Needs Paseo; for Claude cloud routines, use the built-in schedule skill instead.
user-invocable: true
---

# /routine

`/routine` sets up recurring work through [Paseo](https://paseo.sh) schedules. You say what to run and when, and the skill makes the schedule with fixed defaults. The script [`routine.mjs`](scripts/routine.mjs) makes every Paseo call. Do not call `paseo schedule` yourself: `paseo schedule create` cannot set worktree isolation, so its schedules run in your primary checkout.

```bash
R="$(git rev-parse --show-toplevel)/.claude/skills/routine/scripts/routine.mjs"
```

The script prints one JSON object. Exit `0` is success. `2` is bad input: fix it or ask. `3` means Paseo is not installed, `4` means its daemon does not answer, and `5` means Paseo's client has changed. For `3` to `5`, show the script's `error` and its `fallback` text (`retry`, then `app`) as it is, and stop.

## Create

**Invocation:** `/routine <when>: <prompt>`, for example `/routine every weekday at 9am: /improve`.

1. **Turn the time into cron.** Write a five-field expression (`0 9 * * 1-5`). If the time is unclear ("sometimes", "often"), ask for it. Use the timezone the user states. Otherwise leave it out, and the script uses the host's.
2. **Preview.** Run `node "$R" create --cron '<cron>' --prompt '<prompt>' --agent <claude|codex> [--name '<name>'] [--timezone <iana>] [--model <id>] --dry-run`. Pass `--agent claude` when you are Claude Code and `--agent codex` when you are Codex. Keep the prompt exactly as the user wrote it: add no unattended wording.
3. **Confirm.** Show the name, cron with its plain meaning, timezone, directory, mode, and prompt. Ask to create it in [the shared ask format](../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks): create it *(Recommended)*, or change the time or prompt. Say that the mode gives the run full permissions. A request to create a routine already chose the schedule, so when nobody can answer, create it.
4. **Create.** Run the same command without `--dry-run`. Report the routine's name, id, and `nextRunAt` in its timezone.

The defaults are fixed, and the script applies them:

- A new agent in its own Paseo worktree of the repo's primary worktree, even when you call `/routine` from a linked worktree.
- `bypassPermissions` for Claude or `full-access` for Codex.
- The agent is kept after the run, so a question from the run waits in Paseo until you answer it.
- The model is Paseo's default unless the user names one.

## List and manage

- `/routine` alone → `node "$R" ls`. Show each routine's name, cadence, status, next run, and last result. Other repos' schedules are not shown.
- `/routine pause|resume|run|logs|delete <name or id>` → `node "$R" <action> '<name or id>'`. `run` starts one run now and does not change the cadence. Confirm a `delete` first, in the same ask format.
- `/routine change <name or id> <new time or prompt>` → `node "$R" change '<name or id>' [--cron '<cron>'] [--timezone <iana>] [--prompt '<prompt>']`.

A name that matches more than one routine returns exit `2` with the matching ids. Show them, and ask which one.

For Paseo features that `/routine` does not cover (heartbeats, `--max-runs`, remote daemons), use `paseo` directly. [Required tools](../../../wiki/development/required-tools.md) lists Paseo as optional: only this skill uses it.

End every reply with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step), which is normally to list the routines or run the new one once now.
