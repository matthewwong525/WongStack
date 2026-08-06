---
slug: browser-run-testing
started: 2026-08-06
updated: 2026-08-06
consolidated:
---

# Browser Run testing — moving /walk's browser to Cloudflare

The user's opening instinct: `/walk` and "integration testing in general" should use Cloudflare
Browser Run with Playwright, because the local installation is the easy-to-get-wrong part. That
diagnosis held up all the way through: the ~150MB `npx playwright install chromium` step was the
walkthrough's only machine-mutating prerequisite and its most common failure.

## What the session established (beyond the change's own Decision log)

- **"Playwright" is two separable things** — the pure-JS client library and the Chromium binary it
  drives. Browser Run replaces only the binary; every agentic part of `/walk` (scouted journeys,
  local evidence, grading against the verbatim THEN) is library-side and unchanged. This framing is
  what resolved the user's "what's the use of Browser Run if we already use Playwright" question,
  and it's reusable whenever someone proposes a remote-browser service.
- **Browser Run facts** (as of 2026-08): renamed from Browser Rendering; external CDP endpoint is
  `wss://api.cloudflare.com/client/v4/accounts/{account}/browser-rendering/devtools/browser` with
  Bearer auth and a `keep_alive` ms param; `playwright-core` + `connectOverCDP` is Cloudflare's
  documented path for local/CI use. Free plan ≈10 browser-min/day, 3 concurrent; Workers Paid
  includes 10 h/month then ~$0.09/h; concurrent-browser billing is the monthly average of daily
  peaks. `@cloudflare/playwright` v1.3.0 (based on Playwright 1.58.2) speaks standard CDP
  internally but remains Workers-binding-only and lists Videos as unsupported.
- **The user floated, and we ruled out with reasons**: using the `@cloudflare/playwright` fork
  (wrong environment, no video); running the walk inside a deployed Worker triggered from GitHub
  Actions (a deploy cycle per walk, evidence stranded remotely, collides with never-writes-in-repo);
  moving `/walk` itself into Actions (the agent authors journeys and grades screenshots, so the
  thin runner belongs next to the agent). The user accepted "keep everything, swap one line."
- **CI e2e tests on Browser Run is the agreed follow-up**, deliberately unbundled: a committed
  Playwright suite in GitHub Actions pointed at the same endpoint, using the
  `CLOUDFLARE_API_TOKEN` secret the pack already sets — no browser install in CI. Noted in
  `wiki/stack/staging-walkthrough.md` under "not a test suite."

## Session-specific findings a future thread may need

- This worktree's `.env` token connects to Browser Run fine but **cannot** hit
  `/user/tokens/verify` or list permission groups — it isn't the pack's canonical two-group
  self-widening token. That's why `permission-groups.md` gained the `Browser Rendering Write` row
  with *resolve by name* instead of a verified id; a session holding a proper token could fill the
  id in.
- Spike method (throwaway, `/tmp`): `npm i playwright-core`, `connectOverCDP`, one recorded journey
  → `VIDEO_OK`. Bad-token failure surfaces as `401 Unauthorized` plus
  `{"code":10000,"message":"Authentication error"}` embedded in the Playwright error string.
- `.env.example` had two stale references to `wiki/stack/ship-walkthrough.md` (the page is
  `staging-walkthrough.md`); fixed in passing while editing those comment blocks.
