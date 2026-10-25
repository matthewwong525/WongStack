# Design

## Context

Three things Matt saw on 2026-10-25 on an iPhone (Safari, inside Paseo), at WongOS's live app. The inbox is a WongStack payload file WongOS takes as it is, so the fix lands here and reaches WongOS by its next sync.

- **Raw body on the item page.** Every item's link is `/apps/inbox/?item=<id>` (`.agents/skills/hand-over/scripts/reply-link.mjs` `openInboxItem`, used by the daily's `inbox add`). `App.tsx` sends any `?item=` to `PlanView`, which puts `item.body` in a sandboxed `<iframe srcDoc>`. A question's body is JSON (`{text, options?, multi?}`), so the frame shows it as text. The parsed words are already there: the `item` route returns `detail` (`ITEM_COLUMNS` reads the body for every non-plan kind), and `api.ts` `read` parses it into `item.detail`.
- **Answers don't wrap.** `Choices` in `Decision.tsx` styles each row with `buttonVariants({ variant, className: ROW })`. `cva` appends `className` without merging, so the row carries the base `whitespace-nowrap`, `justify-center`, `h-9` and `shrink-0` beside `ROW`'s `whitespace-normal`, `justify-start`, `h-auto`. Which one wins is the stylesheet's order, not the class order; `whitespace-nowrap` sorts after `whitespace-normal`, so the row never wraps. `Button` itself wraps `buttonVariants` in `cn` (tailwind-merge), which is why buttons elsewhere behave. The unit tests run in a test DOM with no layout, so nothing caught it.
- **Pinned bars on a plan.** `Layout.tsx`'s header is `sticky top-0`. `PlanView` sizes its column to `100dvh - 5.5rem` so only the frame scrolls: the header and the *Back* row never leave. The review page scrolls inside the frame, so the outer page can't learn of a scroll except by message. The frame talks to the inbox only through the `MessagePort` handed over in `inbox:hello` (`review-kit.html`, `frame.ts`).

## Goals / Non-Goals

**Goals:**
- Any non-plan item opened at `?item=<id>` shows the card the list shows for it, answerable, with *Send*.
- Choice rows wrap inside their card at 390 px, proven in a real browser.
- On a plan, the app's bar and the *Back* row hide while the person scrolls down and return on scroll up or at the top; elsewhere the bar is no longer sticky.

**Non-Goals:**
- The daily's JSON shape, a separate `detail` field, or splitting the question from its later paragraphs.
- The review page's own bottom bar, notes and drawings.
- A browser test for every inbox screen: only the phone-width checks this change needs.

## Decisions

### The item page reuses the list, in a one-item mode

`PlanView` loads the item as today. When `item.kind !== 'plan'`, it renders `<List only={item.id} />` instead of the frame, under the same *Back* row. `List` with `only` filters its items to that id, hides the `Header` and group headings, and keeps everything else: `useDesk`, `send`, the refusal words, `useKeys`, `SendBar`, and the answered-item memory that shows *Sent* after the item closes. A missing item (closed between the two reads) shows the existing *This has closed* line.

- *Alternative:* a new `ItemView` that renders `Decision` with its own send. Rejected: it copies `List`'s send, refusals, desk and keys, and the copy goes stale.
- *Alternative:* parse `item.body` and rebuild a card inside `PlanView`. Rejected for the same reason.
- `PlanView`'s name stays; its comment says it opens any item. A rename touches many tests for no behaviour.

### Choice rows merge their classes

`Choices` builds both rows' classes with `cn(buttonVariants({ variant }), ROW)`, so tailwind-merge drops `whitespace-nowrap`, `justify-center`, `h-9` and `shrink-0`. The label `<span>` gets `min-w-0` so the flex row can shrink below a long word. `LinkRow` passes only `justify-self-start`, which clashes with nothing, so it stays.

### A plan's bars tuck while it scrolls down

