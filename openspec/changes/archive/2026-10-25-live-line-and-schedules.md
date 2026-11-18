<!-- openspec-archive v1 2026-10-25-live-line-and-schedules -->
<!-- file proposal.md utf8 15714 -->
# A live line from your computer to the app, and schedules in your inbox

**Status:** ready-to-ship
**Branch:** chat-server-communication
**Open questions:** none

## Why

Your computer asks the app for news every 10 seconds, and the morning check looks at your chats once a minute. So an inbox tap can take a while to arrive, a quick reply gets missed, and the checking runs all day even when nothing happens. Schedules live in Paseo on one computer, with no one place to see what runs next or how the last run went. The helper that does all this can start chats with full control of the computer, so whatever replaces the polling must not give the app, or anyone who breaks into it, any more power than it has today.

## What Changes

- **Taps reach your chat right away.** Your computer keeps one line open to the app, connecting out, the way a browser tab does. When you tap in the inbox, the app says *look now* down the line, and your computer picks up the tap at once, as it does today. Nothing opens a door into your computer: no webhook, no open port, nothing waiting for a call. If the line drops, your computer goes back to checking every 10 seconds until it reconnects.
  ```mermaid
  sequenceDiagram
    participant You as You (inbox)
    participant App
    participant PC as Your computer
    participant Chat
    PC->>App: open the line (signed in as you)
    You->>App: tap Build it
    App-->>PC: look now
    PC->>App: what's waiting for me?
    App->>PC: the tap
    PC->>Chat: the message it fixed
    PC->>App: Sent
    App-->>You: Sent
  ```
- **The line can't tell your computer to do anything.** It only ever says *look now*. Your computer then asks for its work, signed in as you, and acts only on what it set up itself: a tap on a page it made, sending the message it fixed for that button, or a schedule whose instructions are saved in your repo and haven't changed since you approved them. The app never sends a command, a prompt, or code. So someone who broke into the app could at most start an approved schedule early or send a tap, as they could today, and both show up on your screens.
  | Coming from the app | Your computer |
  |---|---|
  | *look now* | asks for its work, signed in as you |
  | a tap on a page it made | sends the message it fixed for that button |
  | a run of a saved, unchanged schedule | starts that schedule's chat |
  | anything else | ignores it and writes it in its log |
- **The inbox updates right away too.** An open inbox joins the same line, so a new card, *Sent*, or *Didn't arrive* shows at once, not on the next refresh. It still refreshes on its own if the line drops.
  ```mermaid
  flowchart TD
    change["Something changes"] --> line{"Inbox on the line?"}
    line -- yes --> now["Shows at once"]
    line -- no --> later["Shows on the next refresh"]
  ```
- **The helper starts with your computer.** Setup adds it as a background program that starts when the computer does, runs as you, and never with more rights than your chats. Any chat restarts it if it stopped. You can turn it off, and the inbox then works by checking, as it does now. It warns you when your computer's Node is too old to have the latest security fixes.
  ```mermaid
  flowchart TD
    boot["Computer starts"] --> helper["Helper starts"] --> line["Opens the line"]
    chat["A chat starts"] --> alive{"Helper running?"}
    alive -- no --> helper
  ```
- **The morning check hears a chat stop right away.** Each chat says *I stopped* the moment it does, so the chief of staff and your inbox see a quick reply in seconds, not on the next minute's check. The minute check stays as a backstop.
  ```mermaid
  flowchart LR
    stop["A chat stops"] --> tell["It says so at once"] --> chief["The chief looks now"]
    tick["Every minute"] --> chief
  ```
- **Your schedules, in your inbox.** The inbox gets a second view, *Schedules*, beside your agents, since both are yours alone. It lists every schedule you own: what it does, when it runs next, and how its last run went. You can pause it, resume it, or run it now. Schedules still running in Paseo show too, marked *Runs in Paseo*. You set up or change a schedule by asking in a chat, as today. You see only your own schedules.
  ```screen
  <div class="col gap phone">
    <div class="row gap"><h3>Inbox</h3><span class="grow"></span><span class="tag-outline">Computer on</span></div>
    <div class="row gap"><button class="btn-ghost">Agents</button><button class="btn-primary">Schedules</button></div>
    <div class="card col gap">
      <div class="row gap"><b>Daily plan</b><span class="grow"></span><span class="tag">On</span></div>
      <span class="muted">Every weekday at 8:00 · next Mon 8:00</span>
      <span class="muted">Last run today 8:00 · done</span>
      <div class="row gap"><span class="grow"></span><button class="btn-ghost">Pause</button><button class="btn-primary">Run now</button></div>
    </div>
    <div class="card col gap">
      <div class="row gap"><b>Invoice follow-up</b><span class="grow"></span><span class="tag-outline">Paused</span></div>
      <span class="muted">Every Friday at 10:00</span>
      <span class="muted danger">Last run Fri 10:00 · missed, computer was off</span>
      <div class="row gap"><span class="grow"></span><button class="btn-primary">Resume</button></div>
    </div>
    <div class="card col gap">
      <div class="row gap"><b>Weekly research</b><span class="grow"></span><span class="tag-outline">Runs in Paseo</span></div>
      <span class="muted">Ask your assistant to move it here.</span>
    </div>
  </div>
  ```
  ```screen
  <div class="col gap phone">
    <div class="row gap"><h3>Inbox</h3><span class="grow"></span><span class="tag-outline">Computer off</span></div>
    <div class="row gap"><button class="btn-ghost">Agents</button><button class="btn-primary">Schedules</button></div>
    <div class="card col gap">
      <span class="bar">No schedules yet</span>
      <span class="muted">Ask your assistant to do something every week, or on a date.</span>
    </div>
    <div class="card col gap">
      <span class="muted">Run now on Daily plan is waiting for your computer.</span>
      <div class="row gap"><span class="grow"></span><button class="btn-ghost">Cancel</button></div>
    </div>
  </div>
  ```
- **The app's clock starts each run.** At the due time the app says *look now*, and your computer opens the schedule's chat, as Paseo does today. A run that comes due while your computer is off starts once when it's back, if it isn't too late, and otherwise shows as *Missed*. A run never happens twice.
  ```mermaid
  flowchart TD
    due["Due time"] --> on{"Computer on?"}
    on -- yes --> run["Chat starts"]
    on -- no --> back["Computer comes back"] --> late{"Too late?"}
    late -- no --> run
    late -- yes --> missed["Shown as Missed"]
  ```
- **Schedules in Paseo stay where they are.** Nothing moves by itself. Ask your assistant to move one, and it pauses the Paseo copy before the app's copy can run, so the same work never runs twice.
  | | Today | After |
  |---|---|---|
  | New schedule | Paseo's clock | The app's clock |
  | Existing Paseo schedule | Paseo | Stays in Paseo until you move it |
  | Where you see them | Ask in a chat | Your inbox's *Schedules* view, or ask in a chat |

Non-goals: no webhook or open port on your computer; Paseo Hub stays optional and unused; private links for passwords, keys and cards keep their own tunnel; other pages a chat opens (forms, lists to approve) keep the tunnel for now; setting up or changing a schedule stays in the chat; no team-wide schedule view; starting a schedule's chat still needs a chat app that can open one, Paseo today.

## Capabilities

### New Capabilities

- `live-line`: the outbound connection from a signed-in computer, and an open inbox, to the person's company app; what it may carry (a wake-up only), how the computer acts on one, presence, the fallback, the background helper, and the Node warning.

### Modified Capabilities

- `host-schedules`: the company app becomes a host whose clock starts runs on the owner's computer, replacing *adds no scheduling service or Durable Object*; adds the inbox's *Schedules* view (owner only), missed runs, run-at-most-once, and moving a Paseo schedule without a double run.
- `daily-routine`: the watch learns of a stop when the chat reports it, keeping the minute check as a backstop.

## Impact

- App Worker: a Durable Object class (one per person and install) holding WebSocket hibernation sockets for computers and open inboxes, plus its alarm as the schedule clock; `app/wrangler.jsonc` binding and migration for production, staging and local; the class and its wake helper live in the inbox app (`app/worker/apps/inbox/`), re-exported by `app/worker/index.ts`.
- Inbox app: worker routes call the wake helper; the page opens the line and keeps its polling as the fallback.
- Inbox app gains a *Schedules* view and schedule routes (`app/src/apps/inbox/`, `app/worker/apps/inbox/`), a migration for its tables, and one small, pinned cron library in the app.
- Computer side: `.agents/skills/hand-over/scripts/reply-link.mjs` and `lib/inbox.mjs` (the line, with polling as fallback; PROTOCOL bump), a new background-helper installer (systemd or launchd), session-start restart, the Node minimum warning; `.agents/skills/schedule/scripts/` gains an `app` host adapter and the run starter; `.agents/skills/daily/scripts/daily.mjs` wakes on stop events; `.agents/settings.json` and `.agents/hooks.json` gain the stop report.
- Setup and sync install the background helper, asking first.
- Specs: new `live-line` (and its `areas.json` entry); deltas to `host-schedules` and `daily-routine`.
- Wiki: `wiki/development/reply-links.md`, `wiki/stack/host-schedules.md`, `wiki/development/daily.md`, `wiki/development/required-tools.md`, a new `wiki/stack/live-line.md` linked from `wiki/stack/README.md`.
- `CHANGELOG.md`: a minor entry whose Updating note says the update adds a small background helper that starts with the computer, after asking.

## Decision log

