# Daily becomes a module any project can add

**Status:** in-progress
**Branch:** durable-hamster
**Open questions:** none

## Why

Today, check-ins, the journal, your morning and hourly jobs, keeping chats in line, and `/schedule` work only inside a full WongStack project, because they lean on WongStack's app, its memory code, and its build steps. A project that wants only these must take all of WongStack. Memory is now a module any project adds with one pasted message; Daily is next, by the same guide. We also drop three parts that see little use.

## What Changes

- **Any project can add Daily with one pasted message.** The person pastes the message into any AI tool. The AI copies Daily in, writes the person's settings file, fills what the project is missing, runs Daily's check, and saves the work. It asks before each step that costs money or makes something public, and before it pushes. Until setup is done, each new chat asks once: *Daily isn't set up yet. Set it up now?*
  ```mermaid
  flowchart TD
    A[Pasted message] --> B{WongStack project?}
    B -->|yes| X[Stop: it is already there]
    B -->|no| C[Copy Daily in]
    C --> D[Write your settings file]
    D --> E{An app with schedules?}
    E -->|yes| F[Connect it]
    E -->|no| G{Paseo here?}
    G -->|yes| H[Schedules go to Paseo]
    G -->|no| I[Schedules off, says why]
    F --> J[Run the check]
    H --> J
    I --> J
    J --> K[Save, ask before a push]
  ```

- **It works alone, and does more where the project has more.** Each part that differs by project comes through one named slot. An empty slot turns off only that part.
  | Part | Alone | In WongStack |
  |---|---|---|
  | Check-ins on each stop | Yes | Yes |
  | Journal and *what's going on?* | Yes | Yes |
  | Morning and hourly add-ons, your own jobs | Yes | Yes |
  | Keep my chats in line | Runs from the worker, with Paseo | A schedule in the app |
  | `/schedule` | Paseo schedules; off with no Paseo | The app, as today |
  | Who you are | Your git email | Your company sign-in |
  | The Inbox and the live line | None | As today |

- **The Inbox, the live line, and app schedules stay WongStack's.** They need WongStack's app, so they stay outside the module and plug into its slots. WongStack projects see no change in how schedules run.
  ```text
  goes in the module         stays in WongStack
  check-ins, the journal     the Inbox page
  add-ons, your own jobs     the live line
  keep chats in line         schedules in the app
  /schedule                  the background helper
  ```

- **The Inbox opens on the plans waiting for you, not on a list of chats.** The list of open chats goes, with the send each minute that kept it current and the *Close chat* button. Plans to review sit on top, then the Archive. To close finished chats, ask *what's going on?* in any chat.
  ```picture
  Before: pictures/inbox-before.png
  After: pictures/inbox-after.png
  Nothing waits: pictures/inbox-nothing-waits.png
  Try it: https://daily-module-wongstack-staging.matthewwong525.workers.dev/apps/inbox/
  ```

- **Two asks go away.** *Remind me Friday to …* goes: ask for a one-time schedule instead, which does the same. *Tell flashy-crab …* and *watch flashy-crab* go: you answer a chat in that chat, and Daily already watches every chat in the project.
  ```text
  stays                        goes
  what's going on?             remind me Friday …
  stop / start check-ins       tell flashy-crab …
  check the orders on Mondays  watch flashy-crab
  ```

- **The app's saved list of your chats is deleted.** It can't be undone. Nothing else reads it once the chat list is gone.

- **Updates keep your edits.** A full WongStack project gets Daily with each update, as today. A project with Daily alone pastes the update message. Your own edits stay. When an edit and an update change the same lines, the update stops, names each file, and changes nothing.

## What the build needs

- **Nothing.**

Non-goals: an Inbox, a live line, or a schedule store for projects that are not WongStack; a scheduler other than the app and Paseo; any change to how check-ins sort a stop, or to how WongStack's schedules run.

## Capabilities

### New Capabilities

- `daily-module`: the daily and schedule skills as one module any repo adds alone by a pasted message: its two folders and hooks, its profile slots and what each does when empty, schedules with no app (Paseo, else off), the line-up run from the worker, the chat-start ask, its setup and its update.

### Modified Capabilities

- `daily-routine`: the asks lose *remind me*, *watch* and *tell*; the background jobs and the Needs-you kinds lose the chat list; the journal loses the chat-list failure line.
- `host-schedules`: a background schedule's review page shows in the person's Inbox, not as a chat row.
- `inbox`: the Inbox opens on the review pages waiting for the person; the chat list and the *Close chat* row action are removed; the Archive sits below the waiting pages.

## Impact

