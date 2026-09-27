---
paths: ["app/**", "mini-apps/**", "scripts/**", ".github/workflows/**"]
---

# Write less code

Write the least code that does the job, and write no code that does not. Decompose branchy logic into named helpers as you write it. Prefer a surgical edit to a file rewrite. Do not use `any`; use `unknown` only when you narrow it before use.

## Where things go

Follow the files that already do it. Split by job, not by size: each file does one thing and is named for it.

- **A page:** a folder in [`app/src/pages/`](../../app/src/pages/home/Home.tsx), and one entry in [`app/src/router.tsx`](../../app/src/router.tsx).
- **A part used by one page:** in that page's folder. It moves to `app/src/components/` when a second page uses it.
- **Data and helpers with no UI:** [`app/src/lib/`](../../app/src/lib/apps.ts).
- **Styles:** the shared look is [`app/public/style.css`](../../app/public/style.css), the only file that styles whole elements. A part's CSS sits beside it, under class names named for the part, like [`AppList.css`](../../app/src/pages/home/AppList.css).
- **An API route:** a handler file in [`app/worker/api/`](../../app/worker/api/health.ts), and one entry in [its router](../../app/worker/api/router.ts).
- **A mini app:** copy [`mini-apps/apps/hello/`](../../mini-apps/apps/hello/api.mjs). Page markup goes in `index.html`, the page script in `app.js`, tested logic in named `.mjs` modules, API routes in `api.mjs`'s route list, and the app's own styles in `style.css`.

The [`npm test` chain](../../app/package.json) owns all numeric limits and enforces them in CI, which is [the gate](../../wiki/development/the-change-loop.md#the-gate); nothing builds locally.

Never loosen a check silently: a skip comment, a skipped or deleted test, or a changed check setting needs a `Check:` bullet in the change's Decision log, as [a loosened check needs a reason](../../wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason) says.

If your target uses other code paths, adjust the `paths:` list to match its layout.
