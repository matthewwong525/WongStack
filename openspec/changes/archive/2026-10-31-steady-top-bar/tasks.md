## 1. The app's bar

- [x] 1.1 Pin `app/src/Layout.tsx`'s header again (`sticky top-0 z-40`, the see-through background with blur), drop its `in-data-[bars=…]` classes, and update its comment
- [x] 1.2 Delete `app/src/lib/bars.ts`
- [x] 1.3 Update `app/src/style.test.ts`: the bar is `sticky top-0 z-40` and carries no `data-bars` class

## 2. The inbox's plan view

- [x] 2.1 `app/src/apps/inbox/frame.ts`: add `inbox:back`, drop `inbox:scroll`, export `ownBack(body)` (reads `data-own-back` on `<body>`)
- [x] 2.2 `app/src/apps/inbox/PlanView.tsx`: drop the `bars` state and `tuckBars`; send `workspace` in `inbox:hello`; navigate to `/apps/inbox/` on `inbox:back`; for an own-back page show only the `sr-only` title, else the pinned `Top` row; one column height, `h-[calc(100dvh-5.5rem)]`
- [x] 2.3 `frame.test.ts`: `inbox:back` parses, `inbox:scroll` returns null, `ownBack` reads the body attribute and nothing else
- [x] 2.4 `PlanView.test.tsx`: replace the tucking tests with: an own-back page shows no visible *Back* outside the frame and keeps its height through scroll messages; `inbox:back` opens the week board; an older page shows the pinned *Back*; hello carries the workspace

## 3. The plan's page

- [x] 3.1 `.agents/skills/plan/references/review-kit.html`: add `data-own-back` to `<body>`; in hosted mode draw *Back* and the workspace first in `<header>` and post `inbox:back` on tap; remove `scrolled()` and its listener
- [x] 3.2 `scripts/tests/review.test.mjs`: replace the scroll tests with: hosted shows *Back* and the workspace as text (markup in the name stays text), a tap posts `inbox:back`, scrolling posts nothing; opened on its own, no *Back* row

## 4. Words and release

- [x] 4.1 `wiki/development/reply-links.md`: replace the *bars slide away* line with the pinned bar and *Back* scrolling with the plan
- [x] 4.2 Add `inbox:scroll` and `tuckBars` to `scripts/retired-names.json`, with their replacements
- [x] 4.3 Add a `## Next (patch) — The app's top bar stays put` entry to `CHANGELOG.md`, saying a plan sent earlier keeps a pinned *Back* until its chat rebuilds it

## 5. Verification

- [x] 5.1 Run the app's checks and `node .github/scripts/checks.mjs --worktree`; fix what fails
- [x] 5.2 `/save`, then on the preview at 390 px: the bar stays put on the week board, Access and a plan; *Back* scrolls off with a fresh plan and its tap opens the week board; an older plan shows *Back* pinned and nothing slides