- **Module (source):** `.agents/skills/daily/` and `.agents/skills/schedule/` move to `.agents/plugins/daily/daily/` and `.agents/plugins/daily/schedule/`; each `.agents/skills/<name>` becomes a link. `daily/` gains `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `hooks/`, `module.json`, `README.md`, `references/setup.md`, and `scripts/lib/` copies of the memory, Paseo, and computer helpers it uses. `scripts/lib/slot.mjs` loads the profile.
- **WongStack's Daily extras:** `.agents/daily/profile.mjs` (ships; the rest of `.agents/daily/` stays install-owned) and `.agents/inbox/`: the app schedule store, the run claim and report, the old-records move-in, and the sign-in, moved out of `schedule/scripts/lib/`. `.agents/settings.json`, `.agents/hooks.json`, `.agents/memory/session-start.mjs`, `.claude-plugin/marketplace.json`, `hand-over/` (`helper.mjs`, `reply-link.mjs`, `lib/wake.mjs`, `lib/computer.mjs`), and `explore/scripts/` (`step-title.mjs`, `other-work.mjs`) are repointed.
- **App:** `app/src/apps/inbox/Chats.tsx` becomes a waiting-pages list; `app/worker/apps/inbox/chats.ts` and its routes go; a new migration drops the `chats` table.
- **Payload:** `payload-files.json` maps both folders and lists the new files; `payload-manifest.md` names `.agents/daily/profile.mjs` as shipped; `scripts/retired-names.json`; `.agents/memory/areas.json` gains `daily-module`.
- **Checks:** `scripts/check-module-versions.mjs` reads `module.json`'s folders; `scripts/tests/module-install.test.mjs` installs Daily alone and runs its check; the daily, schedule, step-title, reply-link, and Inbox tests follow the moves and the removals.
- **Docs:** `wiki/development/daily.md`, `wiki/development/reply-links.md`, `wiki/stack/host-schedules.md`, `wiki/maintaining/adding-a-module.md`, and `CHANGELOG.md` (major: the chat list and three asks go).

## Decision log

- **2026-11-11** — Asked how a project that is not WongStack gets the app part → chose one server part in the module, later replaced (next entries).
- **2026-11-11** — Asked what Daily does in a project with no app → chose to look at whether the parts that need the app are needed at all.
- **2026-11-11** — Asked what shape the module takes, given the app parts are in use → chose the computer side only: the Inbox, the live line, and app schedules stay WongStack's and plug in through a slot; with no app, `/schedule` uses Paseo.
- **2026-11-11** — Asked which parts WongStack drops → chose the reminders ask, the Inbox chat list, and tell or watch a chat.
- **2026-11-11** — Assumed: the module is two folders, `daily/` (with the hooks and version) and `schedule/`, so `/schedule` keeps its name, because a plugin's inner skill would become `/daily:schedule`.
- **2026-11-11** — Assumed: with no schedule store, the worker runs the line-up on its own pass, because a Paseo schedule every 5 minutes would open a chat each time, and the line-up needs Paseo anyway.
- **2026-11-11** — Assumed: with no app and no Paseo, `/schedule` says what it needs and prints a line for the computer's own timer for a script, and edits no timer itself, because changing the computer's timers is outside the project.
- **2026-11-11** — Assumed: the profile is `.agents/daily/profile.mjs`, shipped while the rest of `.agents/daily/` stays the install's, because that folder already holds each person's Daily settings.
- **2026-11-11** — Assumed: the workspace launcher and tidy-up stay in `schedule/`, with the build steps they used reached through slots, because Daily's own runs open and tidy workspaces with them.
- **2026-11-11** — Assumed: the release is major, because the chat list and three asks go.
- **2026-11-11** — Assumed: the app store's code moves to `.agents/inbox/` (`schedules.mjs`, `runs.mjs`, `move-in.mjs`, and `lib/` with `app`, `approvals`, `defaults`, `legacy` and `progress`), because each part reads the company app, and the module must import nothing outside its two folders.
- **2026-11-11** — Assumed: the store also has `check`, `extra` and `show(key, world, raw)`, and `schedule.mjs store` names the store in use, because the worker checks a handed run through the store, `move-in`, `move`, `hosts`, `mirror` and `legacy` are WongStack's own commands, and `D check` reads the store's name.
- **2026-11-11** — Assumed: `move-in` stays `schedule.mjs move-in` through the store's `extra`, not a second command line in `.agents/inbox/move-in.mjs`, because `D ensure` and the docs already call it there.
- **2026-11-11** — Assumed: `slotNow` answers the hooks that can not wait (`person` for `who`, `chatName` for the chat card) from the profile loaded at the hook's start; `offeredChoices` gets the Stop hook's input; `checkout` returns `{refused, extra}`, not a throw, because a thrown error from the profile counts as empty.
- **2026-11-11** — Assumed: a profile `person` keeps the sign-in states (`valid`, `near`, `expired`), and Daily trusts its email only while `valid` or `near`, as it did for the app's sign-in.
- **2026-11-11** — Assumed: the store's `report` sends a blocked run's reason too, so a run taken while check-ins are off still reaches the app.
- **2026-11-11** — Assumed: `answer` and `allow` refuse the `person` bucket, and `answer` loses the `line-up` bucket, because only the Inbox relayed the person's choice and the line-up's answers came from it; `reply --bucket person` stays for `/close`.
- **2026-11-11** — Assumed: the Paseo store saves only with `--approve`, since Paseo keeps no approval of its own, and a one-time run becomes a cron line with `--max-runs 1` in its own time zone.
- **2026-11-11** — Assumed: `D check` sorts a made-up stop with a stand-in judge, so it proves the hook's path without an AI run.
- **2026-11-11** — Assumed: `installText` needed no change for links that leave the module, because it already rewrites each relative link for the copy's place.
- **2026-11-11** — Assumed: `sources.chats` in an older settings file gets one journal line that it does nothing, as `sources.tasks` does, and the default settings no longer turn it on.
- **2026-11-11** — Assumed: the module keeps no `computer.mjs` copy, because its only user, the chat list, is gone.
- **2026-11-11** — Assumed: the profile's `person` takes the company app's address from the remote in a copy installed through the app when memory names no app, so a failed fetch still names the sign-in step, as before.
- **2026-11-11** — Assumed: `workspace.mjs` starts `main()` with no top-level await, because the profile imports it through `step-title.mjs`, and the await deadlocked that import.
- **2026-11-11** — Check: removed the tests of the Inbox chat list (`app/src/apps/inbox/Chats.test.tsx`, `app/worker/apps/inbox/chats.test.ts`, `chatCalls`, the watch's chat-list sync, the step title's row put and remove), of `hand`, and `scripts/tests/daily-todos.test.mjs`, because that code is gone; `daily-module.test.mjs` and `module-install.test.mjs` test the slots, the stores, the worker's line-up and Daily installed alone.
- **2026-11-11** — Check: the worker's Needs-you tests now use the Paseo kind, and lost their chat-list case, because the `chats` kind went with the chat list. The ask-check stop tests now pass `offeredChoices` through `offered`, because the profile owns that test now.
- **2026-11-12** — Asked how to fit the new setup guide under the skill word limit → chose to count each module's setup guide apart.
- **2026-11-12** — Check: `measure-context.mjs` counts a module's `references/setup.md` (Daily's and memory's) as on-call, out of the instruction total, because only a project that adds the module reads it; no chat here loads it.
- **2026-11-12** — Asked which permission mode a Paseo schedule runs in with no one there → chose full permissions, as the app's schedules run.
- **2026-11-12** — Assumed: a `checkout` part that throws, answers late, or whose profile fails to load refuses the open with a plain reason, and only no profile or no `checkout` part opens the branch as it is, because the review gate must not open unreviewed work. This replaces the earlier rule that a thrown `checkout` counts as empty.
- **2026-11-12** — Assumed: `checkout` gets 60 seconds, not the usual 10, because its review fetches the branch, and a slow fetch must not refuse a good open.
- **2026-11-12** — Assumed: `D check` on a profile that does not load runs the rest with every part empty, names the error, and reports `failed`, because setup calls Daily ready only at `ok`; the stop hook and the other commands go on with every part empty.
- **2026-11-12** — Assumed: `adding-a-module.md` picks the shape by hooks: a module with hooks installs as a plugin, so each bare-named command is a sibling folder listed in `module.json` (Daily); a module with no hooks keeps commands in `skills/<command>/` with a `mapped` entry each (the loop), because a plugin's nested skill is renamed `/<module>:<command>`.
- **2026-11-12** — Assumed: `codex-plugin.mjs` installs every plugin the root `marketplace.json` lists, not a fixed pair, so a later module with hooks needs no edit there.
- **2026-11-12** — Assumed: `daily/SKILL.md` keeps its relative links to the wiki and the loop's ask page, as memory's and the loop's skills do, because an install rewrites them for the copy's place and the module rule covers imports, not reading links; a plain repo reads Daily's own references.
- **2026-11-12** — Assumed: the loop module goes to `1.0.3`, because `main` took `1.0.2` for its own loop edits while this change held `1.0.2` for its `plan/SKILL.md` link, and one version must mean one folder.
- **2026-11-12** — Assumed: a profile that fails to load stops `/schedule` and keeps the worker's line-up off, with no move to Paseo, because a quiet move would hide the app's schedules and save new ones outside it with full permissions.
- **2026-11-12** — Assumed: with no store, the timer line names the plan's timezone beside it, because the computer's timer reads the time in its own timezone.
- **2026-11-12** — Saved for the preview check: the build, the review's fixes, and the setup test in a plain repo pass; the Inbox preview check is next.
