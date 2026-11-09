# Review pages that show the screen first

**Status:** built; final checks pending
**Branch:** musing-scorpion
**Open questions:** none

## Why

A plan that changes a screen is easiest to judge when you see the real screen, as the Inbox chats plan showed. Today a review page can still fall back to a gray sketch when the real screen was possible, and it puts a long paragraph above a small picture in a narrow column, even on a wide screen. You read first and look last, and you can't switch between screens without scrolling.

## What Changes

- **A card shows the picture first, with a tab for each screen.** On a computer, the picture is big on the right and the short words sit on the left. On a phone, the picture comes first and the words follow. Tabs above the picture switch between *Before*, *After*, and each state, such as *Empty* or *Error*. *Before and after* puts two side by side. *Full screen*, notes on a spot, and *Try it* stay. A finished build's page uses the same tabs for *Approved* and *Built*. Try the tabs in the sample: it uses the real pictures from the Inbox chats plan.
  ```picture
  Before, computer: pictures/before-computer.png
  Before, phone: pictures/before-phone.png
  ```
  ```live
  folder: prototypes/card
  height: 1200
  ```
- **A card's words get short.** A card shows its bold first sentence and about two lines. The rest folds under *More*. The plan writes what changes in the words and lets the picture show how it looks, so you don't read a description of a picture you can see. Tap *More* in card 1 of the sample above to see it.
- **A screen plan shows the real screen, not a sketch.** When a screen needs data the copy can't reach, such as your chats, the plan writes sample data into the copy. When the copy can't go online, it runs on this computer and the pictures come from there. A sketch stays only when neither runs, with one line that names the step that failed. The page builder warns when a card has a screen sketch and no real picture.
  ```mermaid
  flowchart TD
    plan["Plan changes a screen"] --> copy["Copy of the app, with sample data"]
    copy -->|"goes online"| online["Pictures and a Try it link"]
    copy -->|"can't go online"| local["Runs on this computer: pictures"]
    local -->|"can't run"| sketch["Sketch, with the step that failed"]
  ```
- **A card can show a whole designed page, such as an email.** The card shows the email as readers will see it, at phone or computer width, like the `/carol-email` page in ClaymooApp. Each version of a test, such as *A* and *B*, gets a tab, and *All* shows them side by side. Links look as they will but don't open. Tap a spot on the email to note it: the note names the version. The card's questions, such as *Top picture* or *Send time*, sit beside the email on a computer. A review page's own buttons, such as *Approve & schedule*, stay in the bottom bar. Card 3 in the sample above shows it: pick a picture, switch versions, and tap the email. A skill that has its own review page, such as `/carol-email`, can then move onto this one in its own repo.
- **Each ad gets a tab.** A card with several ads shows one big ad per tab, such as *Feed* and *Story*, and *All* shows them side by side to compare.
- **Diagrams get the same room.** A flow or a drawing sits beside its words on a computer, at a size you can read. When a card holds two or more drawings, such as *Today* and *After*, each one gets its own tab. Card 2 in the sample above shows it.

What the build needs, notes, OK and Change, and the bottom bar work as they do today.

Non-goals: no clickable copy of the app inside the page (pictures and *Try it* do that job); no email sending in WongStack; no change to ClaymooApp's `/carol-email` in this plan.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

### Modified Capabilities
- `review-pages`: a card leads with its pictures, in tabs, beside short words on a wide screen; a screen plan's prototype uses sample data and runs locally when it can't go online; a sketch says which step failed and the builder warns on a sketch with no picture; a card can show a whole designed page, one tab per version, with spot notes and its questions beside it; each ad gets a tab; a form can ask to pick one picture.
- `ux-wireframes`: a drawing shows open in its card's view, not folded under its item; a long item folds its text after the first lines behind *More*; several drawings in one item become tabs.

## Impact

