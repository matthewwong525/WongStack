# Proposal: browser-run-testing

**Status:** ready-to-ship
**Open questions:** none

## Why

`/walk`'s adoption rung has one step that regularly goes wrong: `npx playwright install chromium` downloads a ~150MB browser, mutates the machine rather than the repo, breaks on servers and sandboxes missing system libraries, and is the step people skip — producing the preflight's whole "declared but not installed" `UNKNOWN` branch. Cloudflare Browser Run (the renamed Browser Rendering) exposes a CDP WebSocket endpoint that stock `playwright-core` — a pure-JS package with no bundled browsers — can attach to from any Node process, using the `CLOUDFLARE_API_TOKEN` the stack pack already provisions. The heavy half of Playwright moves to Cloudflare's edge; everything agentic about the walk (scouted journeys, local evidence, agent grading) stays exactly where it is.

## What Changes

- `walk-runner.mjs` connects to Browser Run via `chromium.connectOverCDP(wss://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/browser-rendering/devtools/browser)` with a Bearer `CLOUDFLARE_API_TOKEN`, instead of `chromium.launch()` on a local binary. One Browser Run session per journey, matching the existing one-context-per-journey structure and staying inside per-session duration limits.
- The opt-in signal becomes `playwright-core` in the app's `devDependencies`; `playwright` remains accepted so existing adopters don't silently go dark. **The `npx playwright install chromium` step is deleted from the adoption rung** — `npm i -D playwright-core` is the whole opt-in.
- `walk-staging.sh` preflight replaces the browser-binary check with credential checks: `CLOUDFLARE_API_TOKEN` present and an account id resolvable. Missing or under-permissioned credentials are `UNKNOWN` (adopted but unrunnable), with the fix named — same shape as today's missing-binary path.
- `wong-cloudflare`'s token self-widen set gains the **Browser Rendering ▸ Edit** permission group, so a pack repo's token can drive Browser Run without a manual grant.
- Early spike task: verify `recordVideo` works over `connectOverCDP` against Browser Run; if it doesn't, the walk degrades to screenshots-only and the evidence comment says so (media is corroboration, not the record).
- Docs: walk `SKILL.md` + `references/walkthrough.md`, `wiki/stack/staging-walkthrough.md` adoption rungs (including free-plan limits: ~10 browser-minutes/day, 3 concurrent), `.env.example` comment on what the token now also enables, `wong-cloudflare/references/permission-groups.md`.
- Payload release: `VERSION` bump + `CHANGELOG.md` entry + `node scripts/check-payload-links.mjs`.

**Non-goals:** the `@cloudflare/playwright` Workers fork (Workers-only, no video); Worker-resident or cron-driven walking; moving `/walk` into GitHub Actions (the walk is agent-driven at both ends); a CI integration-test suite on Browser Run — noted as a natural follow-up, not in scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: the browser is remote (Browser Run via CDP), never installed; the consent signal is `playwright-core` (or `playwright`) in `devDependencies` with no install step; preflight verifies credentials instead of a binary; video degrades honestly if unsupported over remote CDP.
- `cloudflare-provisioning`: the token widen set includes Browser Rendering Edit, so the pack's credential covers the walkthrough's browser.

## Impact

- `.claude/skills/walk/scripts/walk-runner.mjs`, `.claude/skills/walk/scripts/walk-staging.sh`, `.claude/skills/walk/SKILL.md`, `.claude/skills/walk/references/walkthrough.md`
- `.claude/skills/wong-cloudflare/references/permission-groups.md`
- `wiki/stack/staging-walkthrough.md`, `.env.example`
- `VERSION`, `CHANGELOG.md` (payload edit = release)
- New runtime dependency for adopters: a Cloudflare account with Browser Run enabled and a token holding Browser Rendering Edit; free-plan limits apply (~10 min/day, 3 concurrent browsers; Workers Paid includes 10 h/month).

## Decision log

- **2026-08-06** — Explored (`/explore`), planned, and implemented in one session; all 10 tasks done, v9.4.0. The spike settled the two unknowns up front: **`recordVideo` works over `connectOverCDP`** against Browser Run (playable 54KB `.webm`, Chromium 128, ~4s connect), so the video path ships unchanged; and a bad token fails with `401 Unauthorized` + Cloudflare's auth-error JSON inside the Playwright error message, which is what the runner's exit-4 detection matches on. Deviation from the drafted design: auth refusal is a dedicated **exit 4** (parallel to 3 for Access) rather than exit 2, so `walk-staging.sh` can name the widen remedy — design.md updated. Ruled out along the way: `@cloudflare/playwright` (Workers-binding-only, video explicitly unsupported), Worker-resident walking (adds a deploy per walk, strands evidence remotely), `/walk`-in-Actions (agent-authored journeys and grading live with the agent). Couldn't record a verified id for the `Browser Rendering Write` permission group — this worktree's `.env` token lacks token-management permissions to list groups — so the reference records the row with *resolve by name*, which is the protocol's lookup path anyway. CI-suite-on-Browser-Run noted as follow-up in the wiki.
