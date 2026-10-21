# Design

## Context

See [proposal.md](proposal.md) for why. Two models exist today:

- **Claymoo's daily** (`~/ClaymooApp/.agents/skills/daily/SKILL.md`, *Run from another chat*) is written to be called: fixed reply lines, no closing question, every command run from its own checkout's root.
- **WongOS's personal daily** (`~/WongOS/.agents/skills/daily/SKILL.md` step 3, `daily.mjs claymoo`) calls it: it checks out Claymoo's `origin/main` in a private folder, reads that SKILL.md, and runs each command as `node <root>/.agents/skills/daily/scripts/daily.mjs <command>` with `<root>` as the working folder.

WongStack's `/daily` cannot be called that way yet:

- `daily.mjs` `main()` calls `repoContext()` with no argument, so `process.cwd()` decides the sign-in origin (`loadConfig(ctx)`), the git author, and the state folder (`ctx.commonDir/wong-daily`).
- `launchWorkspace()` and the memory helper (`spawnSync` at line ~333) inherit the working folder too. The launcher's `--cwd` primary and the memory store's repo both follow it.
- `SKILL.md` defines `D` through `git rev-parse --show-toplevel`, the chat's repo.
- `SKILL.md` steps 1, 5 and 6 assume the chat is the daily's: it waits at sign-in, offers to start a list, and starts `D watch`.

The skill-text budget has about 40 bytes of headroom (`node scripts/measure-context.mjs --check --json`), so new words in `SKILL.md` need offsetting cuts.

## Goals / Non-Goals

**Goals:** the script is location-independent; one reply format serves a person and a caller; a caller gets one `day` summary as data.

**Non-Goals:** a caller-side checkout helper (the proposal's non-goal); a flag that switches modes in the script. The model knows it was called from the caller's message, and only the skill text differs.

## Decisions

### The script finds its repo from its own path

`main()` builds `repoContext(SKILL)` instead of `repoContext()`, and both `spawnSync` calls pass `cwd: ctx.root`. `SKILL` already comes from `import.meta.url`. Node resolves the main module's symlinks, so in this meta-repo `.claude/skills` → `.agents/skills` still lands inside the repo. In a Paseo worktree it lands in that worktree, as today.

- *Alternative*: a `--repo` flag. Rejected: every caller would have to pass it, and forgetting it fails silently with the wrong person's state.
- *Alternative*: tell callers to `cd` first (Claymoo's rule). Kept in the wiki as a belt, not the fix: an agent that forgets still reads the right repo.

`who()` takes `ctx`, so its tests need only a ctx built from a temp repo. `stateDir` keeps `commonDir/wong-daily`, so a worktree and its primary share today's record as before.

### `D day`: one summary for scripts

`daily.mjs day [--day] [--email]` prints:

```json
{
  "status": "ok",
  "who": { "email": "jo@example.com", "source": "sign-in", "state": "valid", "login": null },
  "reminders": { "due": [], "open": [] },
  "opened": [{ "step": "Weekdays: /email (own workspace)", "title": "email", "workspace": "little-giraffe", "source": "step" }],
  "watch": "node /abs/path/.claude/skills/daily/scripts/daily.mjs watch"
}
```

It composes the existing `who`, `reminders` and `opened`; a reminders failure gives `"reminders": "not-read"`, not an error. Signed out, it returns `status: "signed-out"` with `who.login`, exit 1, like the other commands. `watch` is `null` when nothing is open. It reads only: it opens and sends nothing.

- *Alternative*: have every command print a caller block. Rejected: one read-only command is easier to test and to document.

### One set of reply lines, both ways

`SKILL.md` step 5 names the lines once: `Due:` (with `(overdue)`), `Open:`, `Started: <title> (<workspace>)`, `Already open: …`, `Not started: <title> — <reason>`, `Ran: <step>`, `Skipped: <step> — <why>`, `Left for today: <step>`, `Not read: <sources>`. A person sees the same lines. That replaces today's looser *short list* and costs few words.

### Called mode is a short section of the skill

`## When another skill runs it` holds only the differences:

- `D` is `node <the folder this file is in>/scripts/daily.mjs`: the path the caller read, no `rev-parse`.
- Signed out: send the `login` link as one line plus `Not read: daily — signed out`, and hand back.
- Steps the caller says it covers: `Skipped: <step> — <caller> covers it`.
- End after step 5: no offer, no closing question, no watch. Add `Watch: <D> watch` when anything is open. The caller starts it when its own day is done and may `D hand` its own agents first.

The chief's rules (`references/chief.md`) are unchanged: a caller that starts the watch follows them.

### The wiki shows a caller's lines

`wiki/development/daily.md` gains `## Run it from your own agent`: the three lines a caller's skill copies (read the SKILL.md at its path, name the steps you cover, start `Watch:` when your day is done). A clean published checkout is mentioned as the caller's choice, with WongOS as the example, not shipped.

## Risks / Trade-offs

- [A caller runs `D` by the chat repo's `rev-parse` path out of habit] → the called section says the absolute path; if a repo has no daily there, the command fails loudly rather than reading the wrong state.
- [Two watches anyway: a caller with its own watcher also starts `D watch`] → the `Watch:` line is advice; each watch handles only its own agents, so no agent gets two answers. The wiki says to pick one.
- [Skill-text budget] → offset the new section by trimming `SKILL.md` and `chief.md` wording; rerun `measure-context --check`.
- [`repoContext(SKILL)` in an install where `.claude/skills/daily` is a copy outside git] → `repoContext` throws as it would today outside a repo; covered by an existing error path.

## Migration Plan

None by hand. Installs get it on the next sync; standalone `/daily` behaves the same apart from the fixed reply lines. Rollback is a revert.
