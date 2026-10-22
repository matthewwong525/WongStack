# Every private link and form listed in your inbox, and decisions that read your own words

**Status:** in-progress
**Branch:** sulky-mule
**Open questions:** none

## Why

Plans and decisions sit in the inbox, but a key, password, card or form still arrives only as a link inside the chat that asked, so you hunt through chats to find what waits on you. You want them all on the inbox's one list. The value you type, and anything personal on a form, should still never pass through the app. Two small things also get in the way when answering decisions. A note you type is added to a choice instead of being your answer. And a link in a question can't be tapped. A card you already answered in the asking chat also stays in the inbox, out of date.

## What Changes

- **Every private link shows in your inbox, with *Open*.** When the assistant sends a key link, a password link, a card form or a live view, the inbox lists it too under *Needs you*: what it's for, when it closes, and an *Open* button. *Open* takes you to the same private link as today, so what you type goes only from your device to your computer, never through the app. The link leaves the list once it's done, closed or out of time. The chat still carries the link as before.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><h3>Inbox</h3><span class="grow"/><span class="tag-outline">Computer online</span></div>
    <div class="row gap"><b>Needs you</b><span class="tag">3</span></div>
    <div class="row gap"><div class="col grow"><span>Stripe key</span><span class="muted">Key · open until 5:30 PM</span></div><button class="btn-primary">Open</button></div>
    <div class="sep"></div>
    <div class="row gap"><div class="col grow"><span>Pay City of Markham</span><span class="muted">Card · open until 6:10 PM</span></div><button class="btn-primary">Open</button></div>
    <div class="sep"></div>
    <div class="row gap"><div class="col grow"><span>New client intake</span><span class="muted">Form · open until tomorrow</span></div><button class="btn-primary">Open</button></div>
  </div>
  ```
  ```mermaid
  flowchart TD
    app[inbox] -.->|lists it| you[your device]
    you -->|Open| link[private link]
    link --> computer[your computer]
  ```
- **Forms open the same way.** A form the assistant makes for you, such as an intake form, is listed in the inbox with *Open* and opens at its own link, as today. A form can hold personal details, so the app keeps none of what it shows or what you type. Plans still open right inside the inbox.
  ```mermaid
  flowchart LR
    page[a page for you] --> plan{a plan?}
    plan -->|yes| inside[opens inside the inbox]
    plan -->|no| listed[listed, opened by link]
  ```
- **Typing in a decision is your answer.** Each question and approval has one box under its choices, *Or type your own answer*. On a pick-one question, typing there replaces the choice you picked, and the assistant reads your words as the answer, as Claude's question box works. On a question where you can tick several, your words go with the boxes you ticked, never instead of them. The separate *+ Add a note* goes away.
  ```screen
  <div class="row gap">
    <div class="card col gap grow">
      <span class="muted">Before</span>
      <span>Which supplier first?</span>
      <button class="btn-primary">1 Acme</button>
      <button class="btn-ghost">2 Boxco</button>
      <button class="btn-ghost">3 Your own answer</button>
      <button class="btn-ghost">+ Add a note</button>
    </div>
    <div class="card col gap grow">
      <span class="muted">After</span>
      <span>Which supplier first?</span>
      <button class="btn-ghost">1 Acme</button>
      <button class="btn-ghost">2 Boxco</button>
      <input placeholder="Or type your own answer">
    </div>
  </div>
  ```
- **Links in a decision are clickable.** A web address in a question or a choice is a link. Tapping it opens the page in a new tab without picking that choice.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><span>Use this quote?</span><span class="tag-outline">acme.example/q/42 ↗</span></div>
    <button class="btn-ghost">1 Approve</button>
    <button class="btn-ghost">2 Don't approve</button>
    <input placeholder="Or type your own answer">
  </div>
  ```
- **A decision you answer in its own chat leaves the inbox.** If you answer the agent directly in the chat that asked, the daily watch sees it start working again or stop asking. It closes that card, so a later tap can't send an old answer. The daily chat says *Answered in its chat: …*. An answer typed in the daily chat closes the card as it does today.
  ```mermaid
  stateDiagram-v2
    [*] --> InInbox: agent asks
    InInbox --> Gone: answered in the inbox
    InInbox --> Gone: answered in the daily chat
    InInbox --> Gone: answered in its own chat
    Gone --> [*]
  ```
- **What the app keeps, said plainly.** For a listed link the app keeps its title, what kind it is, when it closes, and its address, until it closes. Someone who can read the app's data could open that address while it's open. On a key, password or card page they could type a value but never read one. On a form they could see what the assistant filled in. Nothing you type passes through the app.
  | Listed link | The app keeps | Never in the app |
  |-|-|-|
  | key, password, card | title, address, closing time | what you type |
  | form | title, address, closing time | the form and your answers |

