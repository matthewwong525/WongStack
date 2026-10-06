---
name: routine
description: Schedule a prompt or verb to recur in your Cloudflare account; list, pause, resume, run, change, or delete one. Claude cloud routines use schedule.
user-invocable: true
---

# /routine

`/routine` puts work on a schedule that runs in the person's own Cloudflare account. [Cloud routines](../../../wiki/stack/cloud-routines.md) owns how a run works. [`routine.mjs`](scripts/routine.mjs) makes every call.

```bash
R="$(git rev-parse --show-toplevel)/.claude/skills/routine/scripts/routine.mjs"
```

It prints one JSON object, never a key. Exit `2` is bad input: fix it or ask. `3`: meet its `needs` ([below](#when-it-is-not-ready)). `4` or `5`: nothing changed; show its `error` and stop.

## Script or routine

Judge **who decides the steps**.

- **The same steps every run** (*copy yesterday's orders into the archive table*) is a script, even when a step calls an AI model. Say so, make no routine, and start [`/plan`](../plan/SKILL.md) for [a timed job](../../rules/code.md#sample-data-and-timed-jobs) in the app.
- **Work that finds its own way** (*find news about our competitors*, `/improve-code`) is a routine.

Say which you picked first; the person may ask for a routine anyway.

## Create

1. **Turn the time into five-field cron** (`0 9 * * 1-5`); ask when the time is unclear. Omit the timezone unless the user states one.
2. **Preview.** Run `node "$R" create --cron '<cron>' --prompt '<prompt>' [--name '<name>'] [--timezone <iana>] [--keys <NAME,NAME>] --dry-run`. Keep the prompt verbatim. `--keys` names the `.env` keys the run may use.
3. **Confirm.** Show the name, cron and its plain meaning, timezone, prompt, and model, and say the run has full permissions inside its cloud computer. With `installed: false`, show `adds` and `cost` too. With `model: null`, ask [which model](#when-it-is-not-ready) here. Ask in [the ask format](../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks): create it *(Recommended)*, or change the time or prompt. When nobody can answer, create it.
4. **Create.** Rerun without `--dry-run`; report its name, id, `nextRunAt` in its timezone, what `setup` added, and any `todo`.

## When it is not ready

Meet the one `needs` exit `3` names, then rerun the command.

- `model`: ask which model in the ask format: the `shortlist`, its recommended one first, each with its `billing` (`node "$R" model` lists the rest). Then `node "$R" model '<id>'`. A refused pick (exit `2`) changes nothing: say why and ask again.
- `model-key`, or the person says *use my key*: send [the key link](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link) for `WONG_ROUTINE_MODEL_KEY`, then `node "$R" key`. Say the service and model it reports. `key --remove` undoes it.
- `provider`: ask which of `services` the key is for, then `node "$R" key --provider <id> [--model <id>]`.
- `project-access`: say its `why` if any, send the key link for `WONG_ROUTINE_GITHUB_TOKEN`, then `node "$R" setup`.
- `paid-plan`: give `cost` and `upgrade`, and stop.
- `cloudflare`: say this install has no Cloudflare account, and stop.
- `setup`: show `node "$R" setup --dry-run`'s `adds` and `cost`, confirm, then `node "$R" setup`.

## List and manage

- `/routine` alone → `node "$R" ls`. Show each routine's name, cadence, status, next run, and last result with its start-up and run times.
- `/routine pause|resume|run|logs|delete <name or id>` → `node "$R" <action> '<name or id>'`. Confirm a `delete` first, in [the ask format](../explore/references/asking-the-user.md).
- `/routine change <name or id> <new time or prompt>` → `node "$R" change '<name or id>' [--cron '<cron>'] [--timezone <iana>] [--prompt '<prompt>']`.

An ambiguous name returns the matching ids; ask which.

A schedule made in Paseo stays in the Paseo app. [`workspace.mjs`](scripts/workspace.mjs) here also opens a new workspace for one part of a request; [open a part in a new workspace](../plan/references/new-workspace.md) owns its use. [`presets.mjs`](scripts/presets.mjs) `add` adds WongStack's agent presets; [required tools](../../../wiki/development/required-tools.md) owns when.

End every reply with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step), normally to run the new one now.
