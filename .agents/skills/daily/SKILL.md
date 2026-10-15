---
name: daily
description: Start the signed-in person's day: the team's steps, then their own; or change their steps.
user-invocable: true
disable-model-invocation: true
---

# /daily

`D` is `node "$(git rev-parse --show-toplevel)/.claude/skills/daily/scripts/daily.mjs"`. [The daily routine](../../../wiki/development/daily.md) owns the files and a step's shape.

1. **Know the person.** Run `D who`. On `missing` or `expired`, run its `login` command in the background, show the person the link it prints, wait for it to exit, then rerun `D who`: a step run under a guessed person is someone else's day. With no `cloudflared`, [install it](../../../wiki/development/required-tools.md#installing-cloudflared). Say so when `source` is `git` (no company app, so the git email) or `near` (the sign-in ends in `days` days).
2. **Read** `team`, then `file`, when not null. A step runs only on the days its words name; one with none runs daily.
3. **Run each due step**, team first. One ending `(own workspace)`: write its brief to `.scratch/daily-<n>.md`, then `D open --step "<line>" --title <short name> --brief <file>`. `opened` and `already` name its workspace; `unsupported` or `failed` runs it here.
4. **Reply** with a short list: steps run, skipped and why, left for today. With no `file`, offer to start their list, by [the ask convention](../explore/references/asking-the-user.md).

## Changing steps

Words after `/daily`, such as *add checking yesterday's orders to my daily*, change the person's `file`: make `people/<name>.md` with `emails: [<their email>]` when missing, show the new list, and save by [the change loop](../../../wiki/development/the-change-loop.md). `team.md` changes only with the owner's review. Keep private life out, by [the People rules](../../../wiki/wiki-style.md#people).
