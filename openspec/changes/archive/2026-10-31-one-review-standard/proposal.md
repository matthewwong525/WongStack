# Proposal

**Status:** planned
**Branch:** odd-lion
**Open questions:** none

## Why

Your go on a review should mean you know what you will get. Today a code plan shows sketches, so you often build only to see the real screen, then ask for changes. Review pages also look different for each kind of work, and only code has one. Ads, emails and other work have no page to review at all.

## What Changes

- **Every review page has the same frame.** At the top is the ask in one line, such as *Approve these 3 ads?* Then come why, the things to review as cards, the decisions when there are some, and one bar at the bottom. The bar holds *Send notes* and the page's own buttons. Only what is inside a card changes with the job, so every review feels the same.
  ```screen
  <div class="card col gap phone">
    <b>Approve these 3 ads?</b>
    <span class="muted">Why: the Black Friday sale starts Monday.</span>
    <div class="card col gap"><b>1. Square ad, feed</b><div class="skeleton"></div>
      <div class="row gap"><button class="btn-ghost grow">OK</button><button class="btn-ghost grow">Change</button></div></div>
    <div class="card col gap"><b>2. Story ad</b><div class="skeleton"></div></div>
    <span class="muted">Decisions: assumed 20% off, not 25%</span>
    <div class="row gap"><button class="btn-ghost grow">Send notes</button><button class="btn-primary grow">Approve</button></div>
  </div>
  ```
- **What you approve is what you get.** Each card shows the result as close to the real thing as possible. Each job has its own way to show it. A sketch is used only when nothing real can be made, with one line that says why.
  | Job | What a card shows |
  |-|-|
  | A screen in the app | Today's screen, then the new one from a prototype |
  | An ad | The ad as it will look in the feed or story |
  | A flow or a rule with no screen | A flow picture |
  | Anything else | A picture, a table, or the words before and after |
- **A code plan shows the real new screen, so you never build only to see it.** While planning, the agent builds the screen fast in a copy that is never saved. It uses sample data and a preview link. It takes a picture of each state: empty, loading, done and error. You see *Before* beside *After*, and a *Try it* link opens the prototype. Your go builds the change properly from that prototype. After the build, the page shows what you approved beside what was built, so you can see they match.
  ```mermaid
  flowchart TD
    plan["/plan"] --> proto["prototype in a copy,<br>sample data"]
    proto --> shots["picture of each state"]
    shots --> page["Before | After,<br>Try it link"]
    page --> go{"your go?"}
    go -->|notes| proto
    go -->|yes| build["build from the prototype"]
    build --> check["Approved | Built"]
  ```
- **OK or Change on every card.** Tap *OK* to accept a card, or *Change* to open a note on it. You can approve 2 of 5 ads without typing. Your OKs go to the chat with your notes, so it knows what to keep. An OK is not a go: only the button in the bar starts the next step.
  ```screen
  <div class="card col gap phone">
    <b>3. Story ad</b>
    <div class="skeleton"></div>
    <div class="row gap"><span class="tag">OK</span><span class="grow"></span><button class="btn-ghost">Undo</button></div>
  </div>
  ```
- **A note on any spot, on any card.** Tap a spot on a picture or select words in text, then write your note. Today you can only pin a note on a drawing or a whole paragraph. All notes stay in one list, grouped by card, and each note quotes what it points at.
  ```screen
  <div class="card col gap phone">
    <span class="muted">Notes (2)</span>
    <div class="card col gap"><b>Card 1</b><span>"Shop now" → make it "Get 20% off"</span></div>
    <div class="card col gap"><b>Card 3</b><span>Picture, spot 2: logo too small</span></div>
  </div>
  ```
- **A review page for any work, not only code.** The agent can make a review page for ads or other work. That page has its own buttons, such as *Approve* or *Send*, and opens in your Inbox like a plan. Each button tells the chat what you chose. A button that does something you can't undo, such as *Launch*, asks once more on the page.
  ```mermaid
  flowchart LR
    work["3 ads"] --> inbox["page in Inbox"]
    inbox -->|notes| work
    inbox -->|Approve| next["next step"]
  ```
- **Ads show as they will run.** An ad card shows the ad in a feed post or a story frame. It has the account name, the picture, the words, the headline and the button. Several ads sit side by side when they fit, else one above the other.
  ```screen
  <div class="row gap">
    <div class="card col gap grow"><b>claymoo</b><span class="muted">Sponsored</span><div class="skeleton"></div>
      <span>Our clay kits, 20% off this week.</span><button class="btn-primary">Shop now</button></div>
    <div class="card col gap grow"><b>claymoo</b><span class="muted">Sponsored</span><div class="skeleton"></div>
      <span>Make it with your hands.</span><button class="btn-primary">Learn more</button></div>
  </div>
  ```