- **2026-10-24** — Asked whether to plan the live line alone or with schedules → chose both together, in one change.
- **2026-10-24** — Asked which clock starts a schedule → chose the app's clock, which wakes the computer over the line, over keeping Paseo's clock with the app as a board.
- **2026-10-24** — Asked who sees a schedule in the app → chose only its owner, like the inbox.
- **2026-10-24** — Asked how the computer's helper stays running → chose a background program that starts with the computer, restarted by any chat, over running only while a chat is open.
- **2026-10-24** — Assumed: the computer connects out over a WebSocket rather than taking webhooks or running a listening server, because an open door on a computer whose chats control the whole machine is the biggest risk, and the person stressed security.
- **2026-10-24** — Assumed: the line carries only a *look now* wake-up, never a tap, a command, or a prompt, and the computer then uses today's signed-in routes, because a hijacked line then gains nothing and today's at-most-once delivery stays the one path.
- **2026-10-24** — Assumed: a schedule's chat starts only from the instructions saved in the repo on that computer, checked against the approved revision, never from text the app sends, because the app must not be able to make the computer run anything new.
- **2026-10-24** — Assumed: Paseo Hub is not used, because it is another company's service that would get rights to start chats on the computer, and WongStack works without Paseo.
- **2026-10-24** — Assumed: the open inbox joins the same line, because the page polls taps every 3 s and its list every 15 s, so instant delivery would otherwise show late.
- **2026-10-24** — Assumed: Paseo schedules show in the *Schedules* view as *Runs in Paseo*, read-only, and move only when asked, because the page should be the one place to look and the update must not move a job by itself.
- **2026-10-24** — Assumed: the tunnel stays for private links and for pages other than plans, because private links must never pass through the app and moving other pages is a separate change.
- **2026-10-24** — Assumed: chats report a stop through the hooks they already run, writing a local note the watch notices, with no network call, because the watch and the chats share one computer.
- **2026-10-24** — Assumed: a minor release, because it adds behavior and installs a background helper only after asking.
- **2026-10-24** — Review note asked whether schedules belong inside the inbox app, since both are per person → changed: schedules are a second view of the inbox, sharing its sign-in, app tick and line, with no separate Schedules app.
- **2026-10-24** — Assumed: the Schedules view has no Delete button; deleting stays in `/schedule`, which also updates the saved schedule file, because setting up or changing a schedule stays in the chat.
- **2026-10-24** — Assumed: *Run now* on a paused schedule is refused, because a pause means no run starts until resumed.
- **2026-10-24** — Assumed: the app's clock is chosen only when the helper runs as a background service, because otherwise a run would wait on a chat being open.
- **2026-10-24** — Assumed: the computer also guards schedule runs itself (remembers run ids it started, enforces the record's minimum gap with a floor when none is set, at least a second between rounds), because the app alone deciding how often a run starts broke the promise that a break-in could at most start an approved schedule early (second-look review).
- **2026-10-24** — Assumed: skill-text cuts come only from the schedule and daily skills, restoring the lines cut from setup's tools reference, the required-tools page and the stack-pack fragments, because the plan named only those skills for cuts (second-look review).
- **2026-10-24** — Assumed: the skill-text budget is met by tightening this change's own additions and rewording restored sentences without losing their meaning, never by raising the baseline, because a loosened check needs a reason this change doesn't have.
- **2026-10-24** — Assumed: the minimum gap between runs is kept per folder the chat opens in, and the started-runs file is written whole or not at all, because a clone could otherwise reset the gap and a crash mid-write blocked every schedule (second-look reread).
- **2026-10-24** — Checkpoint: every build task written and checked locally (local checks pass), the second look's six findings fixed across two rounds; saved for the live preview walk (task 8.2), which is still open.
- **2026-10-24** — Assumed: the helper's list of signed-in folders is named `folders.json`, because `apps.json` is a retired name and the file lists checkouts, not apps.
- **2026-10-24** — Live walk on staging, as the signed-in owner through the edge: a tap's look reached the computer in 523 ms and the page read it as *Sent*; schedule writes woke it in 405–886 ms; a run was handed out once; pause refused *Run now* and resume restored the next run; a foreign `Origin` got 403 and the app's own upgraded. The walk found the line never answered a computer's goodbye (a 10 s wait, then 1006), so `Line` now answers it. A real chat opening from *Run now*, the 10 s fallback and the browser page stay covered by tests, not walked: opening a chat needs a published record in the durable checkout.
- **2026-10-25** — Asked whether plain polling would be safer than the line → chose to keep the line, because it only says look and every safety rule lives on the computer. Archive checkpoint: archived for release 44.11.0.

<!-- end proposal.md -->
<!-- file design.md utf8 13913 -->
# Design

## Context

See [proposal.md](proposal.md) for why. The state today:

- **The inbox helper polls.** `serveInbox` in `.agents/skills/hand-over/scripts/reply-link.mjs` (one per computer, `~/.wong-stack/reply-link/inbox.json`, `PROTOCOL = 7`) loops `inboxTick` every `INBOX_POLL_MS` (10 s) while any item is open, then exits. Each round `POST checkin` claims taps per app, `wakeChat` (`lib/wake.mjs`) runs `paseo send … --no-wait`, and `POST tap-result` reports. It runs no listening server; the tunnel `serve` process listens on `127.0.0.1` for non-plan pages only.
- **Auth.** `companyFor(cwd)` (`lib/inbox.mjs`) wraps `companyClient` (`scripts/company-api.mjs` → `scripts/employee-bootstrap.mjs`), which sends a Cloudflare Access user JWT from `cloudflared access token -app=<origin>` in `cf-access-token` on every call. No token is stored by WongStack. Inbox routes accept a human email only, never a service token (`app/worker/apps/inbox/store.ts` `inboxAction`).
- **App inbox.** `app/worker/apps/inbox/` routes over D1 tables `inbox_items`, `inbox_taps`, `inbox_seen`, all keyed by `(installation_id, email)`. `online()` means a check-in within 60 s. The page polls tap state every 3 s (`TapLine.tsx`) and the list every 15 s (`List.tsx`, `PlanView.tsx`). A taken tap without a result fails after 120 s and is never handed out again.
- **No Durable Object, no WebSocket** in `app/worker` today. `app/wrangler.jsonc` has one cron (`*/15`, pushers refresh) and `crons: []` on staging.
- **Daily watch.** `daily.mjs watch` runs `paseo ls --global --json` and `paseo permit ls --json` every 60 s and reads `paseo logs --tail 1` on a stop. It uses no hooks. `.agents/settings.json` already has a Claude `Stop` hook (`ask-check.mjs stop`); `.agents/hooks.json` (Codex) has SessionStart, PreToolUse and SubagentStop.
- **Schedules.** `.agents/skills/schedule/scripts/` validates `schedules/<key>.json` routines and `scheduled-work` goals with a `binding` (`records.mjs`, `hosts.mjs`). Only `host: 'paseo'` has an adapter (`paseo schedule create|inspect|pause|resume|update|run-once|delete`, read back after each). `binding.revision` is the sha256 of the record's instruction fields; `timing.allowedLatenessMs` already exists. The `host-schedules` spec says it "SHALL add no scheduling service, Durable Object, container, or host installation"; this change replaces that sentence.
- Node here is 22.23.3; `app/package.json` engines ask `^22.22.2 || ^24.15.0 || >=26`.

## Goals / Non-Goals

**Goals:** taps, inbox changes and schedule runs reach the computer within seconds; nothing on the computer accepts an inbound connection; the line can't make the computer do anything it couldn't be made to do today; schedules have one owner-only page and one clock that doesn't need Paseo.

**Non-Goals:** moving private links or other tunnel pages into the app; creating or editing schedules from the page; a team view; a non-Paseo chat opener (the run starter is one function a later change can extend); Paseo Hub.

## Decisions

1. **One Durable Object per person per install: `Line`.** Keyed `idFromName(`${installationId}:${email}`)`, the same key every inbox row uses. It holds hibernating WebSockets (`ctx.acceptWebSocket`, tagged `computer:<id>` or `page`) and answers pings with `setWebSocketAutoResponse`, so an idle line costs no duration. Bound as `LINE` in `app/wrangler.jsonc` for production, staging and local, with a `new_sqlite_classes` migration, which the free plan allows. Exported from `app/worker/index.ts`.
   - Alternative: webhooks to the computer. Rejected: needs a public address and a listener on a machine whose chats run with full access.
   - Alternative: Paseo Hub. Rejected: a third party gets daemon permissions, and WongStack must work without Paseo.
   - Alternative: Server-Sent Events from a plain Worker. Rejected: a Worker can't hold the connection for hours or be told about another request's change; a DO can.
2. **The upgrade goes through the normal sign-in.** `GET /apps/inbox/api/line` (an inbox route, so the app tick applies) verifies the Access identity as every route does, requires a human email, and forwards to the person's `Line`. A browser upgrade must carry an `Origin` equal to the app's own origin, which stops another website opening a line with the person's cookie. A computer upgrade sends `cf-access-token` through Node 22's built-in `WebSocket` (`new WebSocket(url, { headers })`), so the computer adds no package. The DO stores the JWT's `exp` in the socket's attachment and closes the socket at that time with its alarm; the computer reconnects with a fresh token.
3. **The line says only `{"t":"look"}`.** The DO never forwards item, tap, or schedule content. On *look* the computer runs one ordinary round: the same `checkin` claim, `tap-result` report, and new schedule `claim`/`run-result` routes. So at-most-once delivery, the 120 s rule, the 5 s pacing, and the fixed messages stay where they are. A computer message other than `hello` or `ping` is ignored; a server message other than `look` or `bye` is ignored and logged. Nudges are coalesced: at most one *look* per socket per second.
4. **Everything lives in the inbox app.** Schedules are a second view of the inbox, so `Line`, its wake helper and the schedule routes sit in `app/worker/apps/inbox/`, with no lint allowance and no second app tick. `app/worker/index.ts` re-exports the class, since Workers need it from the entry. `wake(env, installationId, email, computer?)` is called after a successful D1 write by `tap`, `tap-cancel`, `item-put`, `item-close`, `tap-result`, and the schedule routes. A failed wake never fails the route: polling still covers it.
5. **Presence comes from the line.** `hello {computer, protocol}` upserts `inbox_seen.last_checkin_at` and a ping every 30 s refreshes it, so `computerOnline` keeps its 60 s meaning with no new column. Each computer gets a random id in `~/.wong-stack/computer.json`, made once.
6. **The computer keeps polling as the fallback.** Line open: a safety `checkin` every 5 minutes. Line down: today's 10 s, while reconnecting with backoff from 1 s to 60 s. `REPLY_LINK_INBOX_POLL_MS` still overrides. `PROTOCOL` goes to 8, so the next helper start swaps the old one by today's command-line-checked swap.
7. **The helper becomes long-lived, started by the computer.** `serveInbox` no longer exits when idle while it runs as a service. A new `.agents/skills/hand-over/scripts/helper.mjs install|uninstall|status|start` writes:
   - Linux: a systemd user unit `wongstack-helper.service` (`Restart=always`), with `loginctl enable-linger` for a computer nobody logs into; when the user is root, a system unit with `User=root`, matching the chats' own rights.
   - macOS: a LaunchAgent `com.wongstack.helper.plist` with `KeepAlive`.
   - Other systems: `status` says unsupported, and the session-start restart is all there is.
   
   The unit runs a small launcher at `~/.wong-stack/helper/run.mjs` that reads `~/.wong-stack/helper/current.json` (`{script, protocol}`) and runs that script. The checkout with the highest `PROTOCOL` writes it, always pointing at its primary checkout, never a worktree that tidy-up may delete. The session-start hook calls `helper.mjs start`, which starts it when no live helper answers. No new secret is stored: sign-in stays in cloudflared's own cache.
8. **Every action is logged on the computer.** The helper appends one line per delivered tap, started run, refused run, or ignored message to `~/.wong-stack/helper/log.jsonl` (no message text), rotated at 1 MB, so the person can see what the app caused.
9. **Node minimum.** `wiki/development/required-tools.md` records the minimum patched Node per line in one place, read by `helper.mjs`; below it, `start` prints a warning the session-start hook passes on, and the helper still runs.
10. **Stop reports through hooks, locally.** The Claude `Stop` and `Notification` hooks and the Codex `Stop` hook run `daily.mjs mark`, which touches `~/.wong-stack/agent-events/<PASEO_AGENT_ID>` when that variable is set and does nothing otherwise. `watch` adds `fs.watch` on that folder and runs a pass on the first event, debounced 1 s, keeping the 60 s pass. If the Codex build in use has no `Stop` hook, Codex chats keep the 60 s pass.
11. **Schedules: app tables, DO alarm as the clock.** A migration adds `schedules (installation_id, email, key, computer_id, name, summary, timing_json, revision, state, next_run_at, updated_at)` and `schedule_runs (id, installation_id, email, key, due_at, state, claimed_at, result, chat_title, updated_at)`. Run states: `due → taken → started | failed | blocked`, plus `missed` and `cancelled`. The person's `Line` keeps one alarm at the earliest `next_run_at` across their schedules (also used for token expiry, whichever comes first). On alarm it inserts a `due` run, advances `next_run_at`, and sends *look* to the bound computer only. Next times come from one small, pinned, dependency-free cron library (croner, exact version) with the schedule's timezone; `every` intervals are computed directly.
   - At most one waiting run per schedule: a new due time while one is still `due` marks the older `missed`.
   - `claim {computer}` hands out only runs bound to that computer, still within `allowedLatenessMs`; older ones become `missed`. A `taken` run without a result in 2 minutes becomes `failed` and is never handed out again, mirroring taps.
   - *Run now* inserts a `due` run, limited by the record's `authority.minIntervalMs`, and can be cancelled until taken.
12. **The computer starts a run only from its repo.** On a claimed run the helper reads `schedules/<key>.json` from the durable checkout named in its local binding, recomputes the revision, and starts the session only when it equals the binding's approved revision and the app's `revision`. The start prompt is built on the computer exactly as the Paseo adapter builds it today; the app sends only the run id, key and revision. The session opens through the same opener workspaces use (`paseo run` via `workspace.mjs` code, titled in plain words). It reports `started` with the chat's title, or `blocked` with a reason code.
13. **An `app` host adapter in `hosts.mjs`.** `create` uploads the record's display fields, timing, revision and the computer id (`PUT /apps/inbox/api/schedule`), `inspect` reads back next run and last run, and `pause|resume|run-once|update|delete` call the matching routes, each read back as the Paseo adapter does. The binding's `execution.host` is `app` and `nativeId` is the key. `/schedule` prefers `app` when the helper runs as a service and the company app answers.
14. **Paseo schedules on the page are a read-only mirror.** The helper uploads, every 15 minutes and after each `/schedule` change, one summary row per repo-owned record bound to `paseo` (name, cadence, next run from `paseo schedule inspect`), marked with host `paseo`. Moving one is `/schedule move <key>`: pause in Paseo, read back, register with `app`, read back, then delete in Paseo; a failure in between leaves Paseo paused and the move pending, never both active.

## Risks / Trade-offs

- **A broken-into app or Cloudflare account** can still send tap notes into a chat (true today, bounded at 20,000 characters under a fixed header) and start an approved schedule early. It can't start new work or run code on the computer. The page and the helper's log show both.
- **A long-lived helper is a new always-on process.** It runs as the chats' user, listens on nothing, stores no new secret, and can be uninstalled.
- **Root on a server.** Matthew's server runs chats as root, so the helper runs as root there; it never gains rights the chats lack.
- **Clock skew and missed alarms.** DO alarms retry on failure; a stale `next_run_at` is repaired on the computer's `hello`, which asks the DO to re-arm.
- **Access in front of WebSockets.** Access passes WebSocket upgrades with a valid token; if the edge refuses the header form, the fallback is today's polling, and apply checks it on the preview first.
- **A new app dependency** (the cron library) is pinned to an exact version and reviewed; no package is added on the computer.
- **Workers runtime tests.** DO behavior needs the Workers runtime; another workspace is adding runtime tests (`test-workers-runtime`). If it lands first, DO tests use it; otherwise they use a stubbed `DurableObjectState`.

## UX

### Use-case brief

The owner, mostly on a phone between other work, checks what will run and whether the last run worked, and sometimes pauses or runs one now. Done means they know the state at a glance and the tap takes effect. Common case: one to five schedules, all *On*. Edge cases: computer off, a missed run, a schedule still in Paseo, none yet. Looked at a few times a week. Lives in the inbox and mirrors its card layout.

### Flow

Open the inbox → tap *Schedules* → read the cards → tap *Run now*, *Pause* or *Resume* → the card shows the new state, or *Waiting for your computer* with *Cancel* when it is off. Changing a schedule's timing or instructions sends them to a chat.

### Hierarchy

The view switch (*Agents* | *Schedules*) sits under the title; *Agents* stays the default, so today's inbox opens as before. Each card's one primary action is *Run now* when on, *Resume* when paused; *Pause* is secondary. A Paseo card has no action, only *Ask your assistant to move it here.* The computer's on or off state sits top right, small.

### Review

[review.html](review.html): What Changes item 6 (*Your schedules, in your inbox*) sketches the list, the empty state, the computer-off state and a waiting run.

### Components

Existing `ToggleGroup` for the view switch, and `Card`, `Button` and `Badge` from `app/src/components/ui/`, laid out as the inbox's cards. The view is kept in the address (`?view=schedules`) so a link opens it. Nothing new.

<!-- end design.md -->
<!-- file tasks.md utf8 7485 -->
# Tasks

## 1. App: the line

- [x] 1.1 Add the `Line` Durable Object (`app/worker/apps/inbox/line.ts`): hibernating sockets tagged `computer:<id>` or `page`, ping auto-response, `hello` presence upsert into `inbox_seen`, token-expiry close via alarm, coalesced `{"t":"look"}` sends, anything else ignored; re-export it from `app/worker/index.ts`; add the `LINE` binding and `new_sqlite_classes` migration to production, staging and local in `app/wrangler.jsonc` (design 1, 5)
- [x] 1.2 Add `GET line` to `app/worker/apps/inbox/api.ts`: human email only, browser `Origin` must equal the app origin, forward the upgrade to the person's `Line` (design 2)
- [x] 1.3 Add `wake(env, installationId, email, computer?)` in `app/worker/apps/inbox/`, and call it after successful writes in inbox `tap`, `tap-cancel`, `item-put`, `item-close`, `tap-result`; a failed wake never fails the route (design 4)
- [x] 1.4 Tests beside the code: only `look` is ever sent, another person's tap never wakes this line, a foreign `Origin` and a service token are refused, expiry closes the socket, presence keeps `computerOnline` true, a failed wake leaves the route's answer unchanged; use the Workers runtime suite if `test-workers-runtime` has landed, else a stubbed `DurableObjectState`

## 2. App: the inbox page

- [x] 2.1 In `app/src/apps/inbox/`, open the line from the page, refresh the list and tap states on `look`, and keep today's 3 s and 15 s polling only while the line is down
- [x] 2.2 Tests: a `look` refreshes at once; a refused or dropped line falls back to polling; 100% lines covered

## 3. Computer: the helper

- [x] 3.1 In `.agents/skills/hand-over/scripts/reply-link.mjs` and `lib/inbox.mjs`, open the line per reachable app with Node's built-in `WebSocket` and `cf-access-token`, run one round on `look`, poll every 5 minutes while open and 10 s while down, reconnect with backoff, send `hello`/`ping`, ignore and log anything else; raise `PROTOCOL` to 8 (design 3, 5, 6)
- [x] 3.2 Add the computer id (`~/.wong-stack/computer.json`) and the action log (`~/.wong-stack/helper/log.jsonl`, no message text, 1 MB rotation) (design 5, 8)
- [x] 3.3 Add `.agents/skills/hand-over/scripts/helper.mjs install|uninstall|status|start`: systemd user unit with linger, system unit when root, macOS LaunchAgent, unsupported elsewhere; the launcher and `current.json` pointing at the primary checkout; the Node-minimum warning read from `wiki/development/required-tools.md` (design 7, 9)
- [x] 3.4 Call `helper.mjs start` from the session-start hook in `.agents/settings.json` and `.agents/hooks.json`
- [x] 3.5 Tests in `scripts/tests/`: `look` triggers one round, a non-`look` message acts on nothing, line down falls back to 10 s, the unit files are written for each system (dry run), `current.json` never points into a worktree, an old Node warns and keeps running

## 4. App: schedules

- [x] 4.1 Add a migration in `schema/migrations/` for `schedules` and `schedule_runs` (design 11)
- [x] 4.2 Add schedule routes to `app/worker/apps/inbox/api.ts`: `GET schedules`, `PUT schedule`, `POST pause|resume|run-now|run-cancel|delete`, `POST claim`, `POST run-result`, `PUT mirror`; owner-only by email, human email only, like every inbox route; `run-now` honors `minIntervalMs`; each write calls `wake` for the bound computer (design 11, 13, 14)
- [x] 4.3 Teach `Line` the schedule clock: one alarm at the earliest of next run and token expiry, insert `due` runs, advance `next_run_at` with the pinned cron library (exact version in `app/package.json`), mark superseded and late runs `missed`, fail a `taken` run after 2 minutes, re-arm on `hello` (design 11)
- [x] 4.4 Add the *Schedules* view to `app/src/apps/inbox/`: an *Agents* | *Schedules* switch kept in `?view=`, *Agents* the default, cards per the proposal's sketches, the computer on/off tag, empty state, waiting run with *Cancel*, Paseo rows read-only; mirror the inbox's card layout (design UX)
- [x] 4.5 Tests: owner-only lists, pause stops runs, a run is handed out once, a run past its lateness is `missed`, *Run now* while offline waits and cancels, a Paseo row has no action; page states render; 100% lines covered

## 5. Computer: schedules and the daily watch

- [x] 5.1 On a claimed run, read `schedules/<key>.json` from the bound durable checkout, check the revision against the binding and the app, build the start prompt as the Paseo adapter does, open the session through the workspace opener, report `started` or `blocked` (design 12)
- [x] 5.2 Add the `app` adapter to `.agents/skills/schedule/scripts/lib/hosts.mjs` (create, inspect, pause, resume, run-once, update, delete, each read back) and prefer it in host selection when the helper runs as a service and the app answers (design 13)
- [x] 5.3 Add `/schedule move <key>` (pause in Paseo, read back, register with `app`, read back, delete in Paseo; pending on failure) and the 15-minute Paseo mirror upload from the helper (design 14)
- [x] 5.4 Add `daily.mjs mark`, wire it to the Claude `Stop` and `Notification` hooks and the Codex `Stop` hook, and make `watch` run a pass on the first event in `~/.wong-stack/agent-events/`, debounced 1 s, keeping the 60 s pass (design 10)
- [x] 5.5 Tests: a changed or unknown schedule record is `blocked` and starts nothing, the adapter's read-backs and failure states, a move that fails midway leaves Paseo paused and nothing double-active, `mark` without an agent id is a no-op, a marked stop is seen before the next minute
- [x] 5.6 Update `.agents/skills/schedule/SKILL.md` and `.agents/skills/daily/SKILL.md` for the app host, `move`, and the stop report, with offsetting cuts if `measure-context` needs them

## 6. Setup and sync

- [x] 6.1 Have `/wong-setup` offer `helper.mjs install` once, in its tools question, and `/wong-sync`'s plan carry it as a to-do for an install without it

## 7. Specs, wiki and release

- [x] 7.1 Add `live-line` to `.agents/skills/memory/references/areas.json`, and add the new schedule migration to the `inbox` area's paths
- [x] 7.2 Edit `openspec/specs/host-schedules/spec.md`'s Purpose to drop "without installing another scheduling service"
- [x] 7.3 Write `wiki/stack/live-line.md` (what the line carries, why nothing listens, the helper, turning it off, the log), link it from `wiki/stack/README.md`; update `wiki/development/reply-links.md` (the 10 s check is now the fallback), `wiki/stack/host-schedules.md` (the app's clock, the page, moving), `wiki/development/daily.md` (stop reports), `wiki/development/required-tools.md` (the Node minimum)
- [x] 7.4 Add a `## Next (minor) — A live line to your computer, and schedules in the app` entry at the top of `CHANGELOG.md` whose **Updating.** note says, in plain words, that the update offers a small background helper that starts with the computer and keeps the inbox and schedules instant, and that existing Paseo schedules stay put until moved

## 8. Verification

- [x] 8.1 Run `node .github/scripts/checks.mjs --worktree` (payload links, OpenSpec config, measure-context, app suite) and fix what fails
- [x] 8.2 `/save`, then on the preview: open the line from this computer with a real Access token through the edge, tap a test plan and see it reach the chat within a few seconds, kill the line and see the 10 s fallback deliver, open the inbox and see *Sent* without a refresh, create a test schedule on the app's clock, *Run now* and see its chat open, pause and resume it, and clean up the test schedule and items

<!-- end tasks.md -->
<!-- file specs/daily-routine/spec.md utf8 1007 -->
## MODIFIED Requirements

### Requirement: The watch tells the inbox where each agent stands

While the inbox is available, the daily watch SHALL report each watched agent's state to it: planning, waiting on the person, working with its latest step and the chief's last action, or done with its checked proof. A report SHALL carry no more of the agent's words than its latest step's one line. An agent that closes SHALL leave the inbox. The watch SHALL learn of a stop as soon as the agent reports it, and SHALL still check every minute for an agent that reports nothing.

#### Scenario: The chief keeps an agent going

- **WHEN** the chief replies *keep going* to the landing-page agent
- **THEN** its inbox card shows its latest step and *Kept going* within a minute

#### Scenario: A quick reply between checks

- **WHEN** a watched agent answers and stops again within a few seconds of the chief's reply
- **THEN** the watch sees the second stop at once, and its inbox card and the chief both act on it

<!-- end specs/daily-routine/spec.md -->
<!-- file specs/host-schedules/spec.md utf8 3832 -->
## MODIFIED Requirements

### Requirement: Scheduling uses a verified available host

For work selected to run as assistant sessions, `/schedule` SHALL use the company app's clock when the owner's computer has the background helper and a chat app that can open a session, and otherwise the person's chosen or available host scheduler, distinguishing the host from the assistant model and verifying the capabilities needed in the future execution environment. It SHALL add no container or cloud runner. Before activation it SHALL show the task, destination, absolute next time and timezone, required uptime, and material capability limits.

#### Scenario: The app's clock is available

- **WHEN** a person signed in to their company app, with the helper running, asks for a weekly task
- **THEN** the schedule uses the app's clock, runs on that computer, and reports that the computer must be on

#### Scenario: Codex runs inside Paseo

- **WHEN** a Codex session in Paseo requests future work, the app's clock is unavailable, and Paseo supplies the suitable scheduler
- **THEN** the schedule uses the verified Paseo destination and reports what must remain running

#### Scenario: Only an open-session loop is available

- **WHEN** the person requests a fresh session after this chat ends but only a session-bound loop is available
- **THEN** no independent future schedule is claimed, and the missing capability is reported

## ADDED Requirements

### Requirement: The inbox lists and controls each owner's schedules

The inbox SHALL offer a Schedules view, behind the company sign-in and the inbox's own access, listing the signed-in person's schedules with what each does, its state, its next run and its last run's time and result. It SHALL let the owner pause, resume, and run a schedule now, and SHALL show schedules still kept by another host, read-only, with where they run. It SHALL never show one person's schedule to another. Setting up or changing a schedule SHALL stay in the chat.

#### Scenario: Pause from a phone

- **WHEN** the owner taps *Pause* on a weekly schedule
- **THEN** it shows *Paused* and no run starts until they resume it

#### Scenario: Another person's schedule

- **WHEN** a teammate opens the inbox's Schedules view
- **THEN** they see only schedules they own

### Requirement: An app-clock run starts at most once, on the owner's computer

At a schedule's due time the app SHALL wake the owner's computer the schedule is bound to, and that computer SHALL open the schedule's session from the instructions saved in its repo. A run SHALL start at most once. A run that comes due while the computer is away SHALL start once on its return when still within the schedule's allowed lateness, and SHALL otherwise show as missed. A run asked for now while the computer is away SHALL wait and offer *Cancel* until the computer takes it.

#### Scenario: The computer was off

- **WHEN** a daily 8:00 run comes due while the computer is off and it returns at 15:00, past the allowed lateness
- **THEN** no session starts for that run, it shows as missed, and the next day's run happens normally

#### Scenario: Taken but never reported

- **WHEN** the computer takes a run and its result never comes back
- **THEN** the run shows as not started, and it is never handed out again

### Requirement: Moving a schedule to the app's clock never runs it twice

An existing schedule on another host SHALL stay there until the owner asks to move it. Moving SHALL pause the original before the app's copy can run, and SHALL remove the original only after the app's copy is registered and read back.

#### Scenario: Moving the weekly research

- **WHEN** the owner asks to move a Paseo schedule to the app
- **THEN** the Paseo schedule is paused first, the app's copy takes the next due time, and the work runs once

<!-- end specs/host-schedules/spec.md -->
<!-- file specs/live-line/spec.md utf8 4334 -->
# live-line Specification

## Purpose

One outbound connection from a person's signed-in computer, and from their open inbox, to their company app, so taps, changes and schedule runs arrive at once without opening any way into the computer.

## ADDED Requirements

### Requirement: The computer connects out and never listens

The person's computer SHALL reach the app only by connecting out, signed in as that person, and SHALL open no port, accept no webhook, and run no server for the app to call. While its line is open, a tap SHALL reach the chat within a few seconds. When the line cannot open or drops, the computer SHALL fall back to checking on today's cadence and SHALL reconnect on its own.

#### Scenario: A tap with the line open

- **WHEN** the line is open and the person taps *Build it* on a plan in the inbox
- **THEN** the chat gets the build request within a few seconds, with no open port on the computer

#### Scenario: The line drops

- **WHEN** the connection to the app is lost
- **THEN** taps still arrive by the regular check, and the line reopens once the app can be reached

### Requirement: The line carries a wake-up, never a command

The app SHALL send nothing down the line but a signal to look for waiting work. The computer SHALL fetch that work through its signed-in requests and SHALL act only on a tap on an item it made itself, sending only the message it fixed for that action, or on a run of a schedule whose instructions are saved in its repo and match the revision the owner approved. It SHALL never run a command, prompt, or code received from the app, and SHALL ignore and log anything else.

#### Scenario: Work the computer didn't set up

- **WHEN** the app hands the computer a run for a schedule key its repo has no record of, or whose instructions changed since approval
- **THEN** no chat starts, the run shows as blocked, and the computer's log records it

#### Scenario: A message that is not a wake-up

- **WHEN** anything other than a wake-up arrives on the line
- **THEN** the computer ignores it and acts on nothing

### Requirement: Only the person's own computer and inbox share a line

A line SHALL belong to one signed-in person in one company app. It SHALL close when that person's sign-in ends or expires, and SHALL refuse a page from another website. One person's activity SHALL never wake another person's computer or inbox.

#### Scenario: Two people on one team

- **WHEN** Ana taps in her inbox while Ben's computer is connected to the same app
- **THEN** only Ana's computer is woken

#### Scenario: Sign-in expires

- **WHEN** the person's company sign-in expires while the line is open
- **THEN** the line closes, and the computer reopens it only with a fresh sign-in

### Requirement: An open inbox updates at once

An open inbox SHALL join its person's line, so a new item, a tap's *Sent* or *Didn't arrive*, and a closed item show at once. When it cannot join, it SHALL keep refreshing itself as before.

#### Scenario: Sent shows at once

- **WHEN** the computer reports a tap reached its chat while the inbox is open
- **THEN** the tap shows *Sent* without waiting for the next refresh

### Requirement: The helper starts with the computer and can be turned off

Setup SHALL offer to run the computer's helper as a background program that starts with the computer and runs as the same user as the chats, never with more rights. Any chat that starts SHALL restart it when it is not running. The person SHALL be able to turn it off, and the inbox SHALL then work by checking while a chat runs. An update SHALL ask before adding it.

#### Scenario: After a restart

- **WHEN** the computer restarts and no chat has been opened yet
- **THEN** the helper is running and a due schedule or a tap is picked up

#### Scenario: Turned off

- **WHEN** the person turns the helper off
- **THEN** it no longer starts with the computer, and taps arrive by checking while a chat runs

### Requirement: The helper warns on an outdated Node

The helper SHALL warn the person when the computer's Node is older than the minimum WongStack records for current security fixes, and SHALL keep working.

#### Scenario: An old Node

- **WHEN** the helper starts on a Node older than the recorded minimum
- **THEN** the person is told which version to update to, and taps still arrive

<!-- end specs/live-line/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-24

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 98542 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, the light and dark switch (theme.js) at the
  theme marker, and the change name in place of its token. The one script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-25-live-line-and-schedules</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

/* Tailwind's shadow-xs, shadow-sm and shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the
   bottom, so a layer reads as above the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --look-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --look-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; }
:where(a) { color: inherit; text-underline-offset: 0.25rem; }
::selection { background: var(--primary); color: var(--primary-foreground); }
:where(:focus-visible) { outline: 3px solid var(--ring); outline-offset: 2px; }

/* Button (button.tsx): outline by default; .btn-primary, and the pages' button.primary and button.main, filled. */
:where(button, .btn) {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:where(button, .btn):where(:hover:not(:disabled)) { background: var(--accent); color: var(--accent-foreground); }
:where(button.primary, button.main, .btn-primary) { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); box-shadow: none; }
:where(button.primary, button.main, .btn-primary):where(:hover:not(:disabled)) { background: color-mix(in oklab, var(--primary) 90%, transparent); color: var(--primary-foreground); }
:where(.btn-ghost) { border-color: transparent; background: transparent; box-shadow: none; }
:where(button, .btn):where(:disabled) { opacity: 0.5; cursor: default; }

/* Field (input.tsx): a thin border, a soft shadow, and the ring on focus. */
:where(input:not([type=checkbox], [type=radio], [type=file], [type=range], [type=button], [type=submit]), select, textarea, .field) {
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:where(input, textarea)::placeholder { color: var(--muted-foreground); }
:where(input, select, textarea, .field):where(:focus-visible) { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px var(--look-ring); }
:where(input, select, textarea, .field):where([aria-invalid=true]) { border-color: var(--destructive); }
:where(input[type=checkbox], input[type=radio]) { accent-color: var(--primary); }

/* Card (card.tsx) and tag (badge.tsx, secondary). */
:where(.card) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--look-shadow-sm);
}
:where(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.33;
  white-space: nowrap;
}
:where(.tag-outline) { border-color: var(--border); background: transparent; color: var(--foreground); }

/* Skeleton (skeleton.tsx): a grey block that pulses while what it stands for loads, and holds still when motion is
   off. .sr-only keeps the words of a loading state for a screen reader alone. */
:where(.skeleton) { display: block; border-radius: calc(var(--radius) - 2px); background: var(--accent); animation: look-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes look-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { :where(.skeleton) { animation: none; } }
:where(.sr-only) { position: absolute; max-width: 1px; max-height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* The light and dark switch (theme.js): a ghost icon button, 44px, in the page's top right corner, above the page and
   below a note box or full-screen view. It scrolls away with the page's top, so it never sits over text read later.
   In a page's [data-theme-toggle] slot it sits in line. The icon shows the look it switches to: moon on light. */
.theme-toggle {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--foreground);
}
@media (hover: hover) { .theme-toggle:hover { background: var(--accent); color: var(--accent-foreground); } }
[data-theme-toggle] .theme-toggle { position: static; flex: none; }
.theme-toggle svg { width: 1.25rem; height: 1.25rem; pointer-events: none; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 48px 4px 0; }
  .eyebrow { margin:0; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; }
  .item > .drawing:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 var(--pad); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--foreground); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--border); background:var(--muted); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:13px; }
  .art.sketch .f-bg { fill:var(--background); } .art.sketch .f-fg { fill:var(--foreground); } .art.sketch .f-muted { fill:var(--muted); } .art.sketch .f-subtle { fill:var(--muted-foreground); }
  .art.sketch .f-line { fill:var(--border); } .art.sketch .f-card { fill:var(--card); } .art.sketch .f-danger { fill:var(--destructive); }
  .art.sketch .s-bg { stroke:var(--background); } .art.sketch .s-fg { stroke:var(--foreground); } .art.sketch .s-muted { stroke:var(--muted); } .art.sketch .s-subtle { stroke:var(--muted-foreground); }
  .art.sketch .s-line { stroke:var(--border); } .art.sketch .s-card { stroke:var(--card); } .art.sketch .s-danger { stroke:var(--destructive); }
  /* A screen: the look's parts in em, so the kit's fit and zoom scale it; its controls sit in an inert box and never take a tap. */
  .art.screen { line-height:1.4; } .art.screen:not([style]) { width:auto; max-width:49.2em; margin-right:1px; }
  .art.screen .sk { pointer-events:none; user-select:none; } .art.screen .sk > * + * { margin-top:.6em; }
  .art.screen :is(h3, h4, p, ul, ol) { margin:0; } .art.screen h3 { font-size:1.15em; } .art.screen h4, .art.screen small { font-size:.9em; }
  .art.screen .card { margin:0; padding:1em; } .art.screen :is(button, .btn) { min-width:0; min-height:0; padding:.45em 1em; font-size:1em; } .art.screen .tag { margin:0; font-size:.85em; }
  .art.screen :is(input:not([type=checkbox], [type=radio]), textarea, select, .field) { display:block; box-sizing:border-box; width:100%; padding:.45em .7em; }
  .art.screen .skeleton { animation:none; min-height:1em; } .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .sk-bar { display:block; height:.75em; border-radius:.375em; background:color-mix(in oklab, var(--muted-foreground) 25%, transparent); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  .item > .table { grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; overflow-x:auto; border-top:1px solid var(--border); }
  .item > .table:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:var(--pad); min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted-foreground); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--background); }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--muted); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { border-color:var(--foreground); border-style:dashed; background:var(--background); color:var(--foreground); }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; font-weight:400; }
  .entry .where { display:block; color:var(--muted-foreground); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; border-color:var(--input); box-shadow:var(--look-shadow-overlay); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--input); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-overlay); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:1px 0 0; border-radius:0; box-shadow:var(--look-shadow-up); padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted-foreground); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-lg); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--look-shadow-lg); font-size:14px; font-weight:500; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted-foreground); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:var(--background); color:var(--foreground); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:8px 14px; border-radius:var(--radius); background:var(--primary); color:var(--primary-foreground); box-shadow:var(--look-shadow-lg); font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { grid-template-columns:repeat(3, minmax(0, 1fr)); padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
<script>
// The light and dark switch outside the app: inlined in the review page's <head>, served to private pages as /theme.js.
// It applies the saved choice before paint, then adds the button; storage that is off still switches, unremembered.
(function () {
  var KEY = 'wongstack-theme';
  var SVG = 'http://www.w3.org/2000/svg';
  // lucide's moon and sun. The icon shows the look a tap switches to.
  var ICONS = {
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: '12', cy: '12', r: '4' }]].concat(['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(function (d) { return ['path', { d: d }]; })),
  };
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  root.classList.toggle('dark', saved === 'dark');

  function icon(name) {
    var svg = document.createElementNS(SVG, 'svg');
    var attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (part) {
      var el = document.createElementNS(SVG, part[0]);
      Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function draw(button) {
    var dark = root.classList.contains('dark');
    button.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.textContent = '';
    button.appendChild(icon(dark ? 'sun' : 'moon'));
  }

  function mount() {
    if (!document.body || document.querySelector('.theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    draw(button);
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* switched, not remembered */ }
      draw(button);
    });
    var slot = document.querySelector('[data-theme-toggle]');
    if (slot) slot.appendChild(button);
    else document.body.insertBefore(button, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
</script>
</head>
<body data-change="2026-10-25-live-line-and-schedules">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-25-live-line-and-schedules</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Your computer asks the app for news every 10 seconds, and the morning check looks at your chats once a minute. So an inbox tap can take a while to arrive, a quick reply gets missed, and the checking runs all day even when nothing happens. Schedules live in Paseo on one computer, with no one place to see what runs next or how the last run went. The helper that does all this can start chats with full control of the computer, so whatever replaces the polling must not give the app, or anyone who breaks into it, any more power than it has today.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Taps reach your chat right away.</b> Your computer keeps one line open to the app, connecting out, the way a browser tab does. When you tap in the inbox, the app says <i>look now</i> down the line, and your computer picks up the tap at once, as it does today. Nothing opens a door into your computer: no webhook, no open port, nothing waiting for a call. If the line drops, your computer goes back to checking every 10 seconds until it reconnects.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-1-picture-1" tabindex="0" style="width:47.846em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-sequence" viewBox="0 0 622 426" width="622" height="426" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="sequence"><g transform="translate(64.9,8)"><g class="pele-lifelines" fill="none" stroke="var(--_b)"><path class="pele-lifeline" data-id="You" d="M0,44V366"/><path class="pele-lifeline" data-id="App" d="M128.9,44V366"/><path class="pele-lifeline" data-id="PC" d="M357.45,44V366"/><path class="pele-lifeline" data-id="Chat" d="M515.95,44V366"/></g><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge pele-message" data-id="i0"><path d="M357.45,87H135.9"/><path class="pele-marker" d="M128.9,87L136.9,83.64L136.9,90.36Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i1"><path d="M0,124H121.9"/><path class="pele-marker" d="M128.9,124L120.9,127.36L120.9,120.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i2"><path d="M128.9,161H350.45" stroke-dasharray="4 4"/><path class="pele-marker" d="M357.45,161L349.45,164.36L349.45,157.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i3"><path d="M357.45,198H135.9"/><path class="pele-marker" d="M128.9,198L136.9,194.64L136.9,201.36Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i4"><path d="M128.9,235H350.45"/><path class="pele-marker" d="M357.45,235L349.45,238.36L349.45,231.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i5"><path d="M357.45,272H508.95"/><path class="pele-marker" d="M515.95,272L507.95,275.36L507.95,268.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i6"><path d="M357.45,309H135.9"/><path class="pele-marker" d="M128.9,309L136.9,305.64L136.9,312.36Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i7"><path d="M128.9,346H7" stroke-dasharray="4 4"/><path class="pele-marker" d="M0,346L8,342.64L8,349.36Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="i0"><text x="243.18" y="77.4" text-anchor="middle">open the line (signed in as you)</text></g><g class="pele-edge-label" data-id="i1"><text x="64.45" y="114.4" text-anchor="middle">tap Build it</text></g><g class="pele-edge-label" data-id="i2"><text x="243.18" y="151.4" text-anchor="middle">look now</text></g><g class="pele-edge-label" data-id="i3"><text x="243.18" y="188.4" text-anchor="middle">what's waiting for me?</text></g><g class="pele-edge-label" data-id="i4"><text x="243.18" y="225.4" text-anchor="middle">the tap</text></g><g class="pele-edge-label" data-id="i5"><text x="436.7" y="262.4" text-anchor="middle">the message it fixed</text></g><g class="pele-edge-label" data-id="i6"><text x="243.18" y="299.4" text-anchor="middle">Sent</text></g><g class="pele-edge-label" data-id="i7"><text x="64.45" y="336.4" text-anchor="middle">Sent</text></g></g><g class="pele-nodes"><g class="pele-node pele-actor pele-actor-participant pele-actor-footer" data-id="You"><rect x="-56.9" y="366" width="113.81" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="393.6" text-anchor="middle">You (inbox)</text></g><g class="pele-node pele-actor pele-actor-participant pele-actor-footer" data-id="App"><rect x="96.9" y="366" width="64" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="128.9" y="393.6" text-anchor="middle">App</text></g><g class="pele-node pele-actor pele-actor-participant pele-actor-footer" data-id="PC"><rect x="288.98" y="366" width="136.93" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="357.45" y="393.6" text-anchor="middle">Your computer</text></g><g class="pele-node pele-actor pele-actor-participant pele-actor-footer" data-id="Chat"><rect x="483.05" y="366" width="65.79" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="515.95" y="393.6" text-anchor="middle">Chat</text></g><g class="pele-node pele-actor pele-actor-participant" data-id="You"><rect x="-56.9" y="0" width="113.81" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="27.6" text-anchor="middle">You (inbox)</text></g><g class="pele-node pele-actor pele-actor-participant" data-id="App"><rect x="96.9" y="0" width="64" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="128.9" y="27.6" text-anchor="middle">App</text></g><g class="pele-node pele-actor pele-actor-participant" data-id="PC"><rect x="288.98" y="0" width="136.93" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="357.45" y="27.6" text-anchor="middle">Your computer</text></g><g class="pele-node pele-actor pele-actor-participant" data-id="Chat"><rect x="483.05" y="0" width="65.79" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="515.95" y="27.6" text-anchor="middle">Chat</text></g></g></g></svg></div></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The line can't tell your computer to do anything.</b> It only ever says <i>look now</i>. Your computer then asks for its work, signed in as you, and acts only on what it set up itself: a tap on a page it made, sending the message it fixed for that button, or a schedule whose instructions are saved in your repo and haven't changed since you approved them. The app never sends a command, a prompt, or code. So someone who broke into the app could at most start an approved schedule early or send a tap, as they could today, and both show up on your screens.</div></div><div class="table"><table class="tbl"><thead><tr><th>Coming from the app</th><th>Your computer</th></tr></thead><tbody><tr data-note="item-2-row-1" tabindex="0"><td><i>look now</i></td><td>asks for its work, signed in as you</td></tr><tr data-note="item-2-row-2" tabindex="0"><td>a tap on a page it made</td><td>sends the message it fixed for that button</td></tr><tr data-note="item-2-row-3" tabindex="0"><td>a run of a saved, unchanged schedule</td><td>starts that schedule's chat</td></tr><tr data-note="item-2-row-4" tabindex="0"><td>anything else</td><td>ignores it and writes it in its log</td></tr></tbody></table></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The inbox updates right away too.</b> An open inbox joins the same line, so a new card, <i>Sent</i>, or <i>Didn't arrive</i> shows at once, not on the next refresh. It still refreshes on its own if the line drops.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-3-picture-1" tabindex="0" style="width:32.231em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 419 354" width="419" height="354" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_change_line_0"><path d="M189.18,56L189.18,97"/><path class="pele-marker" d="M189.18,104L185.82,96L192.54,96Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_line_now_0"><path d="M171.12,213.66C171.12,229.55 78.47,229.55 78.47,245.44L78.47,290.94"/><path class="pele-marker" d="M78.47,297.94L75.11,289.94L81.83,289.94Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_line_later_0"><path d="M207.23,213.66C207.23,229.55 299.88,229.55 299.88,245.44L299.88,290.94"/><path class="pele-marker" d="M299.88,297.94L296.52,289.94L303.24,289.94Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_line_now_0"><rect x="63.58" y="247.44" width="29.78" height="21" rx="3" fill="var(--_bg)"/><text x="78.47" y="262.84" text-anchor="middle">yes</text></g><g class="pele-edge-label" data-id="L_line_later_0"><rect x="288.1" y="247.44" width="23.57" height="21" rx="3" fill="var(--_bg)"/><text x="299.88" y="262.84" text-anchor="middle">no</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="change" transform="translate(189.18,32)"><rect x="-88.7" y="-24" width="177.41" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Something changes</text></g><g class="pele-node pele-shape-diam" data-id="line" transform="translate(189.18,164.47)"><polygon points="0,-60.47 96.75,0 0,60.47 -96.75,0" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Inbox on the line?</text></g><g class="pele-node pele-shape-rect" data-id="now" transform="translate(78.47,321.94)"><rect x="-70.47" y="-24" width="140.94" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Shows at once</text></g><g class="pele-node pele-shape-rect" data-id="later" transform="translate(299.88,321.94)"><rect x="-110.94" y="-24" width="221.87" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Shows on the next refresh</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The helper starts with your computer.</b> Setup adds it as a background program that starts when the computer does, runs as you, and never with more rights than your chats. Any chat restarts it if it stopped. You can turn it off, and the inbox then works by checking, as it does now. It warns you when your computer's Node is too old to have the latest security fixes.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-4-picture-1" tabindex="0" style="width:29.769em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 387 443" width="387" height="443" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_boot_helper_0"><path d="M303.93,184.57C303.93,230.86 212.56,230.86 212.56,277.14L212.56,283.14"/><path class="pele-marker" d="M212.56,290.14L209.2,282.14L215.92,282.14Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_helper_line_0"><path d="M201.22,338.14L201.22,379.14"/><path class="pele-marker" d="M201.22,386.14L197.86,378.14L204.58,378.14Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_chat_alive_0"><path d="M98.51,56L98.51,97"/><path class="pele-marker" d="M98.51,104L95.15,96L101.87,96Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_alive_helper_0"><path d="M98.51,217.14L98.51,262.64C98.51,270.33 189.88,270.33 189.88,278.02L189.88,283.14"/><path class="pele-marker" d="M189.88,290.14L186.52,282.14L193.24,282.14Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_alive_helper_0"><rect x="86.73" y="239.64" width="23.57" height="21" rx="3" fill="var(--_bg)"/><text x="98.51" y="255.04" text-anchor="middle">no</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="boot" transform="translate(303.93,160.57)"><rect x="-74.9" y="-24" width="149.81" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Computer starts</text></g><g class="pele-node pele-shape-rect" data-id="helper" transform="translate(201.22,314.14)"><rect x="-63.34" y="-24" width="126.69" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Helper starts</text></g><g class="pele-node pele-shape-rect" data-id="line" transform="translate(201.22,410.14)"><rect x="-69.58" y="-24" width="139.17" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Opens the line</text></g><g class="pele-node pele-shape-rect" data-id="chat" transform="translate(98.51,32)"><rect x="-62.46" y="-24" width="124.93" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">A chat starts</text></g><g class="pele-node pele-shape-diam" data-id="alive" transform="translate(98.51,160.57)"><polygon points="0,-56.57 90.51,0 0,56.57 -90.51,0" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Helper running?</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The morning check hears a chat stop right away.</b> Each chat says <i>I stopped</i> the moment it does, so the chief of staff and your inbox see a quick reply in seconds, not on the next minute's check. The minute check stays as a backstop.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-5-picture-1" tabindex="0" style="width:44.154em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 574 152" width="574" height="152" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_stop_tell_0"><path d="M132.05,32L173.05,32"/><path class="pele-marker" d="M180.05,32L172.05,35.36L172.05,28.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_tell_chief_0"><path d="M340.56,32C358.06,32 358.06,68 375.56,68L381.56,68"/><path class="pele-marker" d="M388.56,68L380.56,71.36L380.56,64.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_tick_chief_0"><path d="M324.98,120C350.27,120 350.27,84 375.56,84L381.56,84"/><path class="pele-marker" d="M388.56,84L380.56,87.36L380.56,80.64Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="stop" transform="translate(70.02,32)"><rect x="-62.02" y="-24" width="124.05" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">A chat stops</text></g><g class="pele-node pele-shape-rect" data-id="tell" transform="translate(260.3,32)"><rect x="-80.26" y="-24" width="160.51" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">It says so at once</text></g><g class="pele-node pele-shape-rect" data-id="chief" transform="translate(477.26,76)"><rect x="-88.7" y="-24" width="177.39" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">The chief looks now</text></g><g class="pele-node pele-shape-rect" data-id="tick" transform="translate(260.3,120)"><rect x="-64.68" y="-24" width="129.36" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Every minute</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Your schedules, in your inbox.</b> The inbox gets a second view, <i>Schedules</i>, beside your agents, since both are yours alone. It lists every schedule you own: what it does, when it runs next, and how its last run went. You can pause it, resume it, or run it now. Schedules still running in Paseo show too, marked <i>Runs in Paseo</i>. You set up or change a schedule by asking in a chat, as today. You see only your own schedules.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic screen" data-note="item-6-picture-1" tabindex="0" style="width:27.692em"><div class="sk" inert><div class="col gap phone">
  <div class="row gap"><h3>Inbox</h3><span class="grow"></span><span class="tag-outline">Computer on</span></div>
  <div class="row gap"><button class="btn-ghost">Agents</button><button class="btn-primary">Schedules</button></div>
  <div class="card col gap">
    <div class="row gap"><b>Daily plan</b><span class="grow"></span><span class="tag">On</span></div>
    <span class="muted">Every weekday at 8:00 · next Mon 8:00</span>
    <span class="muted">Last run today 8:00 · done</span>
    <div class="row gap"><span class="grow"></span><button class="btn-ghost">Pause</button><button class="btn-primary">Run now</button></div>
  </div>
  <div class="card col gap">
    <div class="row gap"><b>Invoice follow-up</b><span class="grow"></span><span class="tag-outline">Paused</span></div>
    <span class="muted">Every Friday at 10:00</span>
    <span class="muted danger">Last run Fri 10:00 · missed, computer was off</span>
    <div class="row gap"><span class="grow"></span><button class="btn-primary">Resume</button></div>
  </div>
  <div class="card col gap">
    <div class="row gap"><b>Weekly research</b><span class="grow"></span><span class="tag-outline">Runs in Paseo</span></div>
    <span class="muted">Ask your assistant to move it here.</span>
  </div>
</div></div></div></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic screen" data-note="item-6-picture-2" tabindex="0" style="width:27.692em"><div class="sk" inert><div class="col gap phone">
  <div class="row gap"><h3>Inbox</h3><span class="grow"></span><span class="tag-outline">Computer off</span></div>
  <div class="row gap"><button class="btn-ghost">Agents</button><button class="btn-primary">Schedules</button></div>
  <div class="card col gap">
    <span class="sk-bar">No schedules yet</span>
    <span class="muted">Ask your assistant to do something every week, or on a date.</span>
  </div>
  <div class="card col gap">
    <span class="muted">Run now on Daily plan is waiting for your computer.</span>
    <div class="row gap"><span class="grow"></span><button class="btn-ghost">Cancel</button></div>
  </div>
</div></div></div></div></details></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>The app's clock starts each run.</b> At the due time the app says <i>look now</i>, and your computer opens the schedule's chat, as Paseo does today. A run that comes due while your computer is off starts once when it's back, if it isn't too late, and otherwise shows as <i>Missed</i>. A run never happens twice.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-7-picture-1" tabindex="0" style="width:25.462em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 331 592" width="331" height="592" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_due_on_0"><path d="M145.36,56L145.36,97"/><path class="pele-marker" d="M145.36,104L142,96L148.72,96Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_on_run_0"><path d="M134.79,202.75C134.79,242.56 56.68,242.56 56.68,282.36L56.68,528.05"/><path class="pele-marker" d="M56.68,535.05L53.32,527.05L60.04,527.05Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_on_back_0"><path d="M155.94,202.75C155.94,216.31 218.71,216.31 218.71,229.86L218.71,275.36"/><path class="pele-marker" d="M218.71,282.36L215.35,274.36L222.07,274.36Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_back_late_0"><path d="M218.71,330.36L218.71,371.36"/><path class="pele-marker" d="M218.71,378.36L215.35,370.36L222.07,370.36Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_late_run_0"><path d="M218.54,461.94C218.54,472.25 78.46,472.25 78.46,482.55L78.46,528.05"/><path class="pele-marker" d="M78.46,535.05L75.1,527.05L81.82,527.05Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_late_missed_0"><path d="M242.05,447.46L242.05,528.05"/><path class="pele-marker" d="M242.05,535.05L238.69,527.05L245.41,527.05Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_on_run_0"><rect x="41.79" y="295.86" width="29.78" height="21" rx="3" fill="var(--_bg)"/><text x="56.68" y="311.26" text-anchor="middle">yes</text></g><g class="pele-edge-label" data-id="L_on_back_0"><rect x="206.93" y="231.86" width="23.57" height="21" rx="3" fill="var(--_bg)"/><text x="218.71" y="247.26" text-anchor="middle">no</text></g><g class="pele-edge-label" data-id="L_late_run_0"><rect x="66.68" y="484.55" width="23.57" height="21" rx="3" fill="var(--_bg)"/><text x="78.46" y="499.95" text-anchor="middle">no</text></g><g class="pele-edge-label" data-id="L_late_missed_0"><rect x="227.16" y="484.55" width="29.78" height="21" rx="3" fill="var(--_bg)"/><text x="242.05" y="499.95" text-anchor="middle">yes</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="due" transform="translate(145.36,32)"><rect x="-50.01" y="-24" width="100.02" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Due time</text></g><g class="pele-node pele-shape-diam" data-id="on" transform="translate(145.36,156.68)"><polygon points="0,-52.68 84.29,0 0,52.68 -84.29,0" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Computer on?</text></g><g class="pele-node pele-shape-rect" data-id="run" transform="translate(64.68,559.05)"><rect x="-56.68" y="-24" width="113.36" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Chat starts</text></g><g class="pele-node pele-shape-rect" data-id="back" transform="translate(218.71,306.36)"><rect x="-98.02" y="-24" width="196.05" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Computer comes back</text></g><g class="pele-node pele-shape-diam" data-id="late" transform="translate(218.71,420.21)"><polygon points="0,-41.84 66.95,0 0,41.85 -66.95,0" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Too late?</text></g><g class="pele-node pele-shape-rect" data-id="missed" transform="translate(242.05,559.05)"><rect x="-80.69" y="-24" width="161.38" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Shown as Missed</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Schedules in Paseo stay where they are.</b> Nothing moves by itself. Ask your assistant to move one, and it pauses the Paseo copy before the app's copy can run, so the same work never runs twice.</div></div><div class="table"><table class="tbl"><thead><tr><th></th><th>Today</th><th>After</th></tr></thead><tbody><tr data-note="item-8-row-1" tabindex="0"><td>New schedule</td><td>Paseo's clock</td><td>The app's clock</td></tr><tr data-note="item-8-row-2" tabindex="0"><td>Existing Paseo schedule</td><td>Paseo</td><td>Stays in Paseo until you move it</td></tr><tr data-note="item-8-row-3" tabindex="0"><td>Where you see them</td><td>Ask in a chat</td><td>Your inbox's <i>Schedules</i> view, or ask in a chat</td></tr></tbody></table></div></li>
</ol>
<p class="aside">Non-goals: no webhook or open port on your computer; Paseo Hub stays optional and unused; private links for passwords, keys and cards keep their own tunnel; other pages a chat opens (forms, lists to approve) keep the tunnel for now; setting up or changing a schedule stays in the chat; no team-wide schedule view; starting a schedule's chat still needs a chat app that can open one, Paseo today.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-24</p>Asked whether to plan the live line alone or with schedules → chose both together, in one change.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-24</p>Asked which clock starts a schedule → chose the app's clock, which wakes the computer over the line, over keeping Paseo's clock with the app as a board.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-24</p>Asked who sees a schedule in the app → chose only its owner, like the inbox.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-24</p>Asked how the computer's helper stays running → chose a background program that starts with the computer, restarted by any chat, over running only while a chat is open.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: the computer connects out over a WebSocket rather than taking webhooks or running a listening server, because an open door on a computer whose chats control the whole machine is the biggest risk, and the person stressed security.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: the line carries only a <i>look now</i> wake-up, never a tap, a command, or a prompt, and the computer then uses today's signed-in routes, because a hijacked line then gains nothing and today's at-most-once delivery stays the one path.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: a schedule's chat starts only from the instructions saved in the repo on that computer, checked against the approved revision, never from text the app sends, because the app must not be able to make the computer run anything new.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: Paseo Hub is not used, because it is another company's service that would get rights to start chats on the computer, and WongStack works without Paseo.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: the open inbox joins the same line, because the page polls taps every 3 s and its list every 15 s, so instant delivery would otherwise show late.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: Paseo schedules show in the <i>Schedules</i> view as <i>Runs in Paseo</i>, read-only, and move only when asked, because the page should be the one place to look and the update must not move a job by itself.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: the tunnel stays for private links and for pages other than plans, because private links must never pass through the app and moving other pages is a separate change.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: chats report a stop through the hooks they already run, writing a local note the watch notices, with no network call, because the watch and the chats share one computer.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: a minor release, because it adds behavior and installs a background helper only after asking.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-24</p>Review note asked whether schedules belong inside the inbox app, since both are per person → changed: schedules are a second view of the inbox, sharing its sign-in, app tick and line, with no separate Schedules app.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: the Schedules view has no Delete button; deleting stays in <code>/schedule</code>, which also updates the saved schedule file, because setting up or changing a schedule stays in the chat.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: <i>Run now</i> on a paused schedule is refused, because a pause means no run starts until resumed.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: the app's clock is chosen only when the helper runs as a background service, because otherwise a run would wait on a chat being open.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: the computer also guards schedule runs itself (remembers run ids it started, enforces the record's minimum gap with a floor when none is set, at least a second between rounds), because the app alone deciding how often a run starts broke the promise that a break-in could at most start an approved schedule early (second-look review).</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: skill-text cuts come only from the schedule and daily skills, restoring the lines cut from setup's tools reference, the required-tools page and the stack-pack fragments, because the plan named only those skills for cuts (second-look review).</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: the skill-text budget is met by tightening this change's own additions and rewording restored sentences without losing their meaning, never by raising the baseline, because a loosened check needs a reason this change doesn't have.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: the minimum gap between runs is kept per folder the chat opens in, and the started-runs file is written whole or not at all, because a clone could otherwise reset the gap and a crash mid-write blocked every schedule (second-look reread).</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-24</p>Checkpoint: every build task written and checked locally (local checks pass), the second look's six findings fixed across two rounds; saved for the live preview walk (task 8.2), which is still open.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-24</p>Assumed: the helper's list of signed-in folders is named <code>folders.json</code>, because <code>apps.json</code> is a retired name and the file lists checkouts, not apps.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-24</p>Live walk on staging, as the signed-in owner through the edge: a tap's look reached the computer in 523 ms and the page read it as <i>Sent</i>; schedule writes woke it in 405–886 ms; a run was handed out once; pause refused <i>Run now</i> and resume restored the next run; a foreign <code>Origin</code> got 403 and the app's own upgraded. The walk found the line never answered a computer's goodbye (a 10 s wait, then 1006), so <code>Line</code> now answers it. A real chat opening from <i>Run now</i>, the 10 s fallback and the browser page stay covered by tests, not walked: opening a chat needs a published record in the durable checkout.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-25</p>Asked whether plain polling would be safer than the line → chose to keep the line, because it only says look and every safety rule lives on the computer. Archive checkpoint: archived for release 44.11.0.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line or picture to note it</p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" hidden>
    <button type="button" data-ready="build"><span class="spinner" hidden aria-hidden="true"></span><span>Build it</span></button>
    <button type="button" data-ready="publish" aria-expanded="false" aria-controls="ready-confirm">Build and publish</button>
    <div id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><p>Goes live, can't be undone.</p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span>Yes, publish</span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  function load(text) {
    try {
      const saved = JSON.parse(text || 'null');
      if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
      if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
    } catch (e) { /* unreadable notes start empty */ }
  }
  load(store ? store.getItem(KEY) : null);
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: 'Change #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot.
    // A screen's words sit in many small boxes: join every piece of text with a space.
    const row = el.tagName === 'TR', cells = row ? c.querySelectorAll('td') : el.classList.contains('screen') ? texts(c)
      : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = Array.prototype.map.call(cells, function (n) { return n.textContent.replace(/\s+/g, ' ').trim(); }).join(row ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  // A row's pin and Note button go in its last cell: a table row holds only cells.
  function slot(el) { return el.tagName === 'TR' ? el.lastElementChild : el; }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        slot(el).appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      slot(el).appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return { id: n.id, label: n.label, text: n.text }; }); }
  function acknowledge(notes) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    if (hosted) return hostedAsk(path, body);
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), n = notes.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: bullets(notes).join('\n') });
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (r.status === 409) { says('The plan changed. Reload to read it first.'); toast('The plan changed. Reload to read it first.'); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes);
      says('Sent ' + plural(n) + ' to the chat.');
      toast('Sent ' + plural(n) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── visible build choices, with publish confirmation above the footer ──
  let version = null;
  const publishButton = $('ready').querySelector('[data-ready="publish"]');
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    publishButton.setAttribute('aria-expanded', 'false');
    if (focus && wasOpen && !$('ready').hidden) publishButton.focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready');
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(pending === (step === 'yes' ? 'publish' : step) && step !== 'publish'));
      const spinner = b.querySelector('.spinner');
      if (spinner) {
        const active = pending === (step === 'yes' ? 'publish' : step);
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : step === 'yes' ? 'Yes, publish' : 'Build it';
      }
    });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length) body.text = bullets(notes).join('\n');
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
        : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || step === 'publish') {
      says('');
      $('ready-confirm').hidden = step === 'cancel';
      publishButton.setAttribute('aria-expanded', String(step === 'publish'));
      bar();
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  // ── hosted: in the live app's inbox, a sealed frame that reaches the inbox only through the port its first greeting carries ──
  let hosted = null, port = null;
  const CODES = { sent: 200, changed: 409, done: 409, soon: 429, closed: 410, expired: 410 };
  function post(message) { port.postMessage(message); }
  // The inbox answers a tap only once the chat has it, or once it is refused, cancelled or failed.
  function hostedAsk(path, body) {
    return new Promise(function (resolve) {
      hosted.reply = function (state) {
        const status = Object.prototype.hasOwnProperty.call(CODES, state) ? CODES[state] : 502;
        const answer = status === 200 ? { sent: true } : state === 'changed' ? { changed: true } : state === 'done' ? { done: true } : { sent: false };
        resolve({ ok: status === 200, status: status, json: function () { return Promise.resolve(answer); } });
      };
      post({ type: 'inbox:tap', action: path === 'send' ? 'send' : body.action, text: body.text || '' });
    });
  }
  // The inbox's switch owns the look: this frame can't remember a choice, so its own switch goes. Unknown looks change nothing.
  function look(theme) { if (theme === 'light' || theme === 'dark') document.documentElement.classList.toggle('dark', theme === 'dark'); }
  function heard(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'inbox:theme') look(m.theme);
    else if (m.type === 'inbox:notes' && (typeof m.value === 'string' || m.value === null)) { load(m.value); render(); }
    else if (hosted.reply && m.type === 'inbox:result') { const reply = hosted.reply; hosted.reply = null; reply(m.state); }
  }
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (hosted || window.parent === window || e.source !== window.parent || !e.ports || !e.ports[0] || !m || m.type !== 'inbox:hello'
      || typeof m.version !== 'string' || !Array.isArray(m.actions)) return;
    hosted = { reply: null };
    port = e.ports[0];
    port.onmessage = function (ev) { heard(ev.data); };
    document.querySelectorAll('.theme-toggle').forEach(function (button) { button.remove(); });
    look(m.theme);
    // Notes live with the inbox page: this frame has no storage of its own.
    store = { setItem: function (key, value) { post({ type: 'inbox:notes-set', key: key, value: value }); } };
    post({ type: 'inbox:notes-get', key: KEY });
    setLive('inbox'); offer(m); render();
  });
  // In a frame, a link opens its own tab: the frame never leaves this page.
  document.addEventListener('click', function (e) {
    const a = window.parent !== window && e.target.closest ? e.target.closest('a[href]') : null;
    if (a && a.getAttribute('href').charAt(0) !== '#') { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  }, true);
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
