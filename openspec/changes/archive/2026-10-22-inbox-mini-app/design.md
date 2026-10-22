# Design

## Context

See [proposal.md](proposal.md) for why. The state this starts from:

- **Reply links.** [`reply-link.mjs`](../../../.agents/skills/hand-over/scripts/reply-link.mjs) runs one local server on `127.0.0.1` plus one Cloudflare quick tunnel (`*.trycloudflare.com`, [`lib/tunnel.mjs`](../../../.agents/skills/hand-over/scripts/lib/tunnel.mjs)) for every open page. Both stop once no page is open, so the address changes. Page records sit in `~/…/pages/<id>.json`. `send` and `act` wake the opener chat through [`lib/wake.mjs`](../../../.agents/skills/hand-over/scripts/lib/wake.mjs) (`paseo send <agentId> … --json`). They return `sent: true` only on `status: 'sent'` for the same agent. `act` checks the file's version (409), allows each action once per version, and is limited to one send per 5 s per page.
- **The review page.** [`build-review.mjs`](../../../.agents/skills/plan/scripts/build-review.mjs) builds one self-contained HTML file from the proposal, about 75 KB. [`review-kit.html`](../../../.agents/skills/plan/references/review-kit.html) keeps notes in `localStorage` under `wong-review3:<change>`, reads the key from `location.hash`, and calls relative `alive`, `send` and `act`.
- **The app.** The Worker sends `/apps/<name>/api/<route>` to the app's `routes` map (`"METHOD route"`, [`apps/index.ts`](../../../app/worker/apps/index.ts)) with the Access identity. One D1 `DB`; migrations in `schema/migrations/` are additive and apply on deploy. Per-user tables key on `(installation_id, email)`. No Durable Objects, sockets, crons or queues. Shared parts: alert, alert-dialog, badge, button, card, dialog, dropdown-menu, input, label, native-select, sheet, skeleton, table, textarea.
- **Signing in from the computer.** `companyClient` ([`employee-bootstrap.mjs`](../../../scripts/employee-bootstrap.mjs)) runs `cloudflared access token -app=<origin>`. It sends the token as `cf-access-token` to `/api/` or `/apps/` paths, and refuses if the signed-in email changed. The app sees the person's email. The setup's service token reaches the app as a Client ID with no person ([`policy.ts`](../../../app/worker/employee-access/policy.ts) `humanEmail`), and is kept for checks.
- **The daily watch.** `D watch` ([`daily.mjs`](../../../.agents/skills/daily/scripts/daily.mjs)) prints events every 60 s for 10 h and never acts. The chief's model writes the approval list and *Needs you* lines by [`chief.md`](../../../.agents/skills/daily/references/chief.md), and relays answers with `D reply` and `D answer --bucket person`.

## Goals / Non-Goals

**Goals:**

- One address per install for everything waiting on a person, with plans needing no tunnel when the app is reachable.
- Taps keep the reply-link promises: fixed messages, version check, once per action, *Sent* only on acknowledgement.
- Nothing a plan page runs can reach the app, and no secret ever enters an item.
- Every existing fallback still works unchanged.

**Non-Goals:**

- Other reply-link pages (forms, draft lists); notes synced across devices; push to the browser; phone notifications from the app.
- Changing the chief's buckets or what counts as risky.
- Rendering the proposal natively in React; the review page stays the one renderer.

## Decisions

### 1. The computer polls; the app is a mailbox

The app cannot reach the computer, so the computer asks. *Alternative: keep the tunnel for taps and use the app only as a list.* Rejected: the tunnel's address and start-up cost are what the person wants gone. *Alternative: a Durable Object socket.* Rejected for now: it adds the app's first DO binding to every install for a gain of a few seconds.

Two tables in one migration, both keyed on `(installation_id, email)`:

```text
inbox_items  id, email, kind(plan|approval|question), title, workspace,
             body (plan HTML | question JSON), actions JSON, version,
             created_at, closes_at, closed_at
inbox_taps   id, item_id, email, action, text, version,
             created_at, state(waiting|delivering|sent|failed|changed|cancelled|expired),
             claimed_at,
             answered_at
inbox_seen   email, last_checkin_at
```

### 2. Routes, all under the person's own sign-in

