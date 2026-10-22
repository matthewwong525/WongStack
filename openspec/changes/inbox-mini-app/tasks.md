# Tasks

## 1. App: data and routes

- [x] 1.1 Add a timestamp-named migration under `schema/migrations/` creating `inbox_items`, `inbox_taps` and `inbox_seen`, keyed on `(installation_id, email)`, by design decision 1. It is additive only.
- [x] 1.2 Add `app/worker/apps/inbox/` with `api.ts` exporting `routes` and one handler file per route in design decision 2, each built with `defineAction`. Every query filters on `humanEmail(identity)`; a service or anonymous identity gets 403. Enforce the 512 KB body limit and the 20,000-character text limit. Apply the state rules: 409 on an old version, 410 on a closed item, `waiting` → `expired` once its item closes, `cancelled` only from `waiting`, and `computerOnline` from a check-in within 60 s.
- [x] 1.3 Write `app/worker/apps/inbox/api.test.ts` covering each route, beside the source. Cover: one person never reads or taps another's item; a service token is refused; a body or text over the limit is refused; an old version gives 409; a cancelled or expired tap never comes back from `checkin`; a re-upload replaces the body and bumps the version; online and offline status at 59 s and 61 s.

## 2. App: screens

- [x] 2.1 Add `app/src/apps/inbox/` (`app.json` with title *Inbox*, `App.tsx` and one file per view) using only `app/src/components/ui/` parts and Tailwind. Add `checkbox` through `npx shadcn@latest add` only if a view needs it. Build the list grouped *Needs you*, *Approvals*, *Plans to review*, refreshing every 15 s while visible; the empty state; the computer-status badge; approval cards with *Approve*, *Decline* and *Approve all* (confirmed by `alert-dialog`); question cards with options and a free-text answer; and tap states *Waiting*, *Waiting for your computer* with *Cancel*, *Sent*, *Didn't arrive* with the text to copy, and *This plan changed: reload*. Design it phone-first, by the design's UX section.
- [x] 2.2 Add the plan view: the item's HTML in `<iframe sandbox="allow-scripts" srcdoc>` with no `allow-same-origin`, plus a `message` handler that accepts only the frame's `contentWindow` and only `inbox:tap`, `inbox:notes-get` and `inbox:notes-set` with checked types and sizes (design decision 4). Notes go to the parent's `localStorage` under `wong-review3:<change>`.
- [x] 2.3 Write `App.test.tsx` and view tests beside the source, at 100% coverage. Cover each group and the empty state; each tap state; *Cancel*; *Approve all* sending one tap per approval after confirming; a message from another window, of an unknown type, or oversized being ignored; the iframe carrying `sandbox="allow-scripts"` without `allow-same-origin`.

## 3. Computer: delivery

- [x] 3.1 Add `.agents/skills/hand-over/scripts/lib/inbox.mjs`: probe, upload, close, check-in and result calls through `companyClient`, each taking the client as an injected dependency. Any 404, sign-in failure or network error returns `null`, so callers fall back.
- [x] 3.2 Extend `reply-link.mjs` by design decision 3. `open` tries the inbox first, prints the inbox address, and starts the server with no tunnel. The server loop re-uploads changed files, runs `checkin`, delivers waiting taps under `act`'s version and once-per-action rules through `wakeChat`, reports `sent`, `failed` or `changed`, and closes items whose chat is gone or whose time ran out. It stops when nothing is open. Add `item` support for file-less items (approval, question) with a target chat. The tunnel path is left unchanged.
- [x] 3.3 Extend the review kit (`.agents/skills/plan/references/review-kit.html`) with the hosted mode in design decision 4. `build-review.mjs` needs no change beyond printing whatever link `openReplyLink` returns; confirm it does.
- [x] 3.4 Write tests beside the source, with a fake client and a fake wake. Cover: inbox found → no tunnel starts and the address printed is the inbox; 404, a failed sign-in or a network error → tunnel as before; a rebuilt file re-uploads with a new version; a tap on an old version is reported `changed` and wakes nothing; a second tap of one action wakes once; a failed wake reports `failed`; a gone chat closes its items; the server stops when nothing is open; `hand-over.mjs` never imports `lib/inbox.mjs`. Add a kit test that hosted mode posts the three message types and never calls `fetch`.

## 4. Chief of staff

- [x] 4.1 Add `inbox add` and `inbox close` to `.agents/skills/daily/scripts/daily.mjs` by design decision 5. Items target the daily chat, the reply-link server is started if needed, and every open item closes on the watch's `end`. Extend `scripts/tests/daily.test.mjs` with fakes: add registers an item with the daily chat as its target; close closes it; `end` closes all; inbox unavailable → `add` reports `unavailable`.
- [x] 4.2 Update `.agents/skills/daily/references/chief.md`. With the inbox available, post approvals and *Needs you* questions with `D inbox add` and write one chat line with the link. Relay an inbox answer with `--bucket person`. Relay a typed chat answer, then `D inbox close`. With the inbox unavailable, ask in the chat as today. Point `SKILL.md` at it in at most one line, offset by a cut.

## 5. Longer links

- [x] 5.1 Set `reply-link.mjs` `HOURS` to 24 and update its usage text. In `hand-over.mjs`, default `--minutes` to 1440 for keys, passwords and forms and keep 480 for `--view`, updating the usage lines. Make `keys-page.mjs` and `form-page.mjs` add ` tomorrow` (or the weekday beyond that) when `closesAt` falls on another day on the person's clock. Inbox plan items take the link's 24 hours.
- [x] 5.2 Update the tests beside the source: the default deadlines in `hand-over.test.mjs` (keys, passwords and forms at 24 h, view at 8 h) and the reply-link tests at 24 h; `keys-page.test.mjs` and the form page tests for *Open until 5:30 AM tomorrow* and same-day *Open until 1:30 PM*.

## 6. Docs and release

- [x] 6.1 Update `wiki/development/reply-links.md` (inbox first, tunnel fallback, how a tap travels, 24 hours), `wiki/development/daily.md` (approvals in the inbox) and `wiki/stack/mini-apps.md` (the inbox ships with the app); change eight hours to 24 in `browsing.md`, `secrets.md`, `passwords.md` and `wiki/stack/api-keys.md`, leaving `live-view.md` at 8. Add `inbox` to `.agents/skills/memory/references/areas.json`, naming the spec, the app folders and the pages.
- [x] 6.2 Add a `## Next (minor) — One inbox for plans to review and decisions waiting on you` entry to `CHANGELOG.md`. Its **Updating.** note says the inbox arrives with the update and needs no step, that plans open there once the computer is signed in to the app, and that plan, key, password and form links now stay open 24 hours.

## 7. Verification

- [x] 7.1 Run `node .github/scripts/checks.mjs --worktree` and `cd app && npm test`; all pass, including `measure-context.mjs --check` after bringing `main` in.
- [ ] 7.2 After implementation, `/save`. On the preview, signed in as the person, confirm:
  - A throwaway plan opens in the inbox with no tunnel started. *Send notes* reaches its chat and shows *Sent*. A rebuild shows at the same address, and a tap from the old tab says the plan changed.
  - With the local server stopped, a tap shows *Waiting for your computer*, *Cancel* works, and nothing arrives after a restart.
  - A throwaway `D inbox add --kind approval` shows under *Approvals*, and *Approve* reaches the daily chat.
  - A second sign-in sees none of it.

  Close and archive the throwaway items and workspaces.
