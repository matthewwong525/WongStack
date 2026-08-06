# Design: browser-run-testing

## Context

`/walk` drives agent-authored Playwright journeys against the deployed staging preview. Today the browser is a locally-installed Chromium: `walk-runner.mjs` resolves `playwright` from the app's `node_modules` and calls `chromium.launch()`, and `walk-staging.sh` preflight checks `chromium.executablePath()` exists on disk. The install step (`npx playwright install chromium`) is the walkthrough's one machine-mutating prerequisite and its most error-prone: skipped by fresh adopters, broken in containers and sandboxes missing system libraries, and the reason preflight carries a "declared but not installed" `UNKNOWN` branch.

Cloudflare Browser Run (formerly Browser Rendering) exposes an external CDP WebSocket endpoint — `wss://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/browser-rendering/devtools/browser` — that stock `playwright-core` attaches to with `connectOverCDP` and a Bearer token. `/walk` is already stack-pack-only, and the pack already owns `CLOUDFLARE_API_TOKEN` (in `.env` and as a GitHub secret) plus a self-widening permission protocol.

## Goals / Non-Goals

**Goals**

- Delete the browser install from the adoption rung: `npm i -D playwright-core` is the whole opt-in.
- Keep the walk's agentic structure byte-for-byte: agent-scouted journeys in the temp run dir, evidence on local disk, agent grading against the verbatim `THEN`.
- Reuse the pack's credential: the token widen covers Browser Rendering, no new secret.
- Keep existing adopters walking: `playwright` in `devDependencies` still counts as consent.

**Non-Goals**

- The `@cloudflare/playwright` Workers fork — it targets code running *inside* a Worker via a browser binding, explicitly does not support video, and solves a runtime constraint the local Node runner doesn't have.
- Worker-resident or cron-driven walking, and moving `/walk` into GitHub Actions — the walk is agent-driven at both ends (journey authoring and grading), so relocating the thin runner buys nothing.
- A committed CI integration-test suite on Browser Run — the natural follow-up (same endpoint, same secret, from Actions), deliberately a separate change.

## Decisions

### D1: `playwright-core` + `connectOverCDP`, not the Cloudflare fork

The runner keeps the standard Playwright API — journeys don't change shape — and swaps only the attach: `chromium.launch()` → `chromium.connectOverCDP(endpoint, { headers: { Authorization: Bearer } })`. `playwright-core` is the no-bundled-browsers variant, which is exactly the point; it's also what Cloudflare documents for local/CI use. The fork is rejected (see Non-Goals). The runner accepts either `playwright-core` or `playwright` from the app's `node_modules`, preferring `playwright-core`, resolved from the app as today — the declared dependency remains the thing that runs.

### D2: One Browser Run session per journey

Browser Run sessions have duration limits (`keep_alive` capped around minutes, exact ceiling to confirm in the spike). The runner already opens one context per journey; this moves the boundary one level up — one `connectOverCDP` per journey, closed after the journey's context flushes. A 10-minute walk budget never rides a single session, and a mid-walk session death costs one journey's evidence, not the walk. The Access-challenge probe runs on the first session before any journey, as today.

### D3: Preflight checks credentials, not binaries

The `chromium.executablePath()` check is replaced by: dependency declared (`playwright-core` or `playwright`) → `CLOUDFLARE_API_TOKEN` non-empty in the environment/`.env` → account id resolvable (same route the pack uses; cache-free, one API call). Each missing piece is `UNKNOWN` with the fix named — token absent points at `.env.example`/the credentials page; a 401/403 from the endpoint points at re-running `/wong-cloudflare` so the widen grants Browser Rendering Edit. `NONE` (no dependency, never opted in) is unchanged and stays silent. The runner maps an endpoint auth failure to a dedicated exit code 4 (parallel to 3 for the Access challenge), which `walk-staging.sh` turns into an `UNKNOWN` naming the widen, so a stale token reads as "unrunnable, here's why," never as a failing page.

### D4: The widen gains Browser Rendering Edit unconditionally

`wong-cloudflare`'s widen set adds the **Browser Rendering ▸ Edit** permission group (resolved by name at runtime, per the existing protocol). Unconditional rather than gated on walkthrough adoption: the permission is free, the widen is already pre-authorized, and gating it would couple the provisioning skill to walkthrough detection for no benefit. The narrow-back offer covers it like every other granted group.

### D5: Video is attempted, verified by spike, and degrades honestly

Playwright encodes video client-side from CDP screencast frames, so `recordVideo` *should* survive `connectOverCDP` — but Cloudflare doesn't document it and remote-CDP feature gaps are a known Playwright rough edge. Task 1 is a spike: run one recorded journey against Browser Run and check a playable `.webm` lands. If it works, nothing changes. If not, the runner skips `recordVideo`, `record.video` stays `null`, and the evidence comment states "video unavailable over Browser Run — screenshots only." The wiki already treats media as corroboration, not the record, so this is a rung down, not a blocker.

### D6: Consent signal widens; nothing else about detection changes

`find_app_dir` greps for `"playwright-core"` or `"playwright"` (the latter substring-matches both, so the grep is effectively one pattern — keep both spellings explicit for the reader). No manifest field, no config, no flag — the spec's "detected from state, never configured" requirement holds; only the state observed changes.

## Risks / Trade-offs

- [Video unsupported over remote CDP] → D5's spike is task 1; screenshots-only degrade path specified up front.
- [Free-plan limits: ~10 browser-min/day, 3 concurrent] → documented on the adoption rung; one session per journey keeps concurrency at 1. A budget-exhausted plan surfaces as endpoint refusal → `UNKNOWN` with the limit named, not a fake failure.
- [Per-action network latency to the edge] → journeys are short; the existing 15s step timeout has headroom. Note in the walkthrough reference that step timeouts now include a round trip.
- [Existing adopters' tokens lack Browser Rendering Edit] → preflight/runner name the fix (`/wong-cloudflare` re-run widens); the widen is one re-run, not a manual grant.
- [Remote browser egress origin changes] → the preview is public or Access-walled; Access service-token headers ride `extraHTTPHeaders` unchanged. Access policies keyed to IP (none in the payload) would need review — noted in docs.

## Migration Plan

Payload release (minor bump): existing target repos pick it up via `/wong-sync`, which never overwrites — repos with a customized walk keep theirs; the changelog entry explains the swap and the deleted install step. A repo that stays on old payload keeps walking locally; nothing breaks in either direction. Rollback is reverting the payload files — no data, no provisioned resources (the widen leaves a harmless extra permission group, removable via the narrow-back offer).

## Open Questions

- Exact `keep_alive`/session-duration ceiling and whether the free plan's daily minutes are metered per session or per wall-clock — confirm during the spike; affects only the documented limits, not the design.
