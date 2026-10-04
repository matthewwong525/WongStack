---
paths: ["app/**", "schema/**", "scripts/**", ".github/workflows/**"]
---

# Write less code

Write the least code that does the job, and write no code that does not. Decompose branchy logic into named helpers as you write it. Prefer a surgical edit to a file rewrite. Do not use `any`; use `unknown` only when you narrow it before use.

## Where things go

Follow the files that already do it. Split by job, not by size: each file does one thing and is named for it.

- **A page:** a folder in [`app/src/pages/`](../../app/src/pages/home/Home.tsx), and one entry in [`app/src/router.tsx`](../../app/src/router.tsx).
- **A part used by one page:** in that page's folder. It moves to `app/src/components/` when a second page uses it.
- **Data and helpers with no UI:** [`app/src/lib/`](../../app/src/lib/apps.ts).
- **Styles:** the shared look is [`app/public/style.css`](../../app/public/style.css), the only file that styles whole elements. A part's CSS sits beside it, under class names named for the part, like [`AppList.css`](../../app/src/pages/home/AppList.css).
- **An API route:** a handler file in [`app/worker/api/`](../../app/worker/api/health.ts), and one entry in [its router](../../app/worker/api/router.ts). For an approved shared action, use [the health contract](../../app/worker/api/health.ts); [company actions](../../wiki/stack/company-api.md) owns the pattern.
- **A mini app:** copy the example's two folders, [`app/src/apps/hello/`](../../app/src/apps/hello/App.tsx) and, for a server side, [`app/worker/apps/hello/`](../../app/worker/apps/hello/api.ts). The page is `App.tsx`, with `app.json` and its CSS beside it; an API route is a handler file and one entry in `api.ts`'s route list. No other file needs an edit.

The [`npm test` chain](../../app/package.json) owns all numeric limits and enforces them in CI, which is [the gate](../../wiki/development/the-change-loop.md#the-gate); nothing builds locally.

## Sample data and timed jobs

- **A change that adds or alters a feature adds the made-up rows its scenarios need** to [`schema/seed.sql`](../../schema/seed.sql), in the same change: realistic in shape, no real person's details. The check before publishing starts from [the seed](../../wiki/stack/d1-pipeline.md#seeded-staging-production-untouched), so a scenario with no sample data goes unchecked.
- **A new scheduled job gets a manual trigger**, reachable on staging only, that calls the same function as `scheduled()`: the check runs the job by hand, and [only the timetable goes untested](../../wiki/stack/staging-bindings.md#cron-triggers-inherit-omitting-them-does-not-disable-them).

Never loosen a check silently: a skip comment, a skipped or deleted test, or a changed check setting needs a `Check:` bullet in the change's Decision log, as [a loosened check needs a reason](../../wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason) says.

If your target uses other code paths, adjust the `paths:` list to match its layout.
