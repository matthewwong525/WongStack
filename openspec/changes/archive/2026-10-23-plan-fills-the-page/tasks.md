# Tasks

## 1. The plan fills the screen

- [x] 1.1 `app/src/apps/inbox/PlanView.tsx`: the loaded view becomes a column filling the window below the header (`h-[calc(100dvh-5.5rem)] -mb-8 flex flex-col`), and the frame drops `rounded-md border` and its `80svh` height for `min-h-0 flex-1`, breaking out to the window's full width; loading and closed states unchanged
- [x] 1.2 `PlanView.test.tsx`: the frame fills its column with no border, and the Back row and tap line sit above it; verify with `npm test` in `app/`
- [x] 1.3 `CHANGELOG.md`: a `## Next (patch) — A plan in the inbox fills the screen` entry in plain words

## 2. Verification

- [x] 2.1 `npm test` and the lint in `app/` pass, and the payload checks pass
- [x] 2.2 `/save`, then on the preview open a plan at 390 px and at 1280 px: the frame spans the window, the bar sits on the bottom edge, the outer page's `scrollHeight` equals its `clientHeight`, and a note and a full-screen drawing open inside the plan as before
