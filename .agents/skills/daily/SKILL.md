---
name: daily
description: Start the signed-in person's day, then stay on as their chief of staff; or change their steps.
user-invocable: true
disable-model-invocation: true
---

# /daily

`D` is `node "$(git rev-parse --show-toplevel)/.claude/skills/daily/scripts/daily.mjs"`. [The daily routine](../../../wiki/development/daily.md) owns the files and a step's shape.

1. **Know the person.** Run `D who`. On `missing` or `expired`, run its `login` command in the background, show the person the link it prints, wait for it to exit, then rerun `D who`: a step run under a guessed person is someone else's day. With no `cloudflared`, [install it](../../../wiki/development/required-tools.md#installing-cloudflared). Say so when `source` is `git` (no company app, so the git email) or `near` (the sign-in ends in `days` days).
2. **Show what's waiting.** Run `D reminders`; list `due` (overdue ones marked) and `open` first. On `not-read`, say `Not read: reminders` and go on.
3. **Read** `team`, then `file`, when not null. A step runs only on the days its words name; one with none runs daily.
4. **Run each due step**, team first. One ending `(own workspace)`: write its brief by [the five parts](references/chief.md#brief-before-you-start-an-agent) to `.scratch/daily-<n>.md`, then `D open --step "<line>" --title <short name> --brief <file> --plan-first`: its agent plans, then waits for the person's Go by [morning plans](references/chief.md#morning-plans). `opened` and `already` name its workspace; `unsupported` or `failed` runs it here.
5. **Reply** with a short list: steps run, skipped and why, left for today. With no `file`, offer to start their list, by [the ask convention](../explore/references/asking-the-user.md).
6. **Stay on.** Where the host runs a command in the background and hands you its lines, start `D watch` that way; elsewhere run `D watch --once` each time the person writes. Handle each line and `Inbox answer` by [the chief of staff](references/chief.md). `unsupported` means no watching. On `end`, a later `open` or `hand` starts it again.

## Any time in this chat, or after `/daily`

- *Remind me Friday to …*: work out the date, then `D remind --day <YYYY-MM-DD> --text <words>`. It saves at once, private to them. *Done* with one: `D done --id <id>`.
- *A task past a quick reply*, or *get someone to …*: hand it off by [quick or big](references/chief.md#quick-or-big): brief it, then `D open --step "task: <title>" --title <title> --brief <file>`, and name its workspace. It starts at once, with no plan first. `unsupported` or `failed` runs it here. `D close --agent <agent>` archives one.
- *Watch flashy-crab*: `D hand --agent flashy-crab`. Never send to a chat the person didn't hand over or `/daily` didn't start.
- *What's going on?*: `D status`, one line per agent.

## Changing steps

A step change, such as *add checking yesterday's orders to my daily*, edits the person's `file`: make `people/<name>.md` with `emails: [<their email>]` when missing, show the new list, and save by [the change loop](../../../wiki/development/the-change-loop.md). `team.md` changes only with the owner's review. Keep private life out, by [the People rules](../../../wiki/wiki-style.md#people).
