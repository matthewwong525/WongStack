# Design

## Context

The daily's worker (`.agents/skills/daily/scripts/worker.mjs`, `daily.mjs serve`) journals what it can not do. 47.0.0 made a board read failure one journal line a day and opened no chat. The service watch (`chief.mjs passes`) emits `not-read` only the first time a source fails each day, and it clears the source silently when it reads again. WongOS's worker opens a sign-in chat on the first board failure (`signInOpener` and `signIn` in `/root/WongOS/.agents/daily/worker.mjs`), once a day, and keeps the chat's id so its watch skips it.

## Goals / Non-Goals

Goals: one chat after a second failure in a row of the same kind; one chat per kind per local day; a reset on success; the chat skipped by the watch, the to-dos and each chat's stop check; a journal line when the chat can not open.

Non-goals: a chat for add-on or to-do failures; a chat on the first failure; a message to any other chat.

## Decisions

- **Kinds.** `board` (watch source `board`), `paseo` (watch source `workspaces`), `morning` (the settings read or the morning pass throws), `job:<id>` (a timed job's check throws, or its run does not start). Each kind has a plain name for the title: *the week board*, *Paseo*, *the morning start*, *the job <title>*.
- **The count lives in its own file**, `<state>/needs-you.json`: `{ counts: {kind: n}, opened: {kind: day}, chats: [agentId] }`. The queue file is loaded and saved around each `dispatch`, `sweep` and `pump`, so a second writer there would lose updates.
- **`makeWorker` gains `failed(kind, {line, what, reason})` and `worked(kind)`.** `failed` adds one to the count. At 1 it writes `line` to the journal. At 2 or more, if `opened[kind]` is not today, it sets `opened[kind]` first (one try a day, as WongOS does), then awaits `openChat({ title, message })`; it journals `Opened: Needs you: …` and keeps the returned `agentId` (the last 14), or journals `Not opened: Needs you: … — <reason>`. A dry run prints `wouldOpen` and changes nothing. `worked` deletes the count. `ignored()` gives `chats`.
- **The message** names what broke, the reason, the default fix steps for the kind, and, when the settings name a `guide`, tells the chat to read it first and follow its own fix for this problem. It ends: ask the person only for a step that needs them, then check the fix. The defaults:
  - `board`: run `D who`; on `missing` or `expired`, run its `login` command and show the person its link; then `D start --report` reads again.
  - `paseo`: run `paseo ls`; fix what its error names, such as a stopped Paseo daemon.
  - `morning`: run `D start --dry-run`; fix the settings file it names by `wiki/development/daily.md#your-settings-file`.
  - `job:<id>`: run the job's `check` script by hand with `node`; fix the check or the brief by `wiki/development/daily.md#your-own-jobs`.
- **The watch tells the worker each failure and each recovery, in the service only.** In `passes`, with `service` on, `missed` emits `not-read` on every failed read, with `again: true` when the source is already listed; a listed source that reads again emits `{event: 'read', source}`. A chat's own watch keeps its once-a-day output. The worker journals an `again` line only through `failed`, and never journals `read`.
- **The opener is injected.** `daily.mjs serve` passes `openChat: ({title, message}) => launchWorkspace({destination: project, title, message})`, the routine launcher, which gives `agentId` and Paseo's reason on a failure. `serveDaily` passes `ignore: worker.ignored()` to each `watch` call, so `admit` and `keepTodos` (its `never` set) skip the chat.
- **Each chat's stop check skips it.** `stopCheck` reads `<state>/needs-you.json` and skips when `env.PASEO_AGENT_ID` is in `chats`.
- **Morning.** `serveDaily`'s once-a-day `note` set goes: a settings read error or a morning that throws calls `failed('morning', …)` with the same lines as today; a pass that completes calls `worked('morning')`.
- **Jobs.** `checked` calls `failed('job:<id>', …)` with its `Not read: job …` line, and `worked` on an answer that asks for no run; an answer that asks for a run leaves the reset to `start`. `start` of a `sweep` item calls `failed` with its `Not started: …` line, `worked` once it starts; other items journal as today. `start` becomes async.

## Risks / Trade-offs

- A morning or a job that fails for a minute and then works opens no chat; one that fails two passes in a row opens one, even if it would work a minute later. The count is per run of failures, so the cost is at most one chat a kind a day.
- A Paseo that is down can not open the chat about itself; the journal line is the only signal, as the request settles.
- A worker that restarts keeps the count and the day's opened kinds in the file, so a restart does not open a second chat.

## Migration Plan

None: the new file is made on the first failure. An install's own `guide` may add fix text; nothing else changes.
