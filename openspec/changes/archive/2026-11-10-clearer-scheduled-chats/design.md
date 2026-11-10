# Design

## Context

An app-clock chat run starts in `openSession` (`.agents/skills/schedule/scripts/lib/app-runs.mjs`). Today:

1. `startRun` calls `checkRun`: the app's schedule, its version recomputed here, the person's OK on that version, a real folder.
2. `openSession` runs `paseo run -d --cwd <cwd> --title <title> … -- <startupPrompt>`. `startupPrompt` (`lib/hosts.mjs`) is fixed text: read `references/run.md`, run `schedule.mjs start --key --run --version`, follow what it prints.
3. In the chat, `start` checks the app started this agent (`startedByApp`), runs `checkRun` again, claims progress, and prints the instructions as a quote.
4. The chat ends with `progress`, `end`, and `release`.

Two problems:

- **Name.** `paseo run --title` names only the agent. With no `--workspace` and no `PASEO_WORKSPACE_ID` (`childEnv` removes it), Paseo mints a `local` workspace and prints `Created workspace <id> - <name> (<branch>)` on stderr (`@getpaseo/cli` `dist/commands/agent/run.js`). In a main checkout the name is `main`. `workspace.mjs` already fixes this for worktrees with `parseCreated` and `nameWorkspace`. Evidence, 2026-11-09 13:00 UTC: seven runs made `local_checkout` workspaces with `title: null`; WongOS's `wks_78c9f957dee72f5f` still has none.
- **Indirection.** The fixed prompt kept the app's text out of the first message, so a break-in at the app could not write a prompt. But step 1 already proves the text is the approved version before the chat opens, so step 3 repeats work. Background runs already pass `schedule.instructions` straight to the worker (`daily/scripts/worker.mjs`, `enqueue … text: schedule.instructions`).

## Goals / Non-Goals

**Goals:** a chat run's workspace carries the schedule's title; its first message is the approved text; all checks and the progress claim happen before the chat opens; a run ends with one command.

**Non-Goals:** renaming open workspaces; Paseo-native schedules (`paseo schedule`); background runs; how a schedule is made or approved.

## Decisions

- **Claim before open.** `startRun` claims progress with `appProgress(client, key).claim(run.id)` after `checkRun` and `admit`. A refused claim returns `{ state: 'blocked', reason: 'busy' }` and opens nothing. A failed open releases the claim. The app already shows a blocked run with its reason.
- **`firstMessage` replaces `startupPrompt`.** `firstMessage({ schedule, run, progress })` returns the instructions unchanged, a `---` line, and a footer: the schedule's name, key and run id; `authority` in plain words (reuse the wording `shownText` uses); `until` when set; the whole progress, as one line of JSON, never cut; and the `finish` command. The instructions go first, so a text that starts with `/news` reaches the chat app as a slash command.
- **Trust comes from the version, not the wording.** The text in the message is `schedule.instructions` from the same read whose recomputed version matched the local OK, so it is the text the person approved. No other app field reaches the message except `authority`, `until` and progress, which the version also covers (progress is the run's own data, shown whole as data).
- **`finish` replaces `start`, `progress` and `release`.** `schedule.mjs finish --key K --run R [--progress <json file>] [--done <proof>]` writes progress if given, ends the schedule if `--done` is given, then releases. It refuses when this run does not hold the claim. `start` is removed; `progress` and `release` stay as `finish`'s parts only if a test or another caller needs them.
- **Rename after the run.** `openSession` reads `stderr`, calls the exported `nameWorkspace(bin, parseCreated(stderr), title, env)`, and returns its `warning`. `runRound` logs it as `message`, a field the helper log allows. The `run-result` body is unchanged.
- **`run.md` shrinks.** It says only what the footer can not: do the instructions within the authority, ask before any other step, and run `finish` once. The footer links it for a chat that wants more.

## Risks / Trade-offs

- **A chat app that does not expand a slash command in a first message** treats `/news` as text. The model still reads it as "run /news". The check after build confirms Paseo with Claude Code expands it.
- **Paseo may change its stderr line.** Then `parseCreated` returns null, the workspace stays `main`, the log says why, and the run is unaffected.
- **A run that never calls `finish`** keeps the claim, as today with `release`. The next due run then shows *Already running* in place of a chat that stops; clearing a stuck claim stays as it is today.
