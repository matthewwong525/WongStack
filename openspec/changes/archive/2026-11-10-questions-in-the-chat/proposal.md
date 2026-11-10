# Questions in the chat, the review page for the final OK

**Status:** ready-to-ship
**Branch:** review-cards-final-approval
**Open questions:** none

## Why

Today a review page can ask you things: pick an option, type a name, pick a date, pick a picture, or make a choice inside a sample. So the page mixes two jobs: answering questions and approving the result. You then do not know what the final review is for. You want the questions in the chat, as question cards, and the review page only for the last look: you read it, OK it, and give notes only if you want.

## What Changes

- **Every question comes to you in the chat, as a question card.** This includes picks, typed answers, dates, and a choice between pictures. A question card can show a sample's link, so you can look before you pick. The chat asks all of them before it makes the review page, so the page has nothing to fill in.
  ```mermaid
  flowchart TD
    A["Question cards in the chat"] --> B["Review page"]
    B --> C["OK, notes if you want"]
    C --> D["Build it"]
  ```
- **A review page only shows the result for you to approve.** Each card has its pictures, its words, *OK*, and *Note*. The question boxes go. This is the same for every review page: a plan, a finished build, and other work such as ads to approve. A card's sample that you can click stays, to try, but it no longer sends a choice.
  ```picture
  Before, phone: pictures/before-phone.png
  After, phone: pictures/after-phone.png
  ```
- **Files and key links stay on the page, in *What the build needs*.** These are things you hand over, not choices: you drop a logo on the page, or open a key's private link. *Build it* still waits until each one is there.
- **A new question while a plan waits comes to the chat too.** When your notes open a new choice, the chat asks it as a card, then updates the page.

Non-goals: no change to how a card looks, to *OK* and *Note*, or to the buttons in the bottom bar. Pages made before this change keep their questions.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

### Modified Capabilities
- `review-pages`: a review page asks no questions; *A review page can ask questions* and *A question can ask to pick a picture* go; a live card no longer sends a choice; *What the build needs* holds only files and links.
- `asking-the-user`: every choice and typed answer goes to the person as a question card in the chat, before the review page, never on it.

## Impact

- `.agents/skills/plan/scripts/build-review.mjs`: a `form` fence in a card stops the build with a line that says to ask it in the chat; a need's `form` takes only `file:` questions; the other question kinds (`text`, `long`, `choice`, `choices`, `pictures`, `date`, `tick`) go; the live card's `review.answer` shim goes; `WORK_IN_CHAT` no longer asks for a choice.
- `.agents/skills/plan/references/review-kit.html`: the answer handling for removed kinds and live answers goes; file sending and the open-need count stay.
- `scripts/tests/review.test.mjs`, `review-pictures.test.mjs`, `review-browser.test.mjs`: tests for the new stops, and removed tests for removed kinds.
- `wiki/review-pages.md`, `.agents/skills/plan/references/drawings.md`, `.agents/skills/explore/references/asking-the-user.md`, `.agents/skills/plan/SKILL.md`: the rule and its one home.
- `CHANGELOG.md`: a minor entry.

## Decision log

- **2026-11-09** — Asked where files and key links go → chose to keep them on the page in *What the build needs*, because they are things to hand over, not choices; all choices and typed answers move to chat cards.
- **2026-11-09** — Asked whether the rule holds for review pages that are not plans, such as ads → chose every review page.
- **2026-11-09** — Assumed: a live card stays as a sample to try but stops sending a choice, because a choice on the page is what this change takes away; a pick such as an order is asked in the chat.
- **2026-11-09** — Assumed: a page source with a question in a card stops the build, not a warning, because a warning lets a question slip back onto the page.
- **2026-11-09** — Assumed: pages already made, in the Inbox and its Archive, stay as they are, because they are saved whole and are read-only once answered.
- **2026-11-09** — Assumed: the page's store of typed answers goes, and files keep their own list, because no question but a file is left to answer; the *Answers* group in the notes now lists the files you sent.
- **2026-11-09** — Assumed: a secret asked in a card stops the build with the private-link message, not the chat pointer, because a key never goes in the chat either.
- **2026-11-09** — Assumed: a live card's full-screen hint reads *Try it here: it sends nothing*, because the old hint said what you do goes with your notes.
- **2026-11-10** — Assumed: the chat-title test retries its cleanup, because a helper it starts can still write while the test deletes its folder; that race failed main's checks and this change's local run.
- **2026-11-10** — Archive checkpoint: built, reviewed twice, and archived for 51.8.0 on branch review-cards-final-approval.
