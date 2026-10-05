---
name: routine
description: Schedule a prompt or verb to recur in your own Cloudflare account; list, pause, resume, run, change, or delete one. Claude's hosted routines use schedule.
user-invocable: true
---

# /routine

`/routine` turns what to run and when into a routine that runs in the person's own Cloudflare account, with their computer off, from any chat app. [Cloud routines](../../../wiki/stack/cloud-routines.md) owns how a run works, its cost, and its limits. [`routine.mjs`](scripts/routine.mjs) makes every call.

```bash
R="$(git rev-parse --show-toplevel)/.claude/skills/routine/scripts/routine.mjs"
```

The script prints one JSON object, never a key's value. Exit `0` is success; `2` is bad input: fix it or ask. `3` is not ready: meet its [`needs`](#meet-a-need), then rerun. On `4` or `5` nothing changed: show the script's `error` as is, and stop.

## Create

**Invocation:** `/routine <when>: <prompt>`.

1. **Turn the time into five-field cron** (`0 9 * * 1-5`); ask when the time is unclear. Omit the timezone unless the user states one.
2. **Preview.** Run `node "$R" create --cron '<cron>' --prompt '<prompt>' --agent <claude|codex> [--name '<name>'] [--timezone <iana>] [--model <id>] [--keys <NAME,NAME>] --dry-run`, with `--agent` naming your own agent. Keep the prompt verbatim; add no unattended wording. `--keys` names the `.env` keys the work needs: a run gets no other.
3. **Confirm.** Show the name, cron and its plain meaning, timezone, prompt, and `runsAs`: the routine runs with that person's own assistant sign-in. Say a run has full permissions inside a short-lived cloud computer and can ask nothing. On `installed: false`, also show `adds` and `cost`: this first routine adds them to their Cloudflare account. Ask in [the ask format](../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks): create it *(Recommended)*, or change the time or prompt. When nobody can answer, create it.
4. **Create.** Rerun without `--dry-run`, meeting each need, then report its name, id, and `nextRunAt` in its timezone.

## Meet a need

| `needs` | Do |
|---|---|
| `setup` | `node "$R" setup`, after the confirm above. |
| `paid-plan` | Nothing was added. Give `cost` and the `upgrade` link, and stop. |
| `signin` | Send [the key link](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link) for one of `keys`, declaring a name `.env.example` lacks; then `node "$R" signin --agent <claude|codex>`. |
| `project-access` | Send the key link for `keys`, then `node "$R" setup` again. |

Never take a sign-in in chat.

## List and manage

- `/routine` alone → `node "$R" ls`. Show each routine's name, cadence, status, next run, and last result. A last result of `needs-signin` means [renew the sign-in](../../../wiki/stack/cloud-routines.md#renew-a-sign-in).
- `/routine pause|resume|run|logs|delete <name or id>` → `node "$R" <action> '<name or id>'`. `run` runs once now. Confirm a `delete` first, in [the ask format](../explore/references/asking-the-user.md).
- `/routine change <name or id> <new time or prompt>` → `node "$R" change '<name or id>' [--cron '<cron>'] [--timezone <iana>] [--prompt '<prompt>']`.

An ambiguous name returns exit `2` with the matching ids; ask which.

[`workspace.mjs`](scripts/workspace.mjs) here also opens a new workspace for one part of a request; [open a part in a new workspace](../plan/references/new-workspace.md) owns its use. [`presets.mjs`](scripts/presets.mjs) `add` adds WongStack's agent presets; [required tools](../../../wiki/development/required-tools.md) owns when.

End every reply with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step), normally to list routines or run the new one now.
