<!-- openspec-archive v1 2026-10-22-inbox-mini-app -->
<!-- file proposal.md utf8 17025 -->
# One inbox for plans to review and decisions waiting on you

**Status:** ready-to-ship
**Branch:** central-reviews-dashboard
**Open questions:** none

## Why

Each plan arrives as its own link in its own chat, at a random address that changes every day, and nothing lists what is still waiting. The chief of staff's approvals and *needs you* questions live only inside the daily chat, so you have to find that chat to answer them. You want one place, at one address, where you see everything waiting on you and answer it, from your phone or your desk.

## What Changes

- **An inbox in your live app.** It sits at `/apps/inbox`, behind the same company sign-in as the rest of the app, and appears in the app list on the home page. It shows what is waiting on you, in three groups: questions that need you, approvals, and plans to review. It looks like the rest of the app.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><h3>Inbox</h3><span class="grow"/><span class="tag-outline">Computer online</span></div>
    <div class="sep"></div>
    <div class="row gap"><b>Needs you</b><span class="tag">1</span></div>
    <div class="col"><span>Which supplier should I email first?</span><span class="muted">research · 4 min ago</span></div>
    <div class="sep"></div>
    <div class="row gap"><b>Approvals</b><span class="tag">2</span></div>
    <div class="col"><span>Send the kit quote to Kim</span><span class="muted">email · 12 min ago</span></div>
    <div class="col"><span>Publish the packaging page</span><span class="muted">site · 1 h ago</span></div>
    <div class="sep"></div>
    <div class="row gap"><b>Plans to review</b><span class="tag">1</span></div>
    <div class="col"><span>One inbox for plans to review</span><span class="muted">lousy-dingo · today</span></div>
  </div>
  ```
- **A plan opens right in the inbox, with no tunnel.** When your computer can reach the live app, a new plan's link opens it in the inbox instead of at a new tunnel address. It is the same review page you know: notes, *Send notes*, *Build it* and *Build and publish*. The page is shown in a sealed frame, so it can't touch the rest of the app.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><button class="btn-ghost">Back</button><span class="grow"/><span class="muted">lousy-dingo</span></div>
    <h3>One inbox for plans to review</h3>
    <div class="bar"></div>
    <div class="bar"></div>
    <div class="skeleton"></div>
    <div class="sep"></div>
    <div class="row gap"><button class="btn-ghost">Send notes</button><span class="grow"/>
      <button class="btn-ghost">Build it</button><button class="btn-primary">Build and publish</button></div>
  </div>
  ```
- **Your tap reaches the chat that made the item, and says *Sent* only once that chat has it.** The app holds your tap until your computer picks it up. Your computer checks the app every few seconds while anything is open, wakes the right chat, and reports back. The inbox then marks the tap *Sent*.
  ```mermaid
  sequenceDiagram
    participant You
    participant Inbox
    participant Computer
    participant Chat
    You->>Inbox: tap Build it
    Inbox-->>You: Waiting
    Computer->>Inbox: anything new?
    Inbox-->>Computer: Build it
    Computer->>Chat: wake with message
    Chat-->>Computer: got it
    Computer->>Inbox: delivered
    Inbox-->>You: Sent
  ```
- **When your computer is away, your tap waits and you can take it back.** The inbox says your computer is offline. A tap shows *Waiting for your computer*, with *Cancel*, until the computer comes back. A tap that is still waiting when its item closes is never sent.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><h3>Inbox</h3><span class="grow"/><span class="tag-outline danger">Computer offline</span></div>
    <div class="col"><span>Send the kit quote to Kim</span><span class="muted">Approved · Waiting for your computer</span></div>
    <div class="row gap"><span class="grow"/><button class="btn-ghost">Cancel</button></div>
  </div>
  ```
- **The chief of staff sends approvals and questions to the inbox, with one line in the chat.** When the inbox is on, the daily chat no longer asks you a list in the chat. It says how many approvals are waiting and gives the inbox link. In the inbox, you approve or decline each step, or approve them all at once. You can still answer by typing in the daily chat.
  ```text
  Needs you: research — which supplier first? (inbox)
  2 approvals waiting: https://app…/apps/inbox/
  ```
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><b>Approvals</b><span class="grow"/><button class="btn-ghost">Approve all</button></div>
    <div class="col gap"><span>Send the kit quote to Kim</span><span class="muted">email · it wants to send one message</span>
      <div class="row gap"><span class="grow"/><button class="btn-ghost">Decline</button><button class="btn-primary">Approve</button></div></div>
    <div class="sep"></div>
    <div class="col gap"><span>Which supplier should I email first?</span>
      <div class="row gap"><button class="btn-ghost">Acme (Recommended)</button><button class="btn-ghost">Boxco</button></div>
      <input placeholder="Or type your own answer"></div>
  </div>
  ```
- **Each person sees only their own.** An item belongs to the person signed in on the computer that sent it. Teammates never see each other's plans, approvals or questions.
  | | You see | A teammate sees |
  |-|-|-|
  | Your plan | yes | no |
  | Your chief's approvals | yes | no |
- **Items leave on their own, and a plan now lasts a day.** A plan's link stays open for 24 hours, up from 8, in the inbox and at a tunnel link alike; building the plan again restarts the 24 hours. A plan leaves when its time runs out or its chat closes. An approval or question leaves once its answer reaches the chat, when its chat closes, or when the daily watch ends.
  ```mermaid
  stateDiagram-v2
    [*] --> Waiting
    Waiting --> Answered: answer reached chat
    Waiting --> Gone: chat closed
    Waiting --> Gone: time ran out
    Answered --> [*]
    Gone --> [*]
  ```
- **Today's link still works where the inbox can't.** If you aren't signed in on the computer, the app can't be reached, or your install doesn't have the inbox yet, the plan opens at a tunnel link as it does today, and the chief asks in the chat.
  ```mermaid
  flowchart LR
    plan --> reach{app reachable?}
    reach -->|yes| inbox[inbox link]
    reach -->|no| tunnel[tunnel link]
  ```
