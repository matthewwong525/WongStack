# Design

## Context

See [proposal.md](proposal.md) for why. The state this starts from:

- **The inbox** ([archived design](../archive/2026-10-22-inbox-mini-app/design.md)). `inbox_items.kind` is `CHECK (kind IN ('plan','approval','question'))`. `PUT item` upserts from the computer through [`lib/inbox.mjs`](../../../.agents/skills/hand-over/scripts/lib/inbox.mjs). `reply-link.mjs serve-inbox` checks in every 10 s while an item is open and closes items past `closes_at`. A test holds `hand-over.mjs` away from `lib/inbox.mjs`.
- **Private links.** [`hand-over.mjs`](../../../.agents/skills/hand-over/scripts/hand-over.mjs) `open` prints `HANDOVER_LINK=<origin>/#<fragment>`. [`linkFragment`](../../../.agents/skills/hand-over/scripts/hand-over.mjs) packs `key`, `site`, `user` and `emailFirst`. A background `watch` process serves the link until done, `close`, the deadline, or giving way, and records the end in `FILES.state`. Non-plan reply-link pages open through `reply-link.mjs`'s shared tunnel.
- **Decisions.** [`Decision.tsx`](../../../app/src/apps/inbox/Decision.tsx) renders choices as `Button role="radio"`, with *Your own answer* as a last choice for questions only, and a separate `Note` (500 characters) for both kinds. [`drafts.ts`](../../../app/src/apps/inbox/drafts.ts) keeps `{pick, own, note}` per item version. `textOf` joins the choice's text and the note. The Worker's `POST tap` already takes `send` with text on any item.
- **The daily watch.** [`daily.mjs`](../../../.agents/skills/daily/scripts/daily.mjs) `inboxAdd` stores only item ids in `<day>.inbox.json`. `watch` polls `paseo ls` and `permit ls` every 60 s, and `actions()` logs every `reply` and `answer` the chief sent.

## Goals / Non-Goals

**Goals:**

- One list shows everything waiting on the person, and nothing typed into a private page or form passes through the app.
- A listing never delays or blocks a link opening.
- Decisions send exactly what the person meant, and never go stale after a chat answer.

**Non-Goals:**

- Storing any secret or form content in the app; a vault.
- Changing what any private page asks for, how it saves, or how long it stays open.

## Decisions

### 1. A `link` item holds an address, nothing more

The migration rebuilds `inbox_items` in one transaction with kinds `plan|approval|question|link`: create the new table, copy, drop, rename. Its body is JSON `{what, url}`, where `what` is `key|login|card|form|view`. `PUT item` checks `url` is `https` on a `*.trycloudflare.com` host with no username or password part, at most 2 KB, and the title at most 200 characters. A `link` item has no actions, so `POST tap` answers 400 for it. *Alternative: reuse `question` with a URL.* Rejected: the list would render it as a decision, and tap rules would apply.

### 2. The computer lists each link without waiting on it

`lib/inbox.mjs` gains `listLink(client, {id, what, title, url, closesAt, workspace})` and reuses `closeItem`. Both race a 3 s timeout and swallow every failure. The address listed is built separately from the chat's:

- **Key, card, view:** `<origin>/#key=<key>`, the same as the chat's.
- **Login:** the key plus `site` and `emailFirst`, never `user`. The page already treats a missing username as empty.
- **Form (reply-link page):** its tunnel address and key, as `reply-link.mjs open` prints.

Titles come from what the opener already has, never a page's `note`, picture, or values. A key link's title is the guide's `title`, or the readable name `keys.mjs` makes. A login's is *Save your `<site>` login*, or *Save your logins*. A card form's is the form file's `title`. A live view's is *Help the browser past a check*. A form's is its `--header`, cut to 200 characters.

`hand-over.mjs open` lists the link after printing `HANDOVER_LINK`, in the background `watch` process so `open` returns at once. The same process closes the item on every end it already records: `send`, `close-command`, `cancel-route`, `deadline`, `gave-way`, `watch`, `error`, and a signal. A crash leaves `closes_at` to end it. `reply-link.mjs open` lists a non-plan page after its link answers, and `close` and the server's stop close it. The old boundary test becomes one that runs every `hand-over.mjs` mode against a fake client. It checks that exactly the six fields above leave the computer, and no value, username, note, or page content.

### 3. A link row, opened in a new tab

`List.tsx` puts `link` items in *Needs you* after questions, as a `LinkRow`. It shows the title, a word for `what` (*Key*, *Login*, *Card*, *Form*, *Live view*), and the closing time in the inbox's existing format. *Open* is an `<a href={url} target="_blank" rel="noopener noreferrer">` styled with `buttonVariants`, so the tunnel never learns the inbox's address. There is no detail view.

### 4. One own-answer box replaces the note

