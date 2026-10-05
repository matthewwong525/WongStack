# Measure session speed

[`scripts/measure-sessions.mjs`](../../scripts/measure-sessions.mjs) counts where a task's time goes, from this computer's Codex and Claude Code session logs. It prints counts, never message text, and ships to no install.

## Compare two periods

Run it once per period and read the rows side by side:

```bash
node scripts/measure-sessions.mjs --since 2026-09-20 --until 2026-10-04
node scripts/measure-sessions.mjs --since 2026-10-05
```

Each row is one model at one thinking level. `--json` prints the same counts for a script.

A session counts when its working folder is this repo or one of its worktrees, or when its log records this repo's origin address. `--cwd <folder>` adds a closed worktree's folder, and `--all-repos` counts every session.

## Read the rows

- **A turn** is one request and the work it started. Its verb is the `/ship` or `$ship` that opened it.
- **A step** is one tool call. Seconds per step is the time of the turns that took a step, over their steps.
- **A page read** is a command that reads a skill page, a wiki page, or `AGENTS.md`. A repeat is a page the same chat already read.
- **Parent steps during a helper** should be near zero: the parent [waits quietly](../../.agents/skills/apply/SKILL.md#build-in-a-helper).
- **Failed-check lookups** fall when [a save](../../.agents/skills/save/references/git-gate.md) returns each failing check's cause itself.
- **Local check runs** rise when a finished build runs [the pre-check](../development/the-change-loop.md#the-gate).

A Claude Code log that records no thinking level is grouped under `unrecorded`: compare those rows by date.

Back to [Maintaining WongStack](README.md).
