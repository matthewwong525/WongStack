# Design

## Context

[Adding a module](../../../wiki/maintaining/adding-a-module.md) owns the rules; memory (`.agents/plugins/memory/`, v52–v53) is the example. Today `daily/` and `schedule/` reach out of their folders in these places:

| From | Into | For |
|---|---|---|
| both | `memory/scripts/lib/{cli,primary-root,headless,transcripts,store}.mjs` | CLI helpers, the main checkout, a headless run, transcript parsing, `.env` parsing, repo context |
| `daily.mjs` who, `schedule/lib/approvals.mjs` | `.agents/memory/d1/connect.mjs` | the app origin and the signed-in email |
| `daily/worker.mjs` | `.agents/memory/knowledge.mjs` | links company knowledge into a background run's copy |
| `daily/stop-check.mjs` | `explore/scripts/ask-check.mjs` | skips the judge when the turn ended on offered choices |
| `daily/chat-list.mjs` | `explore/scripts/step-title.mjs` | a chat's saved `<STEP>: <task>` name and folder |
| `schedule/workspace.mjs` | `continue/scripts/pickup.mjs`, `save/scripts/delivery-route.mjs` | `--checkout` review and pin; a sign-in hint |
| `daily`, `schedule` | `hand-over/scripts/lib/{computer,inbox}.mjs` | computer id, helper files, the app client |
| `daily/chats.mjs` | `scripts/company-api.mjs` | the chat-list row calls |

Core reaches in too, which the guide allows: `.agents/memory/session-start.mjs` (spawns `daily.mjs ensure` and `tidy.mjs sweep`), `.agents/memory/tidy-pages.mjs` (the deny list), `explore/scripts/{step-title,other-work}.mjs`, `hand-over/{helper,reply-link}.mjs` and `lib/wake.mjs`, `close/SKILL.md`, `plan/references/new-workspace.md`, and `wong-setup/SKILL.md`. Hooks for `daily.mjs mark` and `stop-check.mjs stop` sit in `.agents/settings.json` and `.agents/hooks.json`.

The parallel plan `plan-module` (workspace focused-baboon) moves `step-title.mjs`, `ask-check.mjs`, and `other-work.mjs` to `.agents/plan/` and adds `module.json` for a module with no hooks. Whichever ships second rebases its paths onto the other.

## Goals / Non-Goals

**Goals:** Daily and `/schedule` install alone from one pasted message; every outside reach goes through a profile slot; WongStack behaves as today, minus the three dropped parts.

**Non-Goals:** a portable Inbox, line, or schedule store; cron management; changing check-in judgment, the line-up's rules, or the app's schedule clock.

## Decisions

### 1. Layout

```text
.agents/plugins/daily/
  daily/                     → .agents/skills/daily (link; real folder in installs)
    SKILL.md  README.md  module.json
    .claude-plugin/plugin.json  .codex-plugin/plugin.json   (version, equal)
    hooks/claude.json  hooks/codex.json
    references/  setup.md, briefs/, chief.md, example.json, sweeps.json, schedules.json
    scripts/     daily.mjs, chief.mjs, worker.mjs, …, session-start.mjs
    scripts/lib/ cli.mjs, primary-root.mjs, headless.mjs, transcripts.mjs,
                 env.mjs, paseo.mjs, computer.mjs, slot.mjs
  schedule/                  → .agents/skills/schedule
    SKILL.md  references/  scripts/ (schedule.mjs, workspace.mjs, tidy.mjs, presets.mjs,
                                     lib/{records,version,defaults,hosts,progress,paseo-store,start-run}.mjs)
```

- `module.json` is `{ "name": "daily", "folders": ["daily", "schedule"] }`. The version lives in both `plugin.json` files, as memory's does; `module.json` names the folders only. Claude Code namespaces a plugin's inner skills (`/daily:schedule`), so `schedule/` stays a sibling folder to keep `/schedule`.
- `schedule/` imports `daily/` by `../../daily/…`: in an install both are siblings in the skills folder, so the import stays inside the module's folders.
- `scripts/lib/` holds the module's own copies of the memory helpers it used and of `computerId`/`helperFiles` (same files under `~/.wong-stack/`, same format). `schedule/scripts/lib/paseo.mjs` moves to `daily/scripts/lib/paseo.mjs`; core callers (`explore`, `hand-over/lib/wake.mjs`) repoint to it.
- `workspace.mjs` and `tidy.mjs` stay in `schedule/`: Daily opens Needs-you and schedule chats with the launcher, and `finished.mjs` reads the tidy-up's git state.