- **The kit reports direction.** In hosted mode only (after `inbox:hello`), `review-kit.html` listens to the window's `scroll` (passive) and posts `{ type: 'inbox:scroll', down: boolean }` on the port only when the direction changes: `down: true` once scrolled more than 8 px down from the last turn and past 48 px from the top; `down: false` on 8 px back up or at `scrollY <= 48`. A full-screen drawing or the docked note editor does not move the window, so it posts nothing.
- **The inbox accepts it.** `frame.ts` adds `z.strictObject({ type: z.literal('inbox:scroll'), down: z.boolean() })`, needing no key. `PlanView` keeps `tucked` state; on `inbox:scroll` it sets it.
- **The bars hide.** `Layout.tsx` drops `sticky top-0 z-40` and its blur (now in flow, it scrolls away on every page) and gains `in-data-[bars=tucked]:hidden`. A small `tuckBars(on)` in `app/src/lib/bars.ts` sets or removes `data-bars="tucked"` on `document.documentElement`; `PlanView` calls it on change and clears it on unmount, so no other page is ever left tucked. While tucked, `PlanView` hides its *Back* row and grows its column to `h-dvh -mt-8` (main's top margin cancelled), so the frame meets the top and bottom edges and the review page's fixed bottom bar stays on the screen's bottom edge. A tap line, when shown, stays.
- *Alternative:* one long page that scrolls the frame with the app. Rejected: the review page's fixed bar, note editor and full-screen drawings pin to the frame's own window, which would then run past the screen.
- *Alternative:* no bar on a plan at all. Matt chose scroll-to-hide.
- *Compatibility:* an older inbox ignores `inbox:scroll` (`frameMessage` returns null for an unknown type); an older plan never sends it, so its bars stay as today. A rebuilt plan picks up the new kit.

### A real-browser test setup for the app's screens

- `app/vitest.config.browser.ts`: Vitest browser mode with `@vitest/browser-playwright`, the `react()` and `tailwindcss()` plugins, the `@` alias, headless Chromium launched from the machine's Chrome (`channel: 'chrome'`, or `CHROME_PATH`), as `scripts/tests/review-browser.test.mjs` does. It includes `src/**/*.browser.test.tsx`; `vitest.config.ts` excludes that pattern.
- Dev dependencies: `@vitest/browser-playwright` and `playwright`, matched to the installed `vitest` 5 major; `/apply` checks the current versions and that `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` keeps `npm ci` from downloading a browser. knip learns the new config.
- `npm test` gains `npm run test:browser`, run by `scripts/test-browser.mjs` (or an equivalent inline check): with no Chrome found it prints *no browser to drive — skipped* and exits 0, unless `CI` is set, where it fails. Installs run `npm test` on machines that may lack Chrome; CI always has it.
- `app/src/apps/inbox/Phone.browser.test.tsx` imports `@/index.css`, sets the viewport to 390×844, stubs `fetch` like `App.test.kit.tsx`, and renders the inbox. Cases: a question with two ~200-character options shows each choice row inside its card (`row.right <= card.right`), taller than one line, and `document.documentElement.scrollWidth <= 390`; the same item opened at `?item=<id>` with a JSON body does the same, with no `iframe`.

## Risks / Trade-offs

- **New dev dependencies and a browser in `npm test`** → slower app checks and a second way to run tests. Mitigated by one config and the skip rule; only the inbox's phone file uses it for now.
- **Bars tucking on small scroll jitter** → the 8 px hysteresis and the 48 px top zone keep them steady; `/verify` checks it on the preview at 390 px.
- **Access's side panel** starts at `sm:top-14` under the bar's place. Radix locks the page's scroll while it is open, so on a wide screen opened at the top it looks as today; opened after scrolling, a 56 px strip of page shows above it. Checked on the preview; if it looks wrong, the panel takes `sm:top-0` when the bar is out of view.
- **Two reads on a non-plan item page** (`item`, then `items`) → one extra small request, accepted to keep one copy of the list's logic.

## UX

### Use-case brief
Matt, on his phone, from a link the daily sent in chat or the inbox list. The job: read a question or plan and answer it in one go. Done is the answer sent and *Sent* showing. Context: an iPhone, about 390 px wide, often one-handed, inside Paseo's browser. Common case: one question with two to four long options; plans are read top to bottom. Edge cases: the item closed before he opened it, the computer offline, a link item or an agent's status opened by link. Frequency: a few daily questions and plans each morning.

### Flow
Tap the daily's link → the question's card, alone under *Back* → tap an answer or type one → *Send 1 answer* → *Sent*. For a plan: tap the link → the plan, bars shown → scroll down, bars hide → scroll up, bars return → *Back* or the plan's own buttons.

### Hierarchy
The item page's one primary action is *Send*; *Back* is secondary. On a plan, the plan's words get the screen; the bars yield while reading.

### Review
[review.html](review.html). What Changes item 1 sketches the item page before and after; item 2 the card's answers before and after; item 3 the bars' two states.

### Components
Existing: `Card`, `Button`, `buttonVariants`, `Textarea`, `Checkbox`, `Badge`, the inbox's `Decision`, `Choices`, `Own`, `StartCard`, `LinkRow`, `AgentCard`, `SendBar`, `TapLine`. New: `List`'s `only` prop, `lib/bars.ts`, and the `inbox:scroll` message. Mirrors the inbox list's own card.
