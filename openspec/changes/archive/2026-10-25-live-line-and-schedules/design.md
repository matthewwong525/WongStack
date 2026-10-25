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