- **Never a password, key or card, and their pages now last a day too.** Key pages, password pages and private forms keep their own private links and never appear in the inbox: they exist so a secret never reaches a chat or a stored record. Each now stays open for 24 hours by default, up from 8, and shows *tomorrow* when it closes on the next day. The live view of a stuck login stays at 8 hours.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><span class="tag-outline">Private link</span><span class="grow"/><span class="muted">Open until 5:30 AM tomorrow</span></div>
    <span class="muted">What you enter here stays out of the chat.</span>
    <input placeholder="Paste your key">
    <div class="row gap"><span class="grow"/><button class="btn-ghost">Not now</button><button class="btn-primary">Save</button></div>
  </div>
  ```

Non-goals: other pages, such as intake forms or draft lists, come in a later change; notes stay on the device you typed them on, as today; no phone notifications from the inbox itself; no live push: the inbox refreshes itself every few seconds while it's open.

## Capabilities

### New Capabilities

- `inbox`: the `/apps/inbox` mini app. Per-person items (plan, approval, question) stored in D1 and keyed by the signed-in email. Plans render in a sandboxed frame that talks to the inbox only through a fixed message shape. The person's taps queue in the app, and the person's computer polls for them, delivers them and acknowledges them. *Sent* shows only on acknowledgement. A *Computer offline* state, cancelling a waiting tap, and expiry and closing rules. No secret-collecting page is ever listed.

### Modified Capabilities

- `reply-links`: a reply link opens in the person's inbox when their computer is signed in and the live app has the inbox, else through the tunnel as today. The local server polls the inbox for taps and delivers them with the same fixed-message, version and once-per-action rules.
- `secrets-convention`: a key link defaults to 24 hours instead of eight.
- `browser-logins`: password links, key links and private forms default to 24 hours, and their closing time names the day when it isn't today; the live view keeps eight hours.
- `daily-routine`: when the inbox is on, the chief posts approvals and *needs you* questions there and writes one line in the chat instead of asking a list. Taps relay with `--bucket person`.

## Impact

- New mini app: `app/src/apps/inbox/` (`App.tsx`, item views, tests, `app.json`) and `app/worker/apps/inbox/` (`api.ts`, one file per route, `api.test.ts`), held to the 100% coverage and the shadcn parts in `app/src/components/ui/`. Parts may be added with `npx shadcn@latest add` (checkbox).
- New D1 migration under `schema/migrations/` for `inbox_items` and `inbox_taps`.
- `.agents/skills/hand-over/scripts/reply-link.mjs` and a new `lib/inbox.mjs` handle upload, polling, delivery and acknowledgement, through `scripts/employee-bootstrap.mjs`'s `companyClient`. `wake.mjs` is reused unchanged.
- `.agents/skills/plan/references/review-kit.html` gains a hosted mode that uses `postMessage` instead of `fetch` and `localStorage`. `build-review.mjs` prints the inbox link.
- `.agents/skills/daily/scripts/daily.mjs` gains `inbox` commands; `references/chief.md` and `SKILL.md` get matching edits. Check the skills' context budget.
- `reply-link.mjs` `HOURS` 8 → 24; `hand-over.mjs` default `--minutes` 480 → 1440 except `--view`, which keeps 480; `keys-page.mjs` and `form-page.mjs` add *tomorrow* to the closing time on another day.
- Wiki: `wiki/development/reply-links.md`, `browsing.md`, `secrets.md`, `passwords.md`, `wiki/stack/api-keys.md` (eight hours → 24), `wiki/development/daily.md`, and a short inbox section in `wiki/stack/mini-apps.md`.
- `areas.json` gains `inbox`. `CHANGELOG.md` gets a minor entry whose **Updating.** note says the inbox arrives with the update and needs no step.

## Decision log

- **2026-10-22** — Asked where the inbox lives → chose a mini app at `/apps/inbox` in the live app, behind the company sign-in.
- **2026-10-22** — Asked who sees it → chose each person sees only their own.
- **2026-10-22** — Asked what goes on it first → chose plans waiting for review, chief of staff approvals, and *needs you* questions; other forms and pages are left out.
- **2026-10-22** — Asked whether forms and passwords belong in it → recommended keeping passwords, keys and cards out for good, and leaving other forms to a later change; the plan keeps the three chosen kinds.
- **2026-10-22** — Asked whether a new plan's link opens in the inbox when the app can be reached → chose the inbox only, with the tunnel as the fallback.
- **2026-10-22** — Asked how the chief shows approvals and questions when the inbox is on → chose the inbox, plus one line in the chat; typing an answer in the chat still works.
- **2026-10-22** — Assumed: the computer checks the app for taps, rather than the app reaching the computer, because the app has no path back to the computer and no queue, socket or timer today.
- **2026-10-22** — Assumed: the local reply-link server does the checking whenever any item is open, not the daily watch, so plans work in the inbox without `/daily` running.
- **2026-10-22** — Assumed: the computer signs in as the person, through the same helper company calls use, not with the setup's service token, because items must belong to an email and that token is kept for checks.
- **2026-10-22** — Assumed: a plan is shown in a sandboxed frame with scripts allowed but no same-origin access, because the page's scripts must run but must never reach the app's sign-in or data.
- **2026-10-22** — Assumed: notes stay in the browser on the device you typed them on, as today, because saving notes in the app adds a table and sync for a gain nobody asked for.
- **2026-10-22** — Assumed: the computer checks every 10 seconds and the open inbox refreshes every 15 seconds, because that feels immediate after a tap and stays far inside the Workers free request allowance for a small team.
- **2026-10-22** — Assumed: the inbox shows *Computer offline* when the computer hasn't checked in for 60 seconds, because six missed checks means it is gone, not slow.
- **2026-10-22** — Assumed: a tap waits until the computer returns and can be cancelled, and is never sent after its item closes, because a *Build and publish* that fires hours later is the risk to guard against.
- **2026-10-22** — Asked on the review page to make a plan last 24 hours → a plan's link and its inbox item now stay open 24 hours, in the inbox and at a tunnel link alike.
- **2026-10-22** — Asked on the review page that key, password and form pages last 24 hours as well → their default is now 24 hours.
- **2026-10-22** — Assumed: the live view keeps its 8 hours, because the note named key, password and form pages, and a live view holds a browser open the whole time.
- **2026-10-22** — Assumed: a private page's closing time adds *tomorrow* when it closes on another day, because *Open until 5:30 AM* reads as already closed once a link lasts a full day.
- **2026-10-22** — Assumed: only a plan's review page opens in the inbox, found by the review kit's first line, because another page sends through the tunnel's own addresses, which a sealed frame can't reach.
- **2026-10-22** — Assumed: the computer claims each tap it collects, and one whose result never comes is failed after 2 minutes rather than handed out again, because a tap that fires twice is worse than one the person copies into the chat.
- **2026-10-22** — Assumed: the plan's page talks to the inbox only on a channel handed to its first load, and its links open in a new tab, because a link that took the frame elsewhere would otherwise hand that page the plan's buttons.
- **2026-10-22** — Assumed: the inbox stays an app the owner gives in Access, because the app has no way to give one app to everyone signed in; the update note says so.
- **2026-10-22** — Assumed: built, second-looked (six findings fixed: navigated frame, double answer, cancel race, rate limit, check-in size, early exit) and locally checked; saved for the preview acceptance (task 7.2) before archive; the save reconciles the spec deltas, so the inbox spec exists and the memory areas name it.
- **2026-10-22** — Assumed: a rebuild clears an item's last answer in the list as well as on the plan's page, and an open plan reads the list's status every 15 seconds only while an answer waits, because the old answer belongs to the version it was made on and re-reading the plan would reload the page the person is reading.
- **2026-10-22** — Assumed: the preview walk (task 7.2) passed: a plan opened in the inbox with no tunnel and *Send notes* showed *Sent* once a throwaway chat had it; a rebuild kept the address and an old tab was told the plan changed; offline, a tap waited with *Cancel* and nothing arrived after a restart; a throwaway approval reached its chat. A second person without the inbox was refused; one with it was not set up, so per-email isolation rests on the route tests. Two display bugs it found (a stale online status in the plan view, an old version's *Sent* line) were fixed and rechecked on the preview.
- **2026-10-22** — Assumed: archived for publishing at the review page's *Build and publish*, numbered 44.4.0; the spec deltas were already reconciled at the earlier save, so the archive changed no main spec.
- **2026-10-22** — Asked (after the preview) to make questions and approvals look like the WongOS decisions page → each is now a card with a small *title · workspace* line (*Risky* on approvals), the question once, and large numbered choices one per line; approvals read *Approve* and *Don't approve*, still sending `approve` and `decline`. A pick sends nothing and folds the card to its answer with *Change*. *+ Add a note* goes with the answer, on approvals too, because a tap already carries text and the computer adds it under the action's line. One *Send* in a bar at the bottom sends every picked card, one tap each, and replaces *Approve all*. Picks and notes stay on the device per item version, and `J`/`K`, `1`–`6`, `N`, `Z` and `Ctrl/⌘ Enter` work on a computer. The cards keep the app's full frame width, not a narrow column, because the mini-app rule and its check forbid a page narrowing itself. Plans keep their card, and the plan view is unchanged.

<!-- end proposal.md -->
<!-- file design.md utf8 13414 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 7478 -->
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
- [x] 7.2 After implementation, `/save`. On the preview, signed in as the person, confirm:
  - A throwaway plan opens in the inbox with no tunnel started. *Send notes* reaches its chat and shows *Sent*. A rebuild shows at the same address, and a tap from the old tab says the plan changed.
  - With the local server stopped, a tap shows *Waiting for your computer*, *Cancel* works, and nothing arrives after a restart.
  - A throwaway `D inbox add --kind approval` shows under *Approvals*, and *Approve* reaches the daily chat.
  - A second sign-in sees none of it.

  Close and archive the throwaway items and workspaces.

<!-- end tasks.md -->
<!-- file specs/browser-logins/spec.md utf8 2132 -->
## MODIFIED Requirements

### Requirement: Every private link goes through Cloudflare and closes itself
A password link, a key link, and a private form SHALL each open at a new address through Cloudflare's tunnel, with a secret key only the link carries, including when the person is at the computer the agent runs on. The agent SHALL give the person a link only once it answers from outside that computer. Each link SHALL default to a 24-hour time limit from opening and SHALL honor an explicit time override. A link SHALL stop working on successful completion, on closure, or at its time limit, even if the agent's session has ended, and a closed link SHALL never work again.

#### Scenario: The person sits at the agent's computer

- **WHEN** the person asks to save a password while at the computer the agent runs on
- **THEN** the link is a Cloudflare address, the same kind a phone would get

#### Scenario: Nobody finishes

- **WHEN** 24 hours pass on a private form without a send or a close
- **THEN** the link stops working, and the agent tells the person it timed out and offers a new one

### Requirement: Every private input page starts calm

A key link, a password link, and a private form SHALL share one look. Each SHALL open with a label naming it a private link and, above its first field, one plain line saying that what the person enters stays out of the chat. Each SHALL offer *Not now*, which closes the link as closing it does today. A key link and a private form SHALL show when they close as a time of day on the person's clock, naming the day when it is not today, counted in minutes only in their last ten minutes. A key page with several keys SHALL say how many are saved, and once every key is saved SHALL show that all is set.

#### Scenario: A first-time key

- **WHEN** the person opens a 24-hour key link at 5:30 AM
- **THEN** the page shows a private-link label, the privacy line above the field, *Open until 5:30 AM tomorrow*, and *Not now*

#### Scenario: The last minutes

- **WHEN** a private form has nine minutes left
- **THEN** the page shows *Closes in 9 min*, timed on the watcher's clock

<!-- end specs/browser-logins/spec.md -->
<!-- file specs/daily-routine/spec.md utf8 1073 -->
## ADDED Requirements

### Requirement: The chief sends approvals and questions to the inbox when it is on

When the person's inbox is available, the chief SHALL put each approval and each *needs you* question in the inbox instead of asking them in the daily chat, and SHALL write one line in the chat saying what waits there, with the inbox link. An answer from the inbox SHALL be relayed as the person's own answer. An answer the person types in the daily chat SHALL still count, and SHALL close the matching inbox item. Where the inbox is unavailable, the chief SHALL ask in the chat as before.

#### Scenario: An approval while the inbox is on

- **WHEN** a watched agent asks to send a customer email and the inbox is available
- **THEN** the chat shows one line that an approval waits in the inbox, and the person's *Approve* there reaches the agent

#### Scenario: The person answers in the chat instead

- **WHEN** an approval waits in the inbox and the person types *approve it* in the daily chat
- **THEN** the chief relays the approval and the inbox item closes

<!-- end specs/daily-routine/spec.md -->
<!-- file specs/inbox/spec.md utf8 4446 -->
## ADDED Requirements

### Requirement: The inbox lists what waits on the signed-in person

The live app SHALL offer an inbox mini app, behind the company sign-in, that lists the signed-in person's open items in three groups: questions that need them, approvals, and plans to review. It SHALL list only items sent by a computer signed in as that same person, and SHALL never show one person's item to another. The inbox SHALL refresh itself while it is open.

#### Scenario: Two people on one team

- **WHEN** Sam's computer sends a plan and Jo opens the inbox
- **THEN** Jo does not see Sam's plan, and Sam sees it under *Plans to review*

#### Scenario: Nothing is waiting

- **WHEN** the person opens the inbox with no open items
- **THEN** it says nothing is waiting and how items arrive, not a blank page

### Requirement: A plan opens inside the inbox without reaching the app

A plan item SHALL show the same review page the plan's file holds, with its notes and its actions. The page SHALL run sealed from the app: it SHALL be unable to read the person's sign-in, call the app, or change anything but its own notes and the actions its item offers.

#### Scenario: The person reviews a plan

- **WHEN** the person opens a plan item and taps *Build it*
- **THEN** the build request is queued for that plan's chat, carrying the version of the page they saw

#### Scenario: The page tries to reach the app

- **WHEN** a script on a plan's page tries to call the app or read its cookies
- **THEN** the call fails and nothing in the app changes

#### Scenario: A link on the page

- **WHEN** the person taps a link in a plan's page
- **THEN** it opens in a new tab, and the frame keeps the plan; a page that later loads in the frame can't tap or read notes

### Requirement: A tap is sent only once its chat has it

A tap on an item SHALL wait in the app until the person's computer delivers it to the chat that made the item. The inbox SHALL show *Sent* only after the computer reports the chat received it, and SHALL say when delivery failed or the page changed since the person loaded it. Each action SHALL be delivered at most once per version of its item.

#### Scenario: Delivered

- **WHEN** the person taps *Approve* and the computer wakes the daily chat with it
- **THEN** the inbox marks the tap *Sent*

#### Scenario: The chat is gone

- **WHEN** the computer can't reach the chat that made the item
- **THEN** the inbox says the answer did not arrive, keeps the person's text to copy, and never shows *Sent*

### Requirement: A tap waits while the computer is away, and can be taken back

When the person's computer has not checked in recently, the inbox SHALL say it is offline. A tap made then SHALL show as waiting and SHALL offer *Cancel* until the computer takes it. A waiting tap SHALL never be delivered once its item has closed or the tap was cancelled. A taken tap SHALL be delivered at most once: one whose result doesn't come back in time SHALL show as not arrived and SHALL never be handed out again.

#### Scenario: Cancelled before the computer returns

- **WHEN** the computer is offline, the person taps *Build and publish*, then *Cancel*, and the computer comes back
- **THEN** nothing reaches the chat

#### Scenario: The computer took it and went quiet

- **WHEN** the computer takes a tap and its result never comes back
- **THEN** after 2 minutes the inbox says the answer did not arrive, and the tap is never delivered again

#### Scenario: The item closed while waiting

- **WHEN** a plan's 24 hours run out before the computer picks up a waiting tap
- **THEN** the tap is never delivered and the inbox says so

### Requirement: Items close on their own

A plan item SHALL close when its link's time runs out or its chat closes. An approval or question SHALL close once its answer reaches the chat, when its chat closes, or when the daily watch that sent it ends. A closed item SHALL leave the list.

#### Scenario: The answer arrived

- **WHEN** an approval's tap is delivered
- **THEN** the approval leaves the inbox

### Requirement: The inbox never holds a secret

No page that collects a password, key, card or other secret SHALL ever become an inbox item, and the inbox SHALL offer no way to enter one.

#### Scenario: A key is needed

- **WHEN** an agent needs an API key while the inbox is on
- **THEN** the key page opens at its own private link, as before, and nothing about it appears in the inbox

<!-- end specs/inbox/spec.md -->
<!-- file specs/reply-links/spec.md utf8 1947 -->
## MODIFIED Requirements

### Requirement: A reply link closes itself and holds a secret

A reply link SHALL open either in the person's inbox, reached only through their company sign-in, or at an address through Cloudflare's tunnel, and SHALL be given to the person only once it answers from outside the computer. Through the tunnel, sending SHALL need a secret that only the link carries and that is never sent as part of an address. A link SHALL stop accepting sends at its time limit or when closed, even if the assistant's session has ended, and a send SHALL be bounded in size and rate.

#### Scenario: The time limit passes

- **WHEN** a reply link's time limit has passed and the person taps send
- **THEN** nothing reaches the chat and the page is told the link has closed

#### Scenario: A send without the secret

- **WHEN** a request to send arrives through the tunnel without the link's secret
- **THEN** it is refused and nothing reaches the chat

## ADDED Requirements

### Requirement: A reply link opens in the inbox when it can

When the computer is signed in to the live app and the app has the inbox, opening a plan's reply link SHALL put the page in the person's inbox and give its inbox address, and SHALL start no tunnel for it. Otherwise, and for any other page, it SHALL open through the tunnel as before. While any inbox item is open, the computer SHALL collect the person's taps, deliver them under the same fixed-message, version and once-per-action rules, and report each result back. A rebuilt page SHALL replace its inbox copy at the same address.

#### Scenario: Signed in with the inbox

- **WHEN** a plan is made on a computer signed in to an app that has the inbox
- **THEN** the plan's link is its inbox address and no tunnel starts

#### Scenario: Not signed in

- **WHEN** a plan is made on a computer that is not signed in, or whose app has no inbox yet
- **THEN** the plan opens at a tunnel link, as before

<!-- end specs/reply-links/spec.md -->
<!-- file specs/secrets-convention/spec.md utf8 1920 -->
## MODIFIED Requirements

### Requirement: The key link waits for the person
A key link SHALL stay open for 24 hours by default from when it is opened, and its page SHALL show the time left. An explicit time override SHALL be honored. A key link nobody has opened SHALL close at once when another private link is opened on the same computer; the agent SHALL then say the link closed and offer a new one. An opened key link SHALL keep its place: a second link SHALL NOT open until it ends.

#### Scenario: A slow sign-in at the service

- **WHEN** the person opens a key link 5 minutes after it was sent, then takes 15 minutes to sign in at the service
- **THEN** the page is still open, and the pasted key is saved

#### Scenario: A link nobody opened

- **WHEN** a key link sits unopened and another chat on the same computer needs a password link
- **THEN** the key link closes, the password link opens, and the first chat says its link closed and offers a new one

### Requirement: An unsaved key link says what happened
When a key link ends with nothing saved, the agent SHALL learn whether the person ever opened it and, when it closed for another private link, which workspace opened that link. The agent SHALL say which happened before it offers a new link, and SHALL NOT send another link to a person who never opened the last one without asking whether it loaded. What the agent learns SHALL hold no key value, private address, or page content.

#### Scenario: A link that ran out unopened

- **WHEN** a key link reaches its default 24 hours and nobody opened it
- **THEN** the agent says nobody opened it and asks whether the link loaded, before any new link

#### Scenario: Another chat's link took its place

- **WHEN** an unopened key link closes because a chat in another workspace opened a private link
- **THEN** the first chat names that workspace, says its own link closed for it, and offers a new one

<!-- end specs/secrets-convention/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-22

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 93562 fence=~~~ -->
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
<title>Review · 2026-10-22-inbox-mini-app</title>
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
<body data-change="2026-10-22-inbox-mini-app">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-22-inbox-mini-app</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Each plan arrives as its own link in its own chat, at a random address that changes every day, and nothing lists what is still waiting. The chief of staff's approvals and <i>needs you</i> questions live only inside the daily chat, so you have to find that chat to answer them. You want one place, at one address, where you see everything waiting on you and answer it, from your phone or your desk.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>An inbox in your live app.</b> It sits at <code>/apps/inbox</code>, behind the same company sign-in as the rest of the app, and appears in the app list on the home page. It shows what is waiting on you, in three groups: questions that need you, approvals, and plans to review. It looks like the rest of the app.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic screen" data-note="item-1-picture-1" tabindex="0" style="width:27.692em"><div class="sk" inert><div class="card col gap phone">
  <div class="row gap"><h3>Inbox</h3><span class="grow"></span><span class="tag-outline">Computer online</span></div>
  <div class="sep"></div>
  <div class="row gap"><b>Needs you</b><span class="tag">1</span></div>
  <div class="col"><span>Which supplier should I email first?</span><span class="muted">research · 4 min ago</span></div>
  <div class="sep"></div>
  <div class="row gap"><b>Approvals</b><span class="tag">2</span></div>
  <div class="col"><span>Send the kit quote to Kim</span><span class="muted">email · 12 min ago</span></div>
  <div class="col"><span>Publish the packaging page</span><span class="muted">site · 1 h ago</span></div>
  <div class="sep"></div>
  <div class="row gap"><b>Plans to review</b><span class="tag">1</span></div>
  <div class="col"><span>One inbox for plans to review</span><span class="muted">lousy-dingo · today</span></div>
</div></div></div></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A plan opens right in the inbox, with no tunnel.</b> When your computer can reach the live app, a new plan's link opens it in the inbox instead of at a new tunnel address. It is the same review page you know: notes, <i>Send notes</i>, <i>Build it</i> and <i>Build and publish</i>. The page is shown in a sealed frame, so it can't touch the rest of the app.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic screen" data-note="item-2-picture-1" tabindex="0" style="width:27.692em"><div class="sk" inert><div class="card col gap phone">
  <div class="row gap"><button class="btn-ghost">Back</button><span class="grow"></span><span class="muted">lousy-dingo</span></div>
  <h3>One inbox for plans to review</h3>
  <div class="sk-bar"></div>
  <div class="sk-bar"></div>
  <div class="skeleton"></div>
  <div class="sep"></div>
  <div class="row gap"><button class="btn-ghost">Send notes</button><span class="grow"></span>
    <button class="btn-ghost">Build it</button><button class="btn-primary">Build and publish</button></div>
</div></div></div></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Your tap reaches the chat that made the item, and says <i>Sent</i> only once that chat has it.</b> The app holds your tap until your computer picks it up. Your computer checks the app every few seconds while anything is open, wakes the right chat, and reports back. The inbox then marks the tap <i>Sent</i>.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-3-picture-1" tabindex="0" style="width:36.308em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-sequence" viewBox="0 0 472 426" width="472" height="426" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="sequence"><g transform="translate(40,8)"><g class="pele-lifelines" fill="none" stroke="var(--_b)"><path class="pele-lifeline" data-id="You" d="M0,44V366"/><path class="pele-lifeline" data-id="Inbox" d="M107.57,44V366"/><path class="pele-lifeline" data-id="Computer" d="M234.26,44V366"/><path class="pele-lifeline" data-id="Chat" d="M390.41,44V366"/></g><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge pele-message" data-id="i0"><path d="M0,87H100.57"/><path class="pele-marker" d="M107.57,87L99.57,90.36L99.57,83.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i1"><path d="M107.57,124H7" stroke-dasharray="4 4"/><path class="pele-marker" d="M0,124L8,120.64L8,127.36Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i2"><path d="M234.26,161H114.57"/><path class="pele-marker" d="M107.57,161L115.57,157.64L115.57,164.36Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i3"><path d="M107.57,198H227.26" stroke-dasharray="4 4"/><path class="pele-marker" d="M234.26,198L226.26,201.36L226.26,194.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i4"><path d="M234.26,235H383.41"/><path class="pele-marker" d="M390.41,235L382.41,238.36L382.41,231.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i5"><path d="M390.41,272H241.26" stroke-dasharray="4 4"/><path class="pele-marker" d="M234.26,272L242.26,268.64L242.26,275.36Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i6"><path d="M234.26,309H114.57"/><path class="pele-marker" d="M107.57,309L115.57,305.64L115.57,312.36Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i7"><path d="M107.57,346H7" stroke-dasharray="4 4"/><path class="pele-marker" d="M0,346L8,342.64L8,349.36Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="i0"><text x="53.78" y="77.4" text-anchor="middle">tap Build it</text></g><g class="pele-edge-label" data-id="i1"><text x="53.78" y="114.4" text-anchor="middle">Waiting</text></g><g class="pele-edge-label" data-id="i2"><text x="170.91" y="151.4" text-anchor="middle">anything new?</text></g><g class="pele-edge-label" data-id="i3"><text x="170.91" y="188.4" text-anchor="middle">Build it</text></g><g class="pele-edge-label" data-id="i4"><text x="312.33" y="225.4" text-anchor="middle">wake with message</text></g><g class="pele-edge-label" data-id="i5"><text x="312.33" y="262.4" text-anchor="middle">got it</text></g><g class="pele-edge-label" data-id="i6"><text x="170.91" y="299.4" text-anchor="middle">delivered</text></g><g class="pele-edge-label" data-id="i7"><text x="53.78" y="336.4" text-anchor="middle">Sent</text></g></g><g class="pele-nodes"><g class="pele-node pele-actor pele-actor-participant pele-actor-footer" data-id="You"><rect x="-32" y="366" width="64" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="393.6" text-anchor="middle">You</text></g><g class="pele-node pele-actor pele-actor-participant pele-actor-footer" data-id="Inbox"><rect x="72" y="366" width="71.14" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="107.57" y="393.6" text-anchor="middle">Inbox</text></g><g class="pele-node pele-actor pele-actor-participant pele-actor-footer" data-id="Computer"><rect x="183.14" y="366" width="102.24" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="234.26" y="393.6" text-anchor="middle">Computer</text></g><g class="pele-node pele-actor pele-actor-participant pele-actor-footer" data-id="Chat"><rect x="357.51" y="366" width="65.79" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="390.41" y="393.6" text-anchor="middle">Chat</text></g><g class="pele-node pele-actor pele-actor-participant" data-id="You"><rect x="-32" y="0" width="64" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="27.6" text-anchor="middle">You</text></g><g class="pele-node pele-actor pele-actor-participant" data-id="Inbox"><rect x="72" y="0" width="71.14" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="107.57" y="27.6" text-anchor="middle">Inbox</text></g><g class="pele-node pele-actor pele-actor-participant" data-id="Computer"><rect x="183.14" y="0" width="102.24" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="234.26" y="27.6" text-anchor="middle">Computer</text></g><g class="pele-node pele-actor pele-actor-participant" data-id="Chat"><rect x="357.51" y="0" width="65.79" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="390.41" y="27.6" text-anchor="middle">Chat</text></g></g></g></svg></div></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>When your computer is away, your tap waits and you can take it back.</b> The inbox says your computer is offline. A tap shows <i>Waiting for your computer</i>, with <i>Cancel</i>, until the computer comes back. A tap that is still waiting when its item closes is never sent.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic screen" data-note="item-4-picture-1" tabindex="0" style="width:27.692em"><div class="sk" inert><div class="card col gap phone">
  <div class="row gap"><h3>Inbox</h3><span class="grow"></span><span class="tag-outline danger">Computer offline</span></div>
  <div class="col"><span>Send the kit quote to Kim</span><span class="muted">Approved · Waiting for your computer</span></div>
  <div class="row gap"><span class="grow"></span><button class="btn-ghost">Cancel</button></div>
</div></div></div></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The chief of staff sends approvals and questions to the inbox, with one line in the chat.</b> When the inbox is on, the daily chat no longer asks you a list in the chat. It says how many approvals are waiting and gives the inbox link. In the inbox, you approve or decline each step, or approve them all at once. You can still answer by typing in the daily chat.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">Needs you: research — which supplier first? (inbox)</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">2 approvals waiting: https://app…/apps/inbox/</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic screen" data-note="item-5-picture-1" tabindex="0" style="width:27.692em"><div class="sk" inert><div class="card col gap phone">
  <div class="row gap"><b>Approvals</b><span class="grow"></span><button class="btn-ghost">Approve all</button></div>
  <div class="col gap"><span>Send the kit quote to Kim</span><span class="muted">email · it wants to send one message</span>
    <div class="row gap"><span class="grow"></span><button class="btn-ghost">Decline</button><button class="btn-primary">Approve</button></div></div>
  <div class="sep"></div>
  <div class="col gap"><span>Which supplier should I email first?</span>
    <div class="row gap"><button class="btn-ghost">Acme (Recommended)</button><button class="btn-ghost">Boxco</button></div>
    <input placeholder="Or type your own answer"></div>
</div></div></div></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Each person sees only their own.</b> An item belongs to the person signed in on the computer that sent it. Teammates never see each other's plans, approvals or questions.</div></div><div class="table"><table class="tbl"><thead><tr><th></th><th>You see</th><th>A teammate sees</th></tr></thead><tbody><tr data-note="item-6-row-1" tabindex="0"><td>Your plan</td><td>yes</td><td>no</td></tr><tr data-note="item-6-row-2" tabindex="0"><td>Your chief's approvals</td><td>yes</td><td>no</td></tr></tbody></table></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>Items leave on their own, and a plan now lasts a day.</b> A plan's link stays open for 24 hours, up from 8, in the inbox and at a tunnel link alike; building the plan again restarts the 24 hours. A plan leaves when its time runs out or its chat closes. An approval or question leaves once its answer reaches the chat, when its chat closes, or when the daily watch ends.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-7-picture-1" tabindex="0" style="width:27.615em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-state" viewBox="0 0 359 293" width="359" height="293" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="state"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge pele-transition" data-id="edge0"><path d="M207.35,22L207.35,59"/><path class="pele-marker" d="M207.35,66L203.99,58L210.71,58Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-transition" data-id="edge1"><path d="M191.35,110C191.35,119.25 78.97,119.25 78.97,128.5L78.97,172"/><path class="pele-marker" d="M78.97,179L75.61,171L82.33,171Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-transition" data-id="edge2"><path d="M207.35,110L207.35,153.5C207.35,160.44 249.54,160.44 249.54,167.38L249.54,172"/><path class="pele-marker" d="M249.54,179L246.18,171L252.9,171Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-transition" data-id="edge3"><path d="M223.35,110C223.35,119.25 307.72,119.25 307.72,128.5L307.72,153.5C307.72,160.44 265.54,160.44 265.54,167.38L265.54,172"/><path class="pele-marker" d="M265.54,179L262.18,171L268.9,171Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-transition" data-id="edge4"><path d="M78.97,223C78.97,238.5 189.35,238.5 189.35,254L189.35,260"/><path class="pele-marker" d="M189.35,267L185.99,259L192.71,259Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-transition" data-id="edge5"><path d="M257.54,223C257.54,238.5 189.35,238.5 189.35,254L189.35,260"/><path class="pele-marker" d="M189.35,267L185.99,259L192.71,259Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="edge1"><rect x="10" y="130.5" width="137.95" height="21" rx="3" fill="var(--_bg)"/><text x="78.97" y="145.9" text-anchor="middle">answer reached chat</text></g><g class="pele-edge-label" data-id="edge2"><rect x="167.95" y="130.5" width="78.81" height="21" rx="3" fill="var(--_bg)"/><text x="207.35" y="145.9" text-anchor="middle">chat closed</text></g><g class="pele-edge-label" data-id="edge3"><rect x="266.76" y="130.5" width="81.92" height="21" rx="3" fill="var(--_bg)"/><text x="307.72" y="145.9" text-anchor="middle">time ran out</text></g></g><g class="pele-nodes"><g class="pele-node pele-state-start" data-id="root_start" transform="translate(207.35,15)"><circle r="7" fill="var(--_l)"/></g><g class="pele-node pele-state" data-id="Waiting" transform="translate(207.35,88)"><rect x="-42.67" y="-22" width="85.34" height="44" rx="10" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Waiting</text></g><g class="pele-node pele-state" data-id="Answered" transform="translate(78.97,201)"><rect x="-51.57" y="-22" width="103.14" height="44" rx="10" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Answered</text></g><g class="pele-node pele-state" data-id="Gone" transform="translate(257.54,201)"><rect x="-35.57" y="-22" width="71.14" height="44" rx="10" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Gone</text></g><g class="pele-node pele-state-end" data-id="root_end" transform="translate(189.35,276)"><circle r="8.5" fill="var(--_bg)" stroke="var(--_l)"/><circle r="5" fill="var(--_l)"/></g></g></svg></div></div></details></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Today's link still works where the inbox can't.</b> If you aren't signed in on the computer, the app can't be reached, or your install doesn't have the inbox yet, the plan opens at a tunnel link as it does today, and the chief asks in the chat.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-8-picture-1" tabindex="0" style="width:38.308em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 498 152" width="498" height="152" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_plan_reach_0"><path d="M74.24,76L115.24,76"/><path class="pele-marker" d="M122.24,76L114.24,79.36L114.24,72.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_reach_inbox_0"><path d="M286.93,68C303.58,68 303.58,32 320.23,32L374.51,32"/><path class="pele-marker" d="M381.51,32L373.51,35.36L373.51,28.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_reach_tunnel_0"><path d="M286.93,84C303.58,84 303.58,120 320.23,120L374.51,120"/><path class="pele-marker" d="M381.51,120L373.51,123.36L373.51,116.64Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_reach_inbox_0"><rect x="322.23" y="21.5" width="29.78" height="21" rx="3" fill="var(--_bg)"/><text x="337.12" y="36.9" text-anchor="middle">yes</text></g><g class="pele-edge-label" data-id="L_reach_tunnel_0"><rect x="325.34" y="109.5" width="23.57" height="21" rx="3" fill="var(--_bg)"/><text x="337.12" y="124.9" text-anchor="middle">no</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="plan" transform="translate(41.12,76)"><rect x="-33.12" y="-24" width="66.24" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">plan</text></g><g class="pele-node pele-shape-diam" data-id="reach" transform="translate(210.98,76)"><polygon points="0,-55.46 88.74,0 0,55.47 -88.74,0" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">app reachable?</text></g><g class="pele-node pele-shape-rect" data-id="inbox" transform="translate(432.86,32)"><rect x="-51.34" y="-24" width="102.69" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">inbox link</text></g><g class="pele-node pele-shape-rect" data-id="tunnel" transform="translate(435.53,120)"><rect x="-54.02" y="-24" width="108.03" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">tunnel link</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>Never a password, key or card, and their pages now last a day too.</b> Key pages, password pages and private forms keep their own private links and never appear in the inbox: they exist so a secret never reaches a chat or a stored record. Each now stays open for 24 hours by default, up from 8, and shows <i>tomorrow</i> when it closes on the next day. The live view of a stuck login stays at 8 hours.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic screen" data-note="item-9-picture-1" tabindex="0" style="width:27.692em"><div class="sk" inert><div class="card col gap phone">
  <div class="row gap"><span class="tag-outline">Private link</span><span class="grow"></span><span class="muted">Open until 5:30 AM tomorrow</span></div>
  <span class="muted">What you enter here stays out of the chat.</span>
  <input placeholder="Paste your key">
  <div class="row gap"><span class="grow"></span><button class="btn-ghost">Not now</button><button class="btn-primary">Save</button></div>
</div></div></div></div></details></li>
</ol>
<p class="aside">Non-goals: other pages, such as intake forms or draft lists, come in a later change; notes stay on the device you typed them on, as today; no phone notifications from the inbox itself; no live push: the inbox refreshes itself every few seconds while it's open.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-22</p>Asked where the inbox lives → chose a mini app at <code>/apps/inbox</code> in the live app, behind the company sign-in.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-22</p>Asked who sees it → chose each person sees only their own.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-22</p>Asked what goes on it first → chose plans waiting for review, chief of staff approvals, and <i>needs you</i> questions; other forms and pages are left out.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-22</p>Asked whether forms and passwords belong in it → recommended keeping passwords, keys and cards out for good, and leaving other forms to a later change; the plan keeps the three chosen kinds.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-22</p>Asked whether a new plan's link opens in the inbox when the app can be reached → chose the inbox only, with the tunnel as the fallback.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-22</p>Asked how the chief shows approvals and questions when the inbox is on → chose the inbox, plus one line in the chat; typing an answer in the chat still works.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: the computer checks the app for taps, rather than the app reaching the computer, because the app has no path back to the computer and no queue, socket or timer today.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: the local reply-link server does the checking whenever any item is open, not the daily watch, so plans work in the inbox without <code>/daily</code> running.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: the computer signs in as the person, through the same helper company calls use, not with the setup's service token, because items must belong to an email and that token is kept for checks.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: a plan is shown in a sandboxed frame with scripts allowed but no same-origin access, because the page's scripts must run but must never reach the app's sign-in or data.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: notes stay in the browser on the device you typed them on, as today, because saving notes in the app adds a table and sync for a gain nobody asked for.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: the computer checks every 10 seconds and the open inbox refreshes every 15 seconds, because that feels immediate after a tap and stays far inside the Workers free request allowance for a small team.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: the inbox shows <i>Computer offline</i> when the computer hasn't checked in for 60 seconds, because six missed checks means it is gone, not slow.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: a tap waits until the computer returns and can be cancelled, and is never sent after its item closes, because a <i>Build and publish</i> that fires hours later is the risk to guard against.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-22</p>Asked on the review page to make a plan last 24 hours → a plan's link and its inbox item now stay open 24 hours, in the inbox and at a tunnel link alike.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-22</p>Asked on the review page that key, password and form pages last 24 hours as well → their default is now 24 hours.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: the live view keeps its 8 hours, because the note named key, password and form pages, and a live view holds a browser open the whole time.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: a private page's closing time adds <i>tomorrow</i> when it closes on another day, because <i>Open until 5:30 AM</i> reads as already closed once a link lasts a full day.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: only a plan's review page opens in the inbox, found by the review kit's first line, because another page sends through the tunnel's own addresses, which a sealed frame can't reach.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: the computer claims each tap it collects, and one whose result never comes is failed after 2 minutes rather than handed out again, because a tap that fires twice is worse than one the person copies into the chat.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: the plan's page talks to the inbox only on a channel handed to its first load, and its links open in a new tab, because a link that took the frame elsewhere would otherwise hand that page the plan's buttons.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: the inbox stays an app the owner gives in Access, because the app has no way to give one app to everyone signed in; the update note says so.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: built, second-looked (six findings fixed: navigated frame, double answer, cancel race, rate limit, check-in size, early exit) and locally checked; saved for the preview acceptance (task 7.2) before archive; the save reconciles the spec deltas, so the inbox spec exists and the memory areas name it.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: a rebuild clears an item's last answer in the list as well as on the plan's page, and an open plan reads the list's status every 15 seconds only while an answer waits, because the old answer belongs to the version it was made on and re-reading the plan would reload the page the person is reading.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: the preview walk (task 7.2) passed: a plan opened in the inbox with no tunnel and <i>Send notes</i> showed <i>Sent</i> once a throwaway chat had it; a rebuild kept the address and an old tab was told the plan changed; offline, a tap waited with <i>Cancel</i> and nothing arrived after a restart; a throwaway approval reached its chat. A second person without the inbox was refused; one with it was not set up, so per-email isolation rests on the route tests. Two display bugs it found (a stale online status in the plan view, an old version's <i>Sent</i> line) were fixed and rechecked on the preview.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-22</p>Assumed: archived for publishing at the review page's <i>Build and publish</i>, numbered 44.4.0; the spec deltas were already reconciled at the earlier save, so the archive changed no main spec.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-22</p>Asked (after the preview) to make questions and approvals look like the WongOS decisions page → each is now a card with a small <i>title · workspace</i> line (<i>Risky</i> on approvals), the question once, and large numbered choices one per line; approvals read <i>Approve</i> and <i>Don't approve</i>, still sending <code>approve</code> and <code>decline</code>. A pick sends nothing and folds the card to its answer with <i>Change</i>. <i>+ Add a note</i> goes with the answer, on approvals too, because a tap already carries text and the computer adds it under the action's line. One <i>Send</i> in a bar at the bottom sends every picked card, one tap each, and replaces <i>Approve all</i>. Picks and notes stay on the device per item version, and <code>J</code>/<code>K</code>, <code>1</code>–<code>6</code>, <code>N</code>, <code>Z</code> and <code>Ctrl/⌘ Enter</code> work on a computer. The cards keep the app's full frame width, not a narrow column, because the mini-app rule and its check forbid a page narrowing itself. Plans keep their card, and the plan view is unchanged.</li>
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
  function heard(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'inbox:notes' && (typeof m.value === 'string' || m.value === null)) { load(m.value); render(); }
    else if (hosted.reply && m.type === 'inbox:result') { const reply = hosted.reply; hosted.reply = null; reply(m.state); }
  }
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (hosted || window.parent === window || e.source !== window.parent || !e.ports || !e.ports[0] || !m || m.type !== 'inbox:hello'
      || typeof m.version !== 'string' || !Array.isArray(m.actions)) return;
    hosted = { reply: null };
    port = e.ports[0];
    port.onmessage = function (ev) { heard(ev.data); };
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
