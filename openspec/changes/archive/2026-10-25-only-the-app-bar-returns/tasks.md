# Tasks

## 1. The page says when it is at its top

- [x] 1.1 In `.agents/skills/plan/references/review-kit.html`, add `top` (`scrollY <= 48`) to `inbox:scroll`, posting whenever `down` or `top` changes; verify by reading the script and by the review-kit tests passing.
- [x] 1.2 In `app/src/apps/inbox/frame.ts`, accept an optional `top: boolean` on `inbox:scroll`; verify `frame.test.ts` covers it present, absent, and not a boolean.

## 2. Only the app's bar returns, over the plan

- [x] 2.1 `app/src/lib/bars.ts`: `tuckBars` takes `'tucked' | 'over' | null`; `app/src/Layout.tsx`: the header is fixed at the top over the page under `data-bars="over"`; verify `style.test.ts` checks the classes.
- [x] 2.2 `app/src/apps/inbox/PlanView.tsx`: three states, `top`, `down` and `up`, from the message (a missing `top` reads as `!down`); `up` keeps the column full height, hides the `Top` row and sets bars to `over`; verify `PlanView.test.tsx` covers down, up, top, and an old page's message.
- [x] 2.3 Add a `## Next (patch)` entry to `CHANGELOG.md`; verify `node scripts/check-payload-links.mjs` passes.

## 3. Checks

- [x] 3.1 Run the app's tests and `node .github/scripts/checks.mjs --worktree`; verify they pass.
