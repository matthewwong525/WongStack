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