### 2. Slots

`.agents/daily/profile.mjs` default-exports optional parts. `scripts/lib/slot.mjs` loads it once (`WONG_DAILY_PROFILE` may name another), calls a part with a time limit, and returns `undefined` for a missing part. A part that throws writes one journal line, once a day per part, and counts as empty.

| Slot | Used by | Empty |
|---|---|---|
| `schedules` | `schedule.mjs`, `defaults.mjs`, `start-run.mjs` report | the built-in Paseo store; with no Paseo, `/schedule` is off |
| `person()` → `{ email, state, login, help }` | `D who`, the approvals key | git email, `state: "git"` |
| `chatName(cwd, agent)` → `{ step, task }` | `chat-list.mjs`, line-up | the chat app's title |
| `offeredChoices(transcript)` → bool | `stop-check.mjs` | `false`: every stop goes to the check-in |
| `prepareRun(dir)` | `worker.mjs` before a background run | nothing |
| `checkout(branch, cwd)` | `workspace.mjs --checkout` | plain checkout, no review check |

The `schedules` part is `{ name, list, get, show, save, approve, control, defaults, report }`, each async, each returning what the store confirmed. `schedule.mjs` keeps its commands, its `--help`, and the version fingerprint (`lib/version.mjs`), and prints only what the store returned.

**WongStack's profile** fills every slot:

- `schedules` → `.agents/inbox/schedules.mjs`: today's `schedule/scripts/lib/app.mjs`, `approvals.mjs`, the claim and report half of `app-runs.mjs`, and `legacy.mjs`/`move-in.mjs`, moved out. `schedule.mjs move-in` becomes `.agents/inbox/move-in.mjs`.
- `person` → `.agents/memory/d1/connect.mjs` `signIn`/`signInHelp`, plus the `delivery-route` hint.
- `chatName` → `step-title.mjs` `readState`/`titleOf`. `offeredChoices` → `ask-check.mjs` `stopDecision`. `prepareRun` → `.agents/memory/knowledge.mjs` `linkCopy`. `checkout` → `continue/scripts/pickup.mjs`.

The helper keeps the line and claims due runs in WongStack: `hand-over/reply-link.mjs serveInbox` calls `.agents/inbox/runs.mjs`, which claims from the app, checks this computer's OK, and calls the module's `start-run.mjs` `startRun(run)` to open the chat or hand the run to the worker. `startRun` reports back through `schedules.report`.

**Why `.agents/daily/profile.mjs`:** `.agents/daily/` already holds each person's settings and stays install-owned; only `profile.mjs` ships, named as the one exception in the payload manifest. WongStack's other Daily extras go in `.agents/inbox/`, beside nothing else.

### 3. With no app

- **Paseo store** (`schedule/scripts/lib/paseo-store.mjs`): `save` runs `paseo schedule create` with the instructions as the prompt, the cron or `every`, and the folder; `list`/`get` read `paseo schedule ls --json`; `control` maps to `pause`, `resume`, `run-once`, `delete`. A Paseo schedule is a chat run. `background` kind, `check`, `minutes`, `deny`, team copies, and `until` goals are refused with a plain reason. The chat's OK is the approval: no version ledger.
- **Line-up from the worker:** with no `schedules` slot, `D ensure` adds no defaults; each worker pass runs `line-up-check.mjs` every 5 minutes and starts the line-up brief as a background run when it finds work, under the same 15-minute limit and lane. `D lineup off|on` pauses it in the person's state folder; *stop check-ins* stops it too.
- **No Paseo either:** `schedule.mjs` exits with `{ ok: false, code: "no-store" }`; the skill says what is needed and, for a script, prints the crontab line for the person to add.

### 4. Hooks and the start-of-chat ask

`hooks/claude.json`, by `${CLAUDE_PLUGIN_ROOT}`:

- `SessionStart` (`startup|resume`): `session-start.mjs` runs `mark`, spawns `ensure` detached on `startup`, and on `startup` with no `.agents/daily/` folder prints one line: *Daily isn't set up yet. Ask the person whether to set it up now; follow `references/setup.md` only on a yes.*
- `UserPromptSubmit`, `Notification`: `daily.mjs mark`.
- `Stop`: `daily.mjs mark`, then `stop-check.mjs stop` with a 300-second timeout (it waits up to 4 minutes).