The draft becomes `{pick, own}`, and `note` drops out. Zod's `object` strips the old key, so saved drafts still read. Every question and approval shows its choices, then a `Textarea` with placeholder *Or type your own answer*, always visible. Typing sets `pick` to the own-answer slot, one past the choices. Picking a choice keeps the typed words but deselects them. `pickOf` returns `{label: own, action: 'send', text: own}` for that slot, and `textOf` returns the choice's text alone.

A question's detail may carry `multi: true`. `detailOf` in `daily.mjs` accepts it, and `chief.md` sets it when the agent's own question allows several answers. Its draft is `{ticks: number[], own}`: choices render as `checkbox` rows, typing changes no tick, and the answer is one `send` whose text is each ticked label on its own line, then the own words. It is answered once something is ticked or typed. *Alternative: treat the words as one more tick.* Same result, but a separate box reads more clearly on a phone. The `N` key focuses the box; `Z` still clears the draft. An approval's own words go as `send`, which the Worker already allows, and reach the chief as `Inbox answer for <title> (<agent>): <words>`. `chief.md` gains one rule: words on an approval are the person's answer, and only a plain yes is an approval; otherwise relay them as a question to the agent, or ask.

### 5. Links are parsed, never injected

`linkify(text)` in `app/src/apps/inbox/linkify.tsx` splits on `https?://[^\s<>"]+`, trims trailing `.,;:!?)`, and returns text and `<a target="_blank" rel="noopener noreferrer">` nodes. React escapes the rest, so no HTML is ever set. The question heading and each choice label use it. A choice can't hold an `<a>` inside a `<button>`, so a choice becomes a `div role="radio" tabIndex={0}` styled with `buttonVariants`, picking on click, Enter and Space. The link's `onClick` stops the event from reaching it. Keyboard and screen-reader behavior keep the radio group's roles.

### 6. The watch closes decisions answered in their own chat

`inboxAdd` stores `{id, agent, at, request}` per item, reading old plain ids as `{id}`. `request` is the permit id when the question came from an `asking` card. Each round, for every open item whose agent the chief has not sent a `reply` or `answer` to since `at`:

- **From a card:** the item closes once that request id is no longer pending.
- **From a stop:** the item closes once the agent's status is `running`.

The watch then calls `inboxClose`, prints `{event: 'answered-elsewhere', title, agent, item}`, and `chief.md` says to write *Answered in its chat: `<title>`*. A tap already waiting on a closed item expires through the existing rules, so it's never delivered. *Alternative: let the agent close its own item.* Rejected: agents don't know their question became an inbox item; the watch already sees both sides.

## Risks / Trade-offs

- **The app holds live addresses.** Someone who can read D1 could open a link while it's open. → They can't read a value. Key and password pages carry no values, the login listing drops the username, and a form shows only what the assistant filled in. The proposal says so, and rows are blanked on close by the existing rule.
- **A form's address shows its content to whoever holds it.** That's no wider than today's chat, and stored only for the link's day.
- **A listing failing silently.** → The chat still carries every link, so nothing depends on the listing.
- **The watch closing an item too early.** A stopped agent briefly marked `running` by the chief's own reply would close the item. → The *no chief reply or answer since `at`* rule, with a test.
- **Choice rows as `div`s.** → Tests cover click, Enter, Space, `aria-checked` and focus; the shared look stays `buttonVariants`.

## Migration Plan

The migration applies on deploy. An older computer lists nothing, and its links work as before. An older app answers `PUT item` for `link` with 400, which the computer ignores. Rollback: revert the Worker; `link` rows are hidden, and they close by time.

## UX

### Use-case brief

The person, often on a phone, opens the inbox to clear what waits on them. Now that includes a key to paste, a login to save, a card to pay with, or a form to fill. Done means the row is gone after they finish on the opened page. The common case is one or two links a day; edge cases are a link that closed while listed, and the computer offline (the link itself is down then). For decisions, the person picks, or types their own answer, and taps a link to check something first. Mirror the existing plan row in [`List.tsx`](../../../app/src/apps/inbox/List.tsx) for link rows, and the existing decision card for answers.

### Flow

- **Link:** inbox → *Open* → the private page in a new tab → finish there → the row leaves the list on the next refresh.
- **Decision:** read → tap a link to check (new tab) → pick, or type an answer → *Send*.

### Hierarchy

- **Link row:** *Open* is the one primary action; the kind and closing time are muted.
- **Decision:** choices first, then the own-answer box; *Send* stays the bar's one primary.

### Review

[review.html](review.html). *Every private link shows in your inbox* sketches the list with link rows; *Typing in a decision is your answer* sketches the card before and after; *Links in a decision are clickable* sketches a linked question.

### Components

`card`, `button` (`buttonVariants` for the *Open* link and choice rows), `badge`, `textarea` from `app/src/components/ui/`, plus `checkbox` added with `npx shadcn@latest add checkbox` for tick-several questions. Nothing is hand-styled.
