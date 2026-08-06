# Tasks: browser-run-testing

## 1. Spike (decides D5 before anything ships)

- [x] 1.1 Verify `recordVideo` over `connectOverCDP` against Browser Run: with `CLOUDFLARE_API_TOKEN` from `.env`, run one throwaway recorded journey (temp dir, not in the repo) and check a playable `.webm` lands; also note the effective session-duration ceiling and any auth/limit error shapes seen. Record the outcome in the change's Decision log — it selects the video path in 2.1 and the documented limits in 4.2.

## 2. Walk scripts

- [x] 2.1 `walk-runner.mjs`: resolve `playwright-core` (falling back to `playwright`) from the app; replace `chromium.launch()` with per-journey `connectOverCDP` sessions per design D2 (Access probe on the first session; a dead session records the journey's error and later journeys get fresh sessions); map endpoint auth failure to exit 2 with a message naming the `/wong-cloudflare` widen. Keep `recordVideo` if the spike passed, else skip it and mark video unavailable in the evidence manifest.
- [x] 2.2 `walk-staging.sh`: `find_app_dir` accepts `playwright-core` or `playwright`; replace the browser-binary preflight check with credential checks per design D3 (token present → account id resolvable), each miss an `UNKNOWN` naming its remedy.

## 3. Walk skill prose

- [x] 3.1 `SKILL.md`: description + hard rules reflect the remote browser (no install step exists; "never install" stays); the `UNKNOWN` table row examples cover missing token / unwidened token / exhausted plan budget.
- [x] 3.2 `references/walkthrough.md`: journeys unchanged in shape; note per-action latency headroom under the 15s step timeout, and the video-unavailable wording for the evidence comment when D5 degraded.

## 4. Cloudflare pack

- [x] 4.1 `wong-cloudflare/references/permission-groups.md`: add Browser Rendering Edit to the widen set per the delta spec (unconditional; covered by narrow-back).
- [x] 4.2 `wiki/stack/staging-walkthrough.md`: rung 1 becomes `npm i -D playwright-core` alone; delete the `npx playwright install chromium` step; document Browser Run limits (free ~10 browser-min/day, 3 concurrent; Workers Paid 10 h/month, then $0.09/h) with numbers confirmed by the spike; note the CI-suite-on-Browser-Run follow-up and the Access-policy-by-IP caveat.
- [x] 4.3 `.env.example`: extend the `CLOUDFLARE_API_TOKEN` comment — the token now also opens Browser Run sessions for `/walk`.

## 5. Release

- [x] 5.1 `CHANGELOG.md` entry (what changed, why the install step is gone, what an existing adopter does: nothing, or re-run `/wong-cloudflare` if the walk reports an unwidened token) + `VERSION` minor bump.
- [x] 5.2 `node scripts/check-payload-links.mjs` passes with no dead links.