The handlers live in `app/worker/apps/inbox/`, one file per route, and every query filters on `humanEmail(identity)`. A service-token or anonymous identity gets 403.

| Route | Caller | Does |
|-|-|-|
| `GET items` | browser | open items, newest first, plus `computerOnline` (last check-in < 60 s) |
| `GET item?id=` | browser | one item with its body |
| `POST tap` | browser | queue `{item, action, version, text}`; 409 if the version is old, 410 if closed, 429 within 5 s of the item's last tap |
| `GET tap?id=` | browser | the tap's state |
| `POST tap-cancel` | browser | `waiting` → `cancelled` |
| `PUT item` | computer | upsert by id; a new version replaces the body |
| `POST item-close` | computer | close an item |
| `POST checkin` | computer | `{items}`: records the check-in time, expires taps on closed items, and claims the `waiting` taps on those items as `delivering`, as many as fit in 512 KB |
| `POST tap-result` | computer | `{id, state: sent|failed|changed|expired}`, taken only from `delivering` |

The body limit is 512 KB; text follows the reply-link limit of 20,000 characters. The list carries 200 characters of each newest tap's text; `GET tap` has all of it. A `delivering` tap can't be cancelled, and one with no result 2 minutes after it was claimed becomes `failed`, never `waiting` again: a lost report shows *Didn't arrive*, but nothing fires twice. A tap still `waiting` when its item closes becomes `expired` at the next check-in or read, so it is never delivered.

### 3. The local server stays the one deliverer

`reply-link.mjs open` asks `lib/inbox.mjs` first. It reads the app origin from the same place `companyClient` does, probes `GET /apps/inbox/api/items`, and on 200 uploads the page with `PUT item`. It then prints `REPLY_LINK=<origin>/apps/inbox/?item=<id>` and starts the server with no tunnel. A 404, an auth failure or a network error falls through to today's tunnel path unchanged. Every 10 s the server:

1. re-uploads any open page whose file hash changed (a new `version`), so a rebuilt plan shows at the same address;
2. calls `checkin` with its own items and, for each tap it claims, applies the same checks `act` does: a changed version is reported as `changed`, a done action as `sent` with no second wake. It wakes each item's chat at most once per 5 s, waiting out the gap, and reports `sent` or `failed`; a tap held past 90 s is `failed` unwoken, inside the app's 2 minutes. An answered approval or question closes at once, so a second tap on it is reported `expired`. A report the app didn't take is sent again next round;
3. closes items whose chat `paseo ls` no longer lists, and items past `closes_at`.

The server's lifetime rule stays the same: it stops once no page or item is open. *Alternative: put the polling in `D watch`.* Rejected: plans must work without `/daily`, and one deliverer keeps the once-per-action state in one place.

### 4. The review page runs sealed, talking by `postMessage`

The inbox puts the plan HTML in `<iframe sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" srcdoc=…>`. With no `allow-same-origin`, the frame has an opaque origin: it can't read the app's cookies or `localStorage`, or call `/apps/` routes with credentials. The kit gains a hosted mode, on when `window.parent !== window` and the first message is `{type: 'inbox:hello', item, version, actions}` carrying a `MessageChannel` port. Only the frame's first load of a version gets a port; a later load means the frame went elsewhere, so the port closes and nothing replaces it. Framed, the kit opens every non-anchor link in a new tab (`target=_blank rel=noopener`), which is why popups are allowed, so the frame never navigates. In that mode:

- `send` and `act` become `postMessage({type: 'inbox:tap', action, text})`. The parent answers `{type: 'inbox:result', state}` and the kit shows its existing states.
- Notes go through `inbox:notes-get` and `inbox:notes-set`, and the parent keeps them in its own `localStorage` under the same `wong-review3:<change>` key.

The parent listens only on that port, never on `window`, accepts only these three types, and checks each field's type and size. Notes go only under the key the plan's own `<body data-change>` names. *Alternative: sanitize the HTML and render it in React.* Rejected: it loses the kit's notes, spots and actions, and builds a second renderer of the proposal.

### 5. The chief writes items; the server delivers them

