# A live line from your computer to the app, and schedules in your inbox

**Status:** in-progress
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
