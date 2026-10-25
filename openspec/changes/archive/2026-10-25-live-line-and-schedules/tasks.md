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