`daily.mjs` gains `D inbox add --kind approval|question --agent <a> --title … --file <question.json>` and `D inbox close --id`. They register an item through `lib/inbox.mjs` with the daily chat as its target, and make sure the reply-link server is running. A tap wakes the daily chat with a fixed line, such as `Inbox answer for <title> (<agent>): Approve` or `…: <option or typed text>`. The chief relays it with `--bucket person`, as it relays a chat answer. *Approve all* sends one tap per approval. `chief.md` says: inbox available → post items and write one line; a chat answer → relay it and `D inbox close`. Items close when the watch's `end` line prints.

### 6. Plans and private pages last a day

The review notes asked for 24 hours. `reply-link.mjs` `HOURS` becomes 24, so a plan's inbox item and its tunnel fallback share one limit. `hand-over.mjs` defaults to 1440 minutes for keys, passwords and forms. `--view` keeps 480, because a live view holds a browser open while it waits. A private page's closing line names the day when `closesAt` is not today on the person's clock (*Open until 5:30 AM tomorrow*). *Alternative: leave the time of day alone.* Rejected: at 24 hours, the closing time matches the opening time and reads as already closed. A longer private link stays open for more of the day it is in the chat; the link is single-use, keyed, and closed when another private link opens unopened, as before.

### 7. Secrets stay out by construction

Only `build-review.mjs` and `daily.mjs` create items, and only of the three kinds. `hand-over.mjs` (keys, passwords, private forms) never imports `lib/inbox.mjs`. A test asserts that boundary.

## Risks / Trade-offs

- **A stale *Build and publish*.** A tap can wait hours while the computer is off. Mitigation: `expired` on close, *Cancel* while waiting, and the version check.
- **Plan HTML stored in the app.** Plan text lands in D1, readable by the person and by whoever holds the database. It already reaches GitHub in the pull request. No secrets go in ([decision 7](#7-secrets-stay-out-by-construction)).
- **Request volume.** One check-in every 10 s while anything is open is up to 8,640 requests per person per day, plus the open tab's 15 s refresh. That is well inside the free plan for a small team; a 20-person team should move to a socket later.
- **The skills' context budget.** The daily skill's text has very little headroom, and the open `callable-daily` plan (PR #429) edits the same `SKILL.md`. Keep the `SKILL.md` change to one line pointing at `chief.md`, offset it with a cut, and rerun `measure-context.mjs --check` after bringing `main` in.
- **Installs without the inbox yet.** The probe's 404 falls back to the tunnel, so an older app keeps working.

## UX

### Use-case brief

The owner or a teammate, often on a phone between other work, opens one bookmark to clear what waits on them: answer a question, approve or decline a risky step, review a plan and send notes or build it. Done means the list is empty and each answer shows *Sent*. The common case is 1 to 5 items a few times a day. The edge cases are the computer offline, a plan rebuilt since it was opened, and a chat that closed. Dense rows suit the list; the plan view gets the whole screen. Mirror the Access app's list and detail pattern ([`app/src/apps/access/`](../../../app/src/apps/access/)).

### Flow

Open the inbox → tap an item → answer (one tap for an approval, a choice or typed text for a question, notes then a button for a plan) → *Waiting* → *Sent* → back to a shorter list. Offline: the answer shows *Waiting for your computer* with *Cancel*. Changed: *This plan changed: reload*. Failed: *Didn't arrive*, with the text to copy.

### Hierarchy

- **List:** the item rows are the content; *Needs you* comes first. The computer status is a quiet badge, red only when offline (badge plus word, never color alone).
- **Approval:** *Approve* is primary, *Decline* ghost; *Approve all* is ghost in the group header.
- **Question:** the recommended option comes first, then a free-text field with *Send*.
- **Plan:** the kit's own bar (*Build and publish* primary); the inbox adds only *Back*.

### Review

[review.html](review.html). The What Changes items *An inbox in your live app* (list), *A plan opens right in the inbox* (plan view), *When your computer is away* (offline state) and *The chief of staff sends approvals and questions* (approval and question cards) sketch each screen.

### Components

`card`, `badge`, `button`, `input`, `textarea`, `alert`, `skeleton`, and `alert-dialog` to confirm *Approve all*, all from `app/src/components/ui/`. The plan frame is a plain `<iframe>` styled with Tailwind. Nothing new is hand-styled.
