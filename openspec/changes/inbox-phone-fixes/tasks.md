# Tasks

## 1. Inbox: an item's own page shows its card

- [x] 1.1 `app/src/apps/inbox/List.tsx`: an `only?: string` prop filters the shown items to that id, hides `Header`, the group headings and `Empty`, and shows *This has closed. Ask its chat for a new link.* when the item is not listed; send, refusals, desk, keys and `SendBar` unchanged
- [x] 1.2 `app/src/apps/inbox/PlanView.tsx`: a loaded item whose `kind` is not `plan` renders the *Back* row and `<List only={item.id} />` instead of the frame; its comment says it opens any item
- [x] 1.3 Tests in `app/src/apps/inbox/` (`PlanView.test.tsx` or a new `Item.test.tsx` on `App.test.kit.tsx`): a question at `?item=<id>` whose body is `JSON.stringify({ text: 'Ask?\n\nSteps 1-4', options: [...] })` shows the question with both paragraphs, its options as radios, *Or type your own answer* and no `iframe` or `{"text"`; picking and *Send 1 answer* posts one tap with the option's text; an approval and a morning plan card show their cards; a link item shows *Open* with no *Send*; an item missing from the list says it has closed

## 2. Inbox: answers wrap

- [x] 2.1 `app/src/apps/inbox/Decision.tsx`: both `Choices` rows build their classes with `cn(buttonVariants({ variant }), ROW)`, and the label `<span>` gets `min-w-0`
- [x] 2.2 `Agents.test.tsx` or `App.test.tsx`: a choice row's class list holds `whitespace-normal` and not `whitespace-nowrap`, `justify-center` or `h-9`

## 3. Plan: bars tuck while scrolling down

- [x] 3.1 `.agents/skills/plan/references/review-kit.html`: in hosted mode only, a passive window `scroll` listener posts `{ type: 'inbox:scroll', down }` on the port when the direction turns (8 px hysteresis, `down: false` within 48 px of the top)
- [x] 3.2 `scripts/tests/review.test.mjs`: a hosted page posts `down: true` once after scrolling down, nothing on small jitter, `down: false` on scrolling up or to the top; an unhosted page posts nothing
- [x] 3.3 `app/src/apps/inbox/frame.ts`: accept `inbox:scroll` with a boolean `down`; `frame.test.ts` covers it and refuses a non-boolean
- [x] 3.4 `app/src/lib/bars.ts`: `tuckBars(on)` sets or removes `data-bars="tucked"` on the root
- [x] 3.5 `app/src/Layout.tsx`: the header drops `sticky top-0 z-40` and its blur classes and gains `in-data-[bars=tucked]:hidden`; `app/src/style.test.ts` pins that the bar is not sticky and hides when tucked
- [x] 3.6 `app/src/apps/inbox/PlanView.tsx`: `inbox:scroll` sets `tucked`; while tucked, `tuckBars(true)`, the *Back* row hides and the column becomes `h-dvh -mt-8`; unmount clears it. `PlanView.test.tsx`: a `down: true` message hides *Back* and tucks the root, `down: false` brings both back, and leaving the page clears the root
- [ ] 3.7 `app/src/apps/access/Page.tsx`: only if the preview check in 6.3 shows a strip above the side panel, give it `sm:top-0` when the bar is out of view

## 4. App: a real-browser test at phone width

- [x] 4.1 `app/package.json`: add `@vitest/browser-playwright` and `playwright` for the installed `vitest` major, with no browser download on `npm ci`; add `test:browser` to the scripts and to `npm test`; teach knip the new config
- [x] 4.2 `app/vitest.config.browser.ts`: browser mode, headless Chromium from the machine's Chrome (`channel: 'chrome'`, or `CHROME_PATH`), the `react()` and `tailwindcss()` plugins and `@` alias, including `src/**/*.browser.test.tsx`; `vitest.config.ts` excludes that pattern
- [x] 4.3 The `test:browser` runner: with no Chrome found, print `no browser to drive — skipped` and exit 0, unless `CI` is set, where it fails
- [x] 4.4 `app/src/apps/inbox/Phone.browser.test.tsx`: at 390×844 with `@/index.css`, a question with two ~200-character options in the list, then the same item at `?item=<id>` with a JSON body: each choice row sits inside its card, is taller than one line, and `scrollWidth <= 390`. Confirm it fails against the old `Choices` before keeping it
- [x] 4.5 If the payload manifest or the install-shaped app check lists app test files or configs, add the new ones (`.agents/skills/wong-sync/references/payload-files.json`)

## 5. Docs and release

- [x] 5.1 `wiki/development/reply-links.md`: a question's, approval's or morning plan's link opens its card in the inbox, answerable there; only a plan opens its review page
- [x] 5.2 `wiki/stack/testing.md`: the app's phone-width browser tests, how to run them, and the no-Chrome skip
- [x] 5.3 `CHANGELOG.md`: a `## Next (minor) — The inbox reads well on a phone` entry in plain words

## 6. Verification

- [x] 6.1 In `app/`: `npm test` passes, with the browser suite run, not skipped
- [x] 6.2 The payload checks pass (`node --test scripts/tests/review.test.mjs scripts/tests/review-browser.test.mjs` and the rest of `scripts/tests/`)
- [ ] 6.3 `/save`, then on the preview at 390 px: a question opened at `?item=<id>` shows its card and sends; long answers wrap in the list; a plan's bars hide on scroll down and return on scroll up, its bottom bar on the screen's edge; the list's bar scrolls away; Access's side panel looks right on a wide screen after scrolling
