# Design: the landing page tells the self-drive story

## Context

The page's story lives in `site/src/Story.tsx` as five scenes (`KnowledgeScene`, `OperationsScene`, `DataScene`, `RetentionScene`, `TeamScene`), placed by `site/src/Landing.tsx` between the hero and `WorksWith`. The hero's `<h1>` is `Rotator`, which slides through `AGENTS` from `install.ts`. The source for the new story is the 8-slide deck *How to self-drive your business* (Drive link in memory #1626; a local PDF at `/root/wongstack-deck/deck.pdf`). Slide wording below is taken from it.

## Goals / Non-Goals

- Goal: the sections under the hero follow the deck slide by slide, with the deck's words.
- Non-goal: any change to `install.ts`, the FAQ, costs, privacy, `apps.tsx`, or `WorksWith`.

## Decisions

### A plain headline replaces the rotator

`<h1>Self-drive your business.</h1>`. `Rotator.tsx` and its `.rotator*` styles are deleted, with its tests in `App.test.tsx`. The headline then names no product, so the spec's naming rule holds without the moving-name clause. Hero lede, from slides 1–2: *A self-driving car sees the road, knows the rules, and knows where to go. Your business needs the same three, and AI sets them up in accounts you own.* Keep the Paseo picture and the actions.

Alternative: keep the rotator under the new headline. Rejected: two headlines compete, and the works-with cards already name each assistant.

### Story scenes map one to one onto slides 2–7

Replace the five scenes in `Story.tsx` with six, each a `section.band.story` with `aria-labelledby`, a `.story-step` label, an `h2`, one `p` and one `figure`:

| Step label | `h2` | Line | Figure |
|---|---|---|---|
| 01 / The idea | Your business has the same three. | A self-driving car needs sensors, rules, and navigation. | three pairs: Sensors → **Data** *What your business sees*; Rules → **Process** *How the work gets done*; Navigation → **Reason** *Where to go, and why* |
| 02 / Data | Data is what your business sees. | Ads in one tool, sales in another: blind spots. In one place you own, AI sees the whole road. | Ad spend, Creatives, Sales, Customers joining into *One place you own* |
| 03 / Process | Process is how the work gets done. | The process changes all the time. Only what runs the job stays up to date. | Research ▸ Brief ▸ Creative ▸ Publish; then three cards: **Code** *Does the same step the same way, every time*; **A skill** *Steps the AI follows when it takes judgment*; **An SOP**, struck through, *Nobody runs it, so it never gets updated*. Then `<YourApps embedded />` and the install button, as `OperationsScene` has today |
| 04 / Reason | Reason is why you chose this road. | Saved from your chats, so the next task starts with the why. | three question bubbles: *Why are we running ads?*, *Why this audience?*, *Why this message?* |
| 05 / One example | One example: publishing an ad. | Start with one process, and the other two come with it. | three rows: *Your ad metrics* → Data, *Your campaign structure* → Process, *Why you have this setup* → Reason |
| 06 / The whole team | The whole team starts with context. | (existing `TeamScene`, unchanged) | (unchanged) |

Labels stay one short phrase, per Matthew's slide feedback (memory #1590). The SOP card is struck with `<s>` plus a visually hidden "not" so it reads right without color. Reason never shows the person telling the assistant to remember (memory #1588).

Reuse the existing scene styles (`.story`, `.story-copy`, alternating `band-shade`, the accent colors already given to processes/data/reasons) and drop CSS left unused (`.knowledge-*`, `.join-rail`, `.shared-context`, `.data-connection*`, `.learning-*`, `.remembered-note`).

### A setup section before install

New `SetupScene` (or a block in `Landing.tsx`) from slide 8: `h2` *The hardest part is the setup.*, line *Handled for you. AI figures out any problems.*, a four-item list: Servers and databases, Security, Collaboration, Memory. It sits directly before `#install`. Order after the story: Team → WorksWith → Setup → Install → Questions → Make it yours.

### Shared text

`index.html` description, `og:description`, `twitter:description`: *Self-drive your business. Bring your data, processes, and reasons together, in accounts you own.* `brand/share-image.svg` gets the line *Self-drive your business. In accounts you own.*; re-render `public/share.png` at 1200×630 with whatever renderer is on the machine (`rsvg-convert`, or a headless browser), keeping it under the size the share test sets. `og:image:alt` names the new line. README line 7 becomes **Self-drive your business.** followed by its current second sentence.

### Revision 2: shorter, slide pictures, a comparison chart

Matthew's notes on the first preview: too long, less of the UI he uses, more of the ideas, the talk's pictures, and a chart of what other tools keep.

- **Cut:** the hero's Paseo screenshot (and its caption), `YourApps` in the Process scene, and `TeamScene`. Delete `apps.tsx`, `mockups.tsx`, their tests and CSS if nothing else imports them. `WorksWith` stays.
- **Slide pictures:** from the deck (`/root/wongstack-deck/x/ppt/media/`): `image2.png` (the car) in the hero, `image12.png` (the road with three stops and a pin) behind the Reason questions. Convert to WebP under `site/public/art/`, sized for a 2x screen, with `width`/`height` set and plain `alt`. The other figures redraw slides 3, 4, 5, 7 and 8 in HTML with the icons the page already draws inline (database, chart, card, users, shield, brain). Keep the slide colors: Data green, Process blue, Reason purple.
- **The chart:** new `site/src/compare.ts` holds one column per product and one row per kind, each non-WongStack mark `"yes"` or `"not-stated"`, with the URL and quote beside each mark as a comment, and `CHECKED = "October 2026"`. Rows: *Data, in one place you own* · *Process, as code you own* · *Reason, saved from your chats*. Columns: WongStack, OpenClaw, Muse, Grok Bot, ChatGPT, Claude. Starting marks from the 2026-10-15 research: Reason is `yes` for all five (OpenClaw docs.openclaw.ai/concepts/memory; Muse about.fb.com/news/2026/09/introducing-muse; Grok Bot docs.x.ai/grok-bot; ChatGPT help.openai.com memory; Claude support.claude.com/en/articles/11817273); Process `yes` for OpenClaw only if its skills page says a skill can hold scripts in the user's own workspace, else `not-stated`; everything else `not-stated`. **Open each source and confirm the quote word for word before setting a mark**; a mark you can't confirm is `not-stated`. Render a `table.compare` with `<th scope>` headers, ✓ and – with visually hidden *Yes* / *Not stated*, a legend line *✓ their own pages say so · – not stated*, and *Checked October 2026*. Logos as in the old chart (`git show adeee5d1^:site/src/compare.ts`; files under `site/public/logos/` if still present, else plain names). On a phone the table scrolls inside its own box, never the page.
- **Site.test:** the `RIVALS` comparison guard is replaced by a test of the new requirement: every non-WongStack mark is `yes` or `not-stated`, `CHECKED` shows on the page, and product names appear only inside the chart. Record it as a loosened check with its `Check:` bullet.
- **Wiki:** `wiki/maintaining/landing-page.md` replaces "compares WongStack with no other product" with how to keep the chart true (open each source, update `CHECKED`).

## Risks / Trade-offs

- [The share picture can't be re-rendered on this machine] → report it; keep the old PNG and old alt text rather than an alt text that lies.
- [Story word budget] → the existing test caps `.story-copy > p` at 120 words; the new lines total well under.

## Migration Plan

Publish as a patch release with a CHANGELOG entry; nothing to do for installs, which never receive `site/`.

## UX

### Use-case brief

A business owner, often on a phone, arrives from the talk or a shared link. Done: they get the car idea in one look, see what Data, Process and Reason mean through ads, and reach install.

### Flow

Hero → same three → Data → Process → Reason → ad example → chart → works with → setup → install → questions → closing call.

### Hierarchy

One primary action, *Install for free*, in the hero, works with, and the close. Each scene's figure carries the slide; the line under the heading is quiet.

### Review

[review.html](review.html). The What Changes items *The headline says…*, *The story follows the talk's slides…*, *"The hardest part is the setup"…* and *The rest stays…* sketch the page.

### Components

Existing: `.band`, `.story`, `.story-copy`, `.story-step`, `YourApps embedded`, `InstallButton`, `WorksWith`, `TeamScene`. New: the scene figures above, plain `dl`/`ol` markup styled with the existing accents; no new dependency.

## Build notes

- **2026-10-15** — `Site.test.tsx` reads every page for *servers*. The setup list's *Servers and databases* is allowed as that exact phrase, like the cost lines; any other use still fails.
- **2026-10-15** — The share picture was rendered with headless Chromium and the Geist font read from another checkout's files; nothing was installed.
- **2026-10-15** — `wiki/maintaining/landing-page.md` described the old scenes; its story bullets now describe the six slides and the setup section.
- **2026-10-15** — Asked how the chart should mark other products → Matthew: Process counts only as saved code ("the code is not saved"); rows Data in one place you own / Process as code you own / Reason saved from chats, others ✓ or not stated.
- **2026-10-15** — Asked what to cut → chose the Paseo screenshot, the example tools demo, and the team section; works-with stays.
