---
name: routine
description: Schedule a prompt or verb to recur in your Cloudflare account; list, pause, resume, run, change, or delete one. Claude cloud routines use schedule.
user-invocable: true
---

# /routine

`/routine` puts work on a schedule that runs in the person's own Cloudflare account, with their computer off. [Cloud routines](../../../wiki/stack/cloud-routines.md) owns how a run works, its cost, and its limits. [`routine.mjs`](scripts/routine.mjs) makes every call.

```bash
R="$(git rev-parse --show-toplevel)/.claude/skills/routine/scripts/routine.mjs"
```

The script prints one JSON object, never a key. Exit `0` is success; `2` is bad input: fix it or ask. `3` is not ready: meet its `needs` ([below](#when-it-is-not-ready)). On `4` or `5` nothing changed: show its `error` as is, and stop.

## Script or routine

Judge first **who decides the steps**; the person is not asked.

- **The same steps every run** (*copy yesterday's orders into the archive table*) is a script, even when a step calls an AI model. Say so, make no routine, and start [`/plan`](../plan/SKILL.md) for a scheduled function in the app, with [its manual trigger](../../rules/code.md#sample-data-and-timed-jobs). A script needs no paid plan.
- **Work that finds its own way** (*find news about our competitors*, `/improve`) is a routine.

Say which you picked before making anything. The person may ask for a routine anyway.

## Create

**Invocation:** `/routine <when>: <prompt>`.

1. **Turn the time into five-field cron** (`0 9 * * 1-5`); ask when the time is unclear. Omit the timezone unless the user states one.
2. **Preview.** Run `node "$R" create --cron '<cron>' --prompt '<prompt>' [--name '<name>'] [--timezone <iana>] [--keys <NAME,NAME>] --dry-run`. Keep the prompt verbatim; add no unattended wording. `--keys` names the `.env` keys the run may use.
3. **Confirm.** Show the name, cron and its plain meaning, timezone, prompt, and model, and say the run has full permissions inside its cloud computer. With `installed: false`, show `adds` and `cost` too: this first routine installs them. With `model: null`, ask [which model](#when-it-is-not-ready) here. Ask in [the ask format](../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks): create it *(Recommended)*, or change the time or prompt. When nobody can answer, create it.
4. **Create.** Rerun without `--dry-run`; report its name, id, `nextRunAt` in its timezone, and what `setup` added.

## When it is not ready

Exit `3` names one `needs`. Meet it, then rerun the command that stopped.

- `model`: ask which model in the ask format: the `shortlist`, its recommended one first, each with its `billing`, and the person's own words for any other (`node "$R" model` lists all). Then `node "$R" model '<id>'`. A refused pick is exit `2` and changes nothing: say why, and ask again.
- `model-key`, or the person says *use my key*: send [the key link](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link) for `WONG_ROUTINE_MODEL_KEY`, then `node "$R" key`. Say the service and model it reports. `key --remove` returns to the Cloudflare pick.
- `provider`: ask which of `services` the key is for, then `node "$R" key --provider <id> [--model <id>]`.
- `project-access`: send the key link for `WONG_ROUTINE_GITHUB_TOKEN`, then `node "$R" setup`.
- `paid-plan`: say routines need Cloudflare's paid plan, give `cost` and `upgrade`, and stop.
- `cloudflare`: say this install has no Cloudflare account to run routines in, and stop.
- `setup`: show `node "$R" setup --dry-run`'s `adds` and `cost`, confirm, then `node "$R" setup`.

## List and manage

- `/routine` alone → `node "$R" ls`. Show each routine's name, cadence, status, next run, and last result with how long it took to start and to run.
- `/routine pause|resume|run|logs|delete <name or id>` → `node "$R" <action> '<name or id>'`. `run` runs once now. Confirm a `delete` first, in [the ask format](../explore/references/asking-the-user.md).
- `/routine change <name or id> <new time or prompt>` → `node "$R" change '<name or id>' [--cron '<cron>'] [--timezone <iana>] [--prompt '<prompt>']`.

An ambiguous name returns exit `2` with the matching ids; ask which.

A schedule made in Paseo stays in the Paseo app. [`workspace.mjs`](scripts/workspace.mjs) here also opens a new workspace for one part of a request; [open a part in a new workspace](../plan/references/new-workspace.md) owns its use. [`presets.mjs`](scripts/presets.mjs) `add` adds WongStack's agent presets; [required tools](../../../wiki/development/required-tools.md) owns when.

End every reply with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step), normally to list routines or run the new one now.
