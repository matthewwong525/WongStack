# Design

## Context

See proposal.md for why. Today [`build-review.mjs`](../../../.agents/skills/plan/scripts/build-review.mjs) turns each fence in an item into its own `<details class="drawing">` under the item's text, in a 700 px `main`. A `picture` fence draws all its pictures in one `.art.photo` flex row. [`prototype.mjs`](../../../.agents/skills/plan/scripts/prototype.mjs) has `start`, `upload` and `finish`; `upload` needs the Cloudflare preview. The sample card at `prototypes/card/index.html` is the approved look for this change: the build follows it.

## Goals / Non-Goals

**Goals:**
- One view per item that holds every picture and drawing as tabs, beside the words at 900 px and wider.
- Real pictures in more plans: sample data in the copy, and a local run when the upload can't run.
- No proposal syntax a current plan breaks on: old proposals build the same content into the new layout.

**Non-Goals:**
- A clickable copy of the app in the page.
- Changing `live` cards, apart from sitting in the view.
- Email sending, or moving ClaymooApp's `/carol-email` onto this page; that is a ClaymooApp change after this ships.
- Changing the bar; *A smaller review bar with loading feedback* owns it.

## Decisions

- **Tabs come from labels the proposal already writes.** A `picture` fence line's label (`After, Empty:`) names its tab. Any other fence names its tab by the text after its language (```` ```mermaid Today ````), else by its kind (*Flow*, *Screen*, *Drawing*). This keeps every proposal written so far valid. Alternative: a new `tabs` fence; rejected, because it doubles the syntax for the same thing.
- **The first tab shown is the first whose label starts with *After*, *Built* or *Preview*, else the first tab.** The result is what you decide on; *Before* is one tap away.
- **Labels with a width suffix pair up.** `After, computer:` and `After, phone:` make one *After* tab with a *Phone | Computer* switch, the same switch a `live` card has. Without a suffix, a picture is a phone picture.
- ***Before and after* shows only when an item has a tab whose label starts with *Before* and one with *After*.** It puts the two side by side in the view, and stacks them under 600 px.
- **Words fold by height, not by sentence count.** The kit measures the text and folds it past about two lines at the current width, with *More* / *Less*. A note's text search reads the hidden part too, so notes on folded words still place.
- **Width.** `main` stays 700 px for Why, What the build needs and Decisions. The What Changes list grows to 1160 px at 900 px and wider; a card with no view stays 700 px and centered.
- **One full-screen viewer.** *Full screen* and a tap on the shown picture open the existing viewer for the shown tab; spot notes keep their picture index across tabs, so `picture 2` still names the same file.
- **The sketch warning is in the builder.** An item with a `screen` or `svg` fence and no `picture` fence, and no line starting *No real picture:*, warns *a screen sketch with no real picture: run the prototype with sample data, or add a line "No real picture: <the step that failed>"*. Deterministic, so no agent has to remember it.
- **A `page` fence shows a whole page.** One `<label>: <path>.html` line per version, such as `Version A: pages/email-a.html`, each a file in the review's folder. The builder reads it through the `live` card's inliner (pictures, fonts and styles copied in and checked by first bytes), then: stops on any `<script>`, `on*` attribute or `javascript:` address; moves each `<a href>` to `data-href`, so a link keeps its look but goes nowhere, and the full address shows on hover; refuses a web address anywhere else, such as a web picture. The kit draws it in an `<iframe sandbox="allow-scripts" srcdoc>`, never `allow-same-origin`, under the `live` card's policy (`default-src 'none'`, pictures and styles from the page only). The builder adds one fixed kit script to each page, and the page's policy lets only that script run, by its `sha256` hash. The script posts `{type: 'review:page', h}` with the page's `scrollHeight` on load and on resize, and answers a pointer point with the link under it. The kit takes a message only from one of its own page frames, clamps the height, sets the frame to the full height, then adds a clear cover that catches a tap for a spot note. This works the same inside the Inbox, which seals the review page in its own frame, so a frame there can't read a page's height directly. Alternative: a `live` card that allows links; rejected, because a live card runs script, and a page that runs none is safer beside notes. `/carol-email` already renders Klaviyo's HTML; to use this card it saves that HTML and its pictures into its review folder.
- ***All* for versions and ads.** A view whose tabs are all `page` versions, or all ads, gets a last *All* tab that lays them side by side at phone width, stacked under 600 px. Each `ad` fence becomes its own tab, named by its info text or its placement (*Feed*, *Story*).
- **Spot notes name the tab.** A spot note on a picture, an ad or a page keeps its tab label and its point in percent of the whole page, not of the visible part, such as `- Card #3, Version B, spot at 34% across and 59% down`.
- **A `pictures:` question.** `pictures: Top picture | pictures/a.jpg, pictures/b.jpg, pictures/c.jpg` shows one small picture each, read through the picture checks; the answer is the chosen file name. It does not redraw the page: the chat rebuilds from the answer.
- **Questions sit with the words.** A `form` fence in an item moves into the words column at 900 px and wider, under the words; below it on a phone.
- **`prototype.mjs serve <change>`** runs `npm run dev` in the copy's `app/` on a free port, waits for it to answer, and prints `PROTOTYPE_URL=http://localhost:<port>`. Pictures come from `browse.mjs` at that address. A localhost address is never written as *Try it*: the builder already refuses a link that isn't `https://`.

## UX

### Use-case brief
The owner reviews a plan from the Inbox, on a phone or a laptop, often between other tasks. The job: decide yes or no, or give a note, on how a screen will look. Done is a go they don't have to revisit after the build. Mirrors the sample card in `prototypes/card/`.

### Flow
Open the page → the first card shows the *After* picture → tap *Before*, or *Before and after* → read the two-line words → OK, Change, or a note on a spot. *More* and *Full screen* are side paths.

### Hierarchy
Per card: the picture is primary; the tabs are second; the words third; OK and Change last. The bottom bar is unchanged.

### Review
[review.html](review.html): What Changes item 1 holds the sample, with a screen card, a diagram card, and an email card with versions, a picture question and spot notes.

### Components
The kit's existing card, button, frame and full-screen viewer, plus a tab strip in the look's colors. No new library.

## Risks / Trade-offs

- [A tab hides a state the reviewer never opens] → Each tab shows its note count, and the hint line says *tap a tab to see each screen*.
- [Words folded under *More* hide a key detail] → The plan's writing rule puts what changes in the first sentence; *More* holds only detail.
- [A local dev run differs from the deployed preview] → Pictures only; the build's own preview check still runs against the real preview.
- [A page's styles leak into the review page] → It sits in its own frame, so its styles stay inside.
- [A big email passes the page size limit] → The same size checks as a `live` card: 300 KB a file, 800 KB a card, 1.5 MB a page.
- [Kit edits clash with the smaller-bar change] → Build after it is published, and rebase on it.
