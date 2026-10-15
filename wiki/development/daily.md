# The daily routine

Type `/daily` to start your day: the assistant checks who you are, runs the steps the whole team shares, then your own, and replies with what it did and what is left for today.

## What it does

1. **Checks who you are** from your company sign-in. Signed out, it shows you the sign-in link and waits; once you are in, it carries on by itself. It runs no step under a guessed name. With no company app, it uses your git email and says so.
2. **Runs the team's steps due today, then yours.**
3. **Replies with a short list:** steps run, steps skipped and why, and steps left for today. With no steps of your own yet, it offers to start your list.

You start it; the assistant never runs it on its own. For a run every morning, ask: [offer a routine](the-change-loop.md#offer-a-routine-or-an-app) covers it.

## The two files

Both live in the daily skill's folder, [`.claude/skills/daily/`](../../.agents/skills/daily/SKILL.md):

- **`team.md`**: the steps everyone runs. The owner keeps it.
- **`people/<name>.md`**: one person's steps, named like a [person page](../wiki-style.md#people), such as `jo-lee.md`. Its `emails` lists every email the person signs in with; `/daily` finds the file by any of them.

A step is one line, `- [days:] what to do`, with `(own workspace)` at the end for a long one. Jo's file:

```markdown
---
emails: [jo@example.com, jo.lee@gmail.com]
---
- Check yesterday's Shopify orders and flag refunds.
- Weekdays: /email (own workspace)
- Fridays: draft the week's update for the team.
```

Write days in plain words: *Mondays*, *weekdays*, *the first of the month*. A line with no days runs every day. The assistant reads the words against today's date, and the reply lists each skipped step, so a misread shows at once.

## Add a step

Say it: *add checking yesterday's orders to my daily*. The assistant edits your file, making it with your sign-in email if you have none, shows you the new list, and saves it like any other edit through [the change loop](the-change-loop.md). Your next `/daily` runs it.

Anyone changes their own steps. A team step changes only with the owner's review. The steps sit in a shared project, so keep health, family, and money out of them, by [the People rules](../wiki-style.md#people).

## Own workspaces

A step ending `(own workspace)` opens in a workspace of its own where your chat app can open one, such as Paseo, so its questions stay out of the morning chat. Each opens once a day: a second `/daily` opens nothing twice and names the ones already open. `daily.mjs opened` lists today's.

The record of what opened lives in the project's hidden git folder, `wong-daily/`, so every workspace of this copy shares it and nothing saves it. It is one per computer: a second computer may open the same step again that day.

Where the app can't open a workspace, the step runs right in the chat.

## Updates keep your steps

A WongStack update brings the new `/daily`, but never copies over or removes `team.md` or anything in `people/`: [the payload manifest](../../.agents/skills/wong-sync/references/payload-manifest.md#categories) leaves both to your install.

Part of [Development](README.md).
