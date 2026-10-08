# Send plan notes straight to the chat

**Status:** ready-to-ship

**Branch:** beefy-moth

**Open questions:** none

## Why

When you review a plan, your notes take three steps to reach the chat: tap *Copy notes*, switch to the chat, paste. On a phone that is the slowest part of a review, and a copy that fails loses the trip. The plan page is a file on the computer the chat runs on, so it has no way to talk back.

The pieces for a way back already exist. The private links for keys and passwords open a web address that closes itself and wake the chat when you finish. A plan can open the same way.

## What Changes

- **A plan opens as a live link, and its button sends your notes to the chat.** The chat prints a web address instead of a file. *Send notes* puts your saved notes into the chat that made the plan, as if you had pasted them: the chat updates the plan and builds nothing.
  ```text
    BEFORE                 AFTER
  plan page (a file)     plan page (live link)
       │                      │
   Copy notes             Send notes
       │                      │
   switch to chat             │
       │                      │
     paste                    │
       ▼                      ▼
     chat                   chat
  ```
- **The button on the page changes with the link.** On an open live link it reads *Send notes*. Saving a note no longer copies anything there; one tap sends every note not yet sent, and each sent note is marked *Sent*. Opened as a file, the page works as it does today.
  ```text
    BEFORE                   AFTER
  ┌──────────────────────┐ ┌──────────────────────┐
  │ 2 notes [Copy notes] │ │ 2 notes [Send notes] │
  └──────────────────────┘ └──────────────────────┘
   toast after the tap:     toast after the tap:
   Copied 2 notes. Paste    Sent 2 notes to the
   them into chat.          chat.
  ```
- **A link stays open for 8 hours, and a closed one costs you nothing.** When the link has closed, or the chat can't be reached, the same tap copies your notes instead and says so, and you paste them as today. Say *new link* and the chat prints a fresh one.
  ```text
  ┌──────────────────────────────┐
  │ 2 notes         [Send notes] │
  └──────────────────────────────┘
   toast when the link has closed:
   This link has closed. Copied
   2 notes: paste them into chat.
  ```
- **Every plan gets one, at no cost after the first.** The first plan of the day takes 5 to 10 seconds longer to print its link. Later plans, from any chat on the same computer, share that one connection and print at once.
- **Where a chat can't be woken, nothing changes.** A host with no way to wake a chat, or a computer without Cloudflare's tunnel tool, still gets the file and *Copy notes*.
- **Key, password, and card links are untouched.** A plan link has its own place, so it never blocks one of those, and their rule stays: nothing typed into them reaches the chat.
- **Other pages can use the same part.** Any single page with a *Submit* button can open the same way and send its answers to the chat that made it. The mail review page in WongOS is the first that will; that page itself is built there, not here.

Non-goals: no hosting in your Cloudflare account, no link that lasts for days, and no change to what pasted notes do.

## Capabilities

### New Capabilities

- `reply-links`: a page opened through a live link can send its answers to the chat that made it; the link closes itself, has its own place beside private links, and is not opened where no chat can be woken.

### Modified Capabilities

- `ux-wireframes`: the review page may send notes when opened through a live link and still fetches nothing and works from disk; saving copies notes only when the page is not on an open live link; sent notes go to the chat that made the plan, once each.
- `asking-the-user`: the plan's link line carries the live link when one is open, else the file.

## Impact

- New script `.agents/skills/hand-over/scripts/reply-link.mjs` and its page-side contract; tunnel and wake-the-chat helpers move out of `hand-over.mjs` into `.agents/skills/hand-over/scripts/lib/` unchanged in behavior.
- `.agents/skills/plan/references/review-kit.html` (the send path, the *Sent* mark, the fallback) and `.agents/skills/plan/scripts/build-review.mjs` (a `--link` flag; prints the live link).
- Skill text: `plan/SKILL.md`, `hand-over/SKILL.md`, `explore/references/asking-the-user.md`, kept inside the context budget.
- Tests: `scripts/tests/reply-link.test.mjs` (new), `review.test.mjs`, `review-browser.test.mjs`, `hand-over.test.mjs`.
- Docs: a new `wiki/development/reply-links.md`, linked from the development hub and from browsing's private-link section; `.agents/skills/memory/references/areas.json` names the new spec.
- Payload release: `CHANGELOG.md` entry, **minor**: every install keeps the file and *Copy notes* where a live link can't open.

## Decision log

- **2026-10-07** — Asked when a plan should get a live link → chose every plan, over only on *Review the plan* and only when asked.
- **2026-10-07** — Asked how long a plan's live link stays open → chose 8 hours; after that the button copies and a new link is made on request.
- **2026-10-07** — Assumed: all plan links on one computer share one connection, because every plan now gets a link and one connection per plan would run a helper per plan for 8 hours and slow each one by 5 to 10 seconds.
- **2026-10-07** — Assumed: on a live link, saving a note does not send it, because each send wakes the chat and a review of five notes would update the plan five times.
- **2026-10-07** — Assumed: a note is sent once and then marked *Sent*, because a second tap would otherwise make the chat apply the same notes again.
- **2026-10-07** — Assumed: where no chat can be woken or the tunnel tool is missing, the chat prints the file with no prompt to install anything, because a plan must never wait on setup.
- **2026-10-07** — Assumed: the shared part ships here and the mail review page stays in WongOS, because WongStack owns the plan page and the link, and the mail page is that repo's own.
- **2026-10-07** — Assumed: the notes sent are capped in size and always arrive under the fixed line *Notes on the plan … Don't build yet.*, because anyone holding the link could otherwise put any instruction into the chat.
- **2026-10-07** — Walked from this host with a phone-sized browser, not a real phone: the page built with a live link, two notes saved, one tap on *Send notes*. The chat received the header line and both bullets once and built nothing. A sent note arrives at once and interrupts a step the chat is running.
- **2026-10-07** — After `close`, the address answered Cloudflare's error for both the page and a send, and nothing reached the chat. The copy fallback on a refused send is covered by the browser test, not by this walk.
- **2026-10-07** — The areas test fails before the archive, because it names the new spec the archive creates; it is rerun after.
- **2026-10-07** — Task 5.3 is the one checkpoint `/ship` makes after the archive; the merge waits on its result.
- **2026-10-07** — Archive checkpoint: every task ticked, the areas test passes with the new spec in place, numbered 37.4.0.