- `.agents/skills/plan/references/review-kit.html`: the card grid (words beside view at 900 px and wider, view first on a phone), the tab strip, *Before and after*, *More*, and a wider `main` for cards with a view; full-screen, zoom, spot notes and OK / Change keep working inside a tab.
- `.agents/skills/plan/scripts/build-review.mjs`: groups an item's drawings into one view with a tab per picture label or per fence (the fence's info text after its language names the tab, such as ```` ```mermaid Today ````); splits a picture fence into tabs by label; warns on a `screen` or `svg` sketch with no `picture` in the same item and no *why* line.
- `build-review.mjs` and the kit: a `page` fence (one `<label>: <file>.html` line per version) drawn in a sealed frame with no script, its pictures copied in and its links kept but not followable, at *Phone* and *Computer* width, with spot notes; a `pictures:` form question; each `ad` fence its own tab, with *All*.
- `.agents/skills/plan/scripts/prototype.mjs`: a `serve` step runs the copy on this computer (`npm run dev`) and prints its address for pictures when `upload` can't run.
- `.agents/skills/apply/scripts/preview-review.mjs`: *Approved* / *Built* and *Live now* / *Preview* become tabs.
- `.agents/skills/plan/SKILL.md`, `.agents/skills/plan/references/drawings.md`, `wiki/review-pages.md`, `wiki/ux-principles.md`: short card words, sample data, the local run, tab labels.
- `scripts/tests/review-browser.test.mjs`, `scripts/tests/review-pictures.test.mjs`, the prototype tests; `CHANGELOG.md`.
- Builds after *A smaller review bar with loading feedback* is published, because both edit the review kit.

## Decision log

- **2026-11-08** — Asked how a screen card lays out on a computer → chose the picture beside the words: picture big on the right, short words on the left; on a phone the picture comes first.
- **2026-11-08** — Asked how you move between screens and states → chose tabs of real pictures, with *Try it* for the live copy, over a clickable copy in the page or all states side by side.
- **2026-11-08** — Asked how this fits with *A smaller review bar with loading feedback*, which edits the same page → chose to plan here and build after that change is published.
- **2026-11-08** — Asked whether ads get a tab each → chose a tab per ad, plus *All* to see them side by side.
- **2026-11-08** — Asked where a full email preview is built → the person pointed to `/carol-email`'s review page in ClaymooApp and asked that this review format can show pages like it. Then asked whether to add a whole-page card, versions as tabs, and questions beside the card to this plan → chose to add them here.
- **2026-11-08** — Assumed: the whole-page card adds no email sending to WongStack, only a way to show a finished page, because email features are still tested in WongOS and ClaymooApp first.
- **2026-11-08** — Assumed: a page's links show but don't open, and its pictures are copied into the page, because a review page loads nothing from the web and opens offline in the Inbox.
- **2026-11-08** — Assumed: a whole page runs no script, because an email or a finished page needs none to be seen, and a page with no script is safe to show beside notes; a page that must run a script stays a `live` card.
- **2026-11-08** — Assumed: picking a picture in a card's question does not redraw the page, because the chat rebuilds the page from the answer; the sample redraws it only to show the idea.
- **2026-11-08** — Assumed: the Inbox sources plan fell back to a sketch because its copy had no chats to show, not because no copy could run; so sample data written into the copy is the fix, because the prototype rules already ask for sample data and a sketch only when no prototype can run.
- **2026-11-08** — Assumed: a running copy on this computer is the second way to get real pictures, because the app already has a local dev server, and it needs no upload or Cloudflare login.
- **2026-11-08** — Assumed: card words fold after about two lines behind *More*, not cut from the proposal, because the proposal stays the one copy of the plan and a reviewer may still want the detail.
- **2026-11-08** — Assumed: *Before and after* shows only when an item has both a *Before* and an *After* tab, because there is nothing to compare otherwise.
- **2026-11-08** — Assumed: Why, What the build needs and Decisions keep their narrow, readable width on a wide screen; only cards with a view grow wider, because long lines of text are hard to read.
- **2026-11-08** — Assumed: the builder warns, not stops, on a sketch with no real picture, because a sketch is still right for a plan with no running app.
- **2026-11-08** — Assumed: task 0.1 is met, because *A smaller review bar with loading feedback* was published on 2026-10-09 as PR #360 (v40.2.0); the `splendid-stingray` workspace is an old leftover of it, so this build starts from the main branch now.
- **2026-11-08** — Assumed: the build writes all source and tests before it runs the checks, once at the end, because one run then shows every break together.
- **2026-11-08** — Assumed: *Approved* and *Built*, and *Live now* and *Preview*, get the same side-by-side button as *Before* and *After*, because a finished build is judged the same way.
- **2026-11-08** — Assumed: a picture with no label is a tab named by its file name, because every tab needs a name.
- **2026-11-08** — Assumed: a card's table stays in the words column, like its questions, because a table is words to read, not a picture.
- **2026-11-08** — Assumed: each version of a page card reports its height to the card through one small script that the review page adds, so the card shows the whole page and takes a spot note everywhere, the Inbox too, because the Inbox seals the review page and the card can't read a page's size itself there.
- **2026-11-08** — Assumed: the review page's own height script is not "the page's script": the spec's "runs no script" means the page's own content. The build stops on any script, `on…` attribute or `javascript:` address in the page, and the page's security rule lets only the one script with the known fingerprint (hash) run.
- **2026-11-08** — Assumed: a tap on a page card goes to a clear cover over the page, because the page's own content runs no script and can't report a tap itself.
- **2026-11-08** — Assumed: on a phone, *All* in a page card shows the versions one above the other, because two emails side by side at phone width are too small to read; pictures and ads still sit side by side, shrunk to fit.
- **2026-11-09** — Saved for the final check: two second-look rounds fixed spot notes on a page card inside the Inbox, `background` pictures in a page, `serve` leaving its server on Ctrl-C, and a page that grew without end; local checks pass apart from a known slow app test under load.