- **The link comes first in the chat.** A reply that gives you a page to open, a plan, a preview or any web page, puts the link near the top. A chat that folds a long reply into *See more* no longer hides it. A finished plan's reply shows the link, then the plan, then the line telling you to review it.
  ```text
  Click here to see the plan: review.html
  Plan: …  Why …  What changes …
  Review the plan, then tap Build it …
  ```
- **One wiki page owns the standard.** It says what every review page holds, how to pick what goes in a card, and how to add a new kind of card, such as an email.
  ```text
  wiki/
    review-pages.md   the standard (new)
    ux-principles.md  links to it
  ```

Non-goals: no email card yet (it comes next, as one more kind); no clickable prototype inside the page, only pictures and the *Try it* link; no tool to make ad pictures; no launching ads.

## Capabilities

### New Capabilities
- `review-pages`: the shared frame every review page follows, review pages for work that is not a plan, the cards' OK and Change, and the ad card.

### Modified Capabilities
- `ux-wireframes`: *The page is one scrolling review* follows the shared frame; *A reviewer notes any item* adds notes on selected words and on any picture spot; *Screen sketches show each state and the change* uses prototype pictures over sketches; *Copied notes name the plan and each place* carries each card's OK.
- `asking-the-user`: *A changed plan's reply carries its link* and *A preview link opens the page that changed* put the link near the top of the reply.
- `apply`: *A fresh helper builds the tasks* starts from the plan's prototype; *Preview pictures precede the publish choice* shows *Approved* beside *Built*.

## Impact

- `.agents/skills/plan/scripts/build-review.mjs`: the shared frame, a `review.md` source for pages that are not plans, the `ad` fence, and labelled actions.
- `.agents/skills/plan/references/review-kit.html`: OK and Change per card, notes on selected words and picture spots, notes grouped by card, and buttons from the page's own labels.
- New `.agents/skills/plan/scripts/prototype.mjs`: makes and removes the throwaway copy and keeps its diff in `.scratch/`.
- `.agents/skills/plan/SKILL.md`, `references/drawings.md`, `.agents/skills/apply/SKILL.md`, `apply/references/build-helper.md`, `apply/scripts/preview-review.mjs`.
- New `wiki/review-pages.md`; `wiki/ux-principles.md` and `wiki/development/reply-links.md` link to it.
- Reply link and Inbox: no new message type; a page's actions keep the existing limit of 6.
- A prototype preview uses the existing preview upload, under the change's preview alias. It changes no database.
- Tests: `review`, `review-browser`, `review-pictures`, `preview-review`, a new `prototype` test, and `cli-conventions`.

## Decision log

- **2026-10-31** — Asked which job that is not code to test the shared page on first → chose ads.
- **2026-10-31** — Asked whether each card has OK and Change or only notes → chose OK and Change on each card.
- **2026-10-31** — Asked how close a review should be to the result → chose as close as possible, so a go gives a known result, and never a build just to see it.
- **2026-10-31** — Asked how a code plan shows the real result → chose a throwaway prototype at plan time, with code still waiting for the go.
- **2026-10-31** — Assumed: a plan page keeps the heading *Changes*, and other pages say *To review*, because a plan's cards are its changes.
- **2026-10-31** — Assumed: the prototype is a git-ignored copy of the checkout with its own preview under the change's alias, and only its pictures (in the change folder) and its diff (in `.scratch/`) are kept, because a plan saves no code.
- **2026-10-31** — Assumed: a prototype changes no database and shows sample data, because the preview upload runs migrations on the shared staging database, and a thrown-away migration would stay there.
- **2026-10-31** — Assumed: the build helper starts from the prototype's diff, because the build must match what was approved.
- **2026-10-31** — Assumed: after a build, a screen with a prototype picture shows *Approved* beside *Built*; a screen without one keeps *Live now* beside *Preview*, because the check is whether the build matches the go.
- **2026-10-31** — Assumed: a change with no screen gets no prototype and keeps its flow picture, because there is nothing to look at.
- **2026-10-31** — Assumed: when a prototype can't run (no preview upload here, or the screen needs the person), the plan says why in one line and keeps the sketch, because a plan must not stop on it.
- **2026-10-31** — Assumed: an OK goes to the chat as a line with the notes, such as `Card #2: OK`, and never starts the next step, because a go is one deliberate tap.
- **2026-10-31** — Assumed: the agent that makes a page that is not a plan names its buttons, up to 6, and marks the ones that can't be undone, because only it knows the job.
- **2026-10-31** — Assumed: an ad card's picture is a file in the page's own folder, under the same size limits, because a page must open offline and fit the Inbox.
- **2026-10-31** — Asked whether to put links at the top of replies, after a long reply hid its link under *See more* → chose yes, for plans, previews and any web page, in this change.
- **2026-10-31** — Assumed: one change, not two, because the frame, OK and Change, and the prototype make one experience together.