`hooks/codex.json` mirrors it for Codex's events. The same entries leave `.agents/settings.json` and `.agents/hooks.json`, and `ensure` leaves `.agents/memory/session-start.mjs`; its `tidy.mjs sweep` stays, repointed. `helper.mjs start` stays WongStack's. The root `.claude-plugin/marketplace.json` gains `daily` at `./.agents/skills/daily`.

### 5. Setup and update

`daily/references/setup.md`, by memory's shape:

1. Stop in a WongStack install (`.claude/.wong-stack.json`).
2. Copy both folders from GitHub as real folders to `.claude/skills/daily` and `.claude/skills/schedule`.
3. Write `.agents/daily/<person>.json` from `references/example.json` with the git email and the computer's time zone; `sources` empty.
4. Fill slots from what the repo has: an app with its own schedule store → a `schedules` part over it (ask before a deploy or a new database); a sign-in tool → `person`. Write no part the repo can't fill.
5. Codex, as memory's step 5.
6. Check: `node .claude/skills/daily/scripts/daily.mjs check` — it loads the profile, runs one `serve --dry-run` pass, sorts a sample stop with a stand-in judge, and reports the schedule store (`app`, `paseo`, or `off`). Ready only when it prints `ok`.
7. Commit both folders and every file added; ask before a push.

`## Update` merges both folders three ways from the `plugin.json` version, as memory's does, and writes nothing on a clash.

### 6. Removals

- **Reminders ask:** the skill line and the wiki's *Reminders* section go; *remind me* now falls to `/schedule` as a one-time chat schedule.
- **Tell and watch:** `D hand`, `D answer` relays from other chats, the `hands.json` file, and `chief.md`'s *The person's answers* go. `D reply` stays: *what's going on?* uses it to send `/close`.
- **Chat list:** `todos.mjs` (rows and closes), `chats.mjs`'s app calls, `step-title.mjs`'s row put, `/close`'s row removal, the `chats` Needs-you kind, and the `sources.chats` setting (a no-op with one journal line, like `tasks`) go. In the app, `Chats.tsx` becomes `Waiting.tsx`, reading the existing `reviews` route's `waiting` list and the `items` route's `computerOnline`; `chats.ts` goes and its routes join `retiredRoutes`. Migration `20261112120000_drop_inbox_chats.sql` drops `chats`; `inbox_items.chat` stays, unused, so no table rebuild.

### 7. Checks

- `check-module-versions.mjs`: a module folder with no root `plugin.json` reads `*/module.json` for its folders and the first folder's `plugin.json`, else `module.json`, for its version.
- `module-install.test.mjs`: for `daily`, copies both folders into an empty repo, no profile, runs a chat start (asserts the one ask line, and none on resume), `daily.mjs check` (asserts `off` with no Paseo on `PATH`, `paseo` with a fake `paseo` on `PATH`), and fails on an import outside the two folders.

## UX

**Brief.** Jo, away from the desk, opens the Inbox on a phone to see what waits on them and open it. Done is the page open. Common case: zero to three pages waiting; edge: none waiting, or the computer is offline. Mirrors today's `Chats.tsx` *Needs you* part, which already shows review rows; frequency assumed a few times a day.

**Flow.** Open the Inbox → tap the top row → the page opens. One tap.

**Hierarchy.** The one primary action is the top waiting row. *Schedules* and the Archive search are secondary.

**Components.** Top bar (title, *Computer online*/*offline* badge, *Schedules* ghost button); *Needs you* heading with a count badge; one card per page: title, `folder · day, time`, *Review* badge; an empty line *Nothing waits for you.*; the existing Archive.

### Review

[review.html](review.html): the What Changes item *The Inbox opens on the plans waiting for you* draws the screen, before and after.

## Risks / Trade-offs

- **Two plans move the same callers.** `plan-module` moves `step-title.mjs` and `ask-check.mjs`; this plan's profile imports them. The second to ship repoints the profile; the module itself never names them.
- **The line-up runs two ways.** In WongStack it is an app schedule; alone it runs from the worker. Both start the same check and brief, so one test drives `line-up-check.mjs` both ways.
- **Paseo schedules are a smaller feature set.** Refusing background runs, checks, and deny lists outright is safer than running them unchecked; the skill names each refusal.
- **Deleting `chats` can't be undone.** Nothing reads it after the change; the migration runs at the live deploy only.
- **Hook timeouts in a plugin.** The stop check needs 300 s; the test asserts the plugin hook's timeout is at least that.