Non-goals: no password vault; keys and passwords stay on your computer, as today. No change to what a private page asks for or how it saves. Plans keep opening inside the inbox. Without the inbox, every link works exactly as today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `inbox`: lists private links and forms under *Needs you* as items that hold only a title, a kind, a closing time and an address, each opened with *Open*. Decisions take a choice or the person's own words, with no separate note; a tick-several question sends its ticks and the words together. Web addresses in a decision are links. A decision answered in its agent's own chat closes.
- `reply-links`: a page other than a plan opens through the tunnel as before and is also listed in the inbox.
- `browser-logins`: every private link is also listed in the inbox while it's open; the inbox holds its address, never what's typed into it.
- `daily-routine`: the watch closes an inbox decision once its agent is answered in its own chat, and the chief reads typed words on an approval as the person's answer, not as approval.

## Impact

- `schema/migrations/`: one additive migration rebuilding `inbox_items` with `link` added to its kinds.
- `app/worker/apps/inbox/`: `PUT item` takes `link` items with a JSON body `{what, url}`, an `https` address on the tunnel's host; a `link` item takes no taps.
- `app/src/apps/inbox/`: a link row under *Needs you*; `Decision.tsx` and `drafts.ts` drop the note for one own-answer box; a small linkify helper for decisions.
- `.agents/skills/hand-over/scripts/`: `lib/inbox.mjs` gains `listLink`; `hand-over.mjs` lists each private link it opens and closes it when the link ends; `reply-link.mjs` lists non-plan pages. The test that kept `hand-over.mjs` from `lib/inbox.mjs` becomes one that checks only the listing's fields leave the computer.
- `.agents/skills/daily/scripts/daily.mjs`: the watch closes items whose agent moved on; `references/chief.md` gets one line.
- Wiki: `wiki/development/browsing.md` (private links listed), `reply-links.md` (forms listed; own answer; links), `daily.md` (answered in its own chat).
- `CHANGELOG.md` gets a minor entry, with no hand step to update.

## Decision log

- **2026-10-22** — Asked (settled before planning) where forms, keys and passwords go → chose the inbox at `/apps/inbox`, each person seeing only their own.
- **2026-10-22** — Asked (settled before planning) about card numbers → chose to keep them on the private link only, for good.
- **2026-10-22** — Asked how a password vault in the app would open, what the assistant could use, whether the owner could open a teammate's, and what it starts with → chose Face ID or PIN with a passphrase backup, only what the person marks, private to each, starting empty.
- **2026-10-22** — Asked on the review page to rethink the vault: *too risky, keep it local* → dropped the vault; keys and passwords stay on the computer, as today.
- **2026-10-22** — Asked how key and password requests show up without the vault → chose listed in the inbox and opened by their private link, so a value never passes through the app.
- **2026-10-22** — Asked how ordinary forms open → chose listed and opened by link too, because a form may hold personal details the person didn't notice.
- **2026-10-22** — Asked whether card forms and live views are listed too → chose yes, listed with *Open*; the card still goes only to the computer.
- **2026-10-22** — Asked on the review page that a typed note be the answer itself, as Claude's question box works → one *Or type your own answer* box replaces both the own-answer choice and *+ Add a note*, on questions and approvals.
- **2026-10-22** — Asked on the review page that, on a tick-several question, typed words add to the ticked boxes rather than cancel them → questions gain a tick-several form, set when the agent's own question allows several answers, sending the ticked choices and the words together.
- **2026-10-22** — Asked on the review page that links in decisions be clickable → web addresses in a question and its choices become links that open in a new tab without picking.
- **2026-10-22** — Asked whether the chief updates decisions answered in the chat → found the daily chat already closes them, but an answer in the agent's own chat did not; the watch now closes those.
- **2026-10-22** — Assumed: the chat still prints each link as today, and the inbox lists it besides, because the chat may be where the person is, and the fallback stays identical.
- **2026-10-22** — Assumed: a listed link shows its title and kind, never a page's note or picture, because a card form's note can hold a ticket number or amount.
- **2026-10-22** — Assumed: typed words on an approval go to the chief as the person's answer, and only a plain yes counts as approval, because a risky step must never go ahead on a guess.
- **2026-10-22** — Assumed: the listing is best-effort, so a link opens at once even when the app is slow or away, because the link is what the person needs.
- **2026-10-22** — Assumed: no inbox rows in the sample data, because items belong to one signed-in person, close within a day, and a seeded link would point at a dead address; the preview check makes its own throwaway items.
- **2026-10-22** — Built every task but the preview check. The second look found that a stalled app could hold up a link's end and the reply-link command; the inbox removal now runs beside the tunnel shutdown, and the command exits once it prints.
