<!-- openspec-archive v1 2026-08-06-browser-run-testing -->
<!-- file proposal.md utf8 5302 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 7544 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 2711 -->
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

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 1559 -->
# cloudflare-provisioning — delta

## ADDED Requirements

### Requirement: The widen covers the walkthrough's browser

The token widen SHALL include the **Browser Rendering Edit** permission group in the widened policy set, resolved by name at runtime like every other group, so the same `CLOUDFLARE_API_TOKEN` the pack provisions can open Browser Run sessions for the staging walkthrough. The grant SHALL be unconditional — not gated on whether the repo has adopted the walkthrough — because the permission costs nothing, the widen is already pre-authorized, and gating would couple provisioning to walkthrough detection. The narrow-back offer SHALL cover this group like any other the skill granted.

#### Scenario: A fresh provisioning run grants the browser permission

- **WHEN** `/wong-cloudflare` widens a newly provided two-permission token
- **THEN** the widened set includes Browser Rendering Edit alongside the other granted groups
- **AND** the post-widen report names it

#### Scenario: A re-run repairs an older token

- **WHEN** `/wong-cloudflare` re-runs in a repo whose token was widened before this group existed in the set
- **THEN** the widen adds Browser Rendering Edit to the existing policy set
- **AND** a subsequent `/walk` can authenticate to Browser Run without any manual grant

#### Scenario: Narrowing back removes it too

- **WHEN** the user accepts the offer to narrow the token back down
- **THEN** Browser Rendering Edit is removed along with the other granted groups
- **AND** the two original API-token groups remain

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 4911 -->
# staging-walkthrough — delta

## MODIFIED Requirements

### Requirement: Adoption is detected from state, never configured

Within a stack-pack repo the walk SHALL be opt-in, and consent SHALL be inferred from observable repo state rather than from a flag: `playwright-core` — or `playwright`, so earlier adopters remain adopted — present in the app's `devDependencies` means this repo adopted the walkthrough. There SHALL be no manifest field, no config file, and no skill argument that enables or disables it. Adding the dependency SHALL be the entire opt-in: no browser install step exists, because the browser is remote.

The walkthrough SHALL NEVER install `playwright-core`, `playwright`, a browser, or any other dependency — not as a convenience, not on a prompt, not "while we're here." A missing dependency is a statement that the repo did not opt in, or (once it has) a condition to report, never a condition to fix.

#### Scenario: A repo that never opted in

- **WHEN** `/walk` is invoked in a repo whose app has neither `playwright-core` nor `playwright` as a devDependency
- **THEN** the verdict is `NONE` and the skill reports that the repo has not adopted the walkthrough
- **AND** nothing is installed and no other skill's behavior changes

#### Scenario: Adding the dependency is the whole opt-in

- **WHEN** a repo adds `playwright-core` to its app's `devDependencies` and installs its node modules
- **THEN** the next `/walk` walks with nothing else configured and no browser installed on the machine

#### Scenario: Earlier adopters stay adopted

- **WHEN** a repo that opted in under the old signal still has `playwright` (not `playwright-core`) in its `devDependencies`
- **THEN** the walk treats the repo as adopted and walks against the remote browser
- **AND** no migration of the dependency is required or prompted for

#### Scenario: The walkthrough never installs its own dependency

- **WHEN** the walk finds the dependency declared but its node modules not installed
- **THEN** it does not run any install command
- **AND** it reports the condition as a verdict rather than repairing it

## ADDED Requirements

### Requirement: The browser is remote, reached with the pack's credential

The walk SHALL drive a browser session on Cloudflare Browser Run, attached over CDP from the local runner (`connectOverCDP` against `wss://api.cloudflare.com/client/v4/accounts/{account_id}/browser-rendering/devtools/browser`, authenticated with `CLOUDFLARE_API_TOKEN` as a Bearer header). No browser binary SHALL be launched, required, or looked for on the machine running the walk. The journeys, the evidence directory, and the grading SHALL remain local and unchanged: only the browser process moves.

The runner SHALL open one Browser Run session per journey, so a session-duration limit bounds one journey's evidence rather than the walk, and concurrent-browser limits are never exceeded by a single walk.

Preflight SHALL verify the credential instead of a binary: once the dependency signals adoption, a missing `CLOUDFLARE_API_TOKEN`, an unresolvable account id, or an endpoint refusal (auth failure, plan limit) SHALL each produce `UNKNOWN` with the specific remedy named — the credentials page for a missing token, a `/wong-cloudflare` re-run for a token lacking the Browser Rendering permission, the plan's limits page when the daily browser budget is exhausted. None of these SHALL be reported as a failing application.

#### Scenario: No browser on the machine

- **WHEN** `/walk` runs on a machine with no Chromium installed anywhere
- **THEN** the walk proceeds normally against the remote browser
- **AND** preflight performs no browser-binary check

#### Scenario: Token missing

- **WHEN** the dependency signals adoption but `CLOUDFLARE_API_TOKEN` is empty or absent
- **THEN** the verdict is `UNKNOWN`, naming the token and pointing at where the credential convention documents it
- **AND** nothing is walked and nothing is installed

#### Scenario: Token lacks the Browser Rendering permission

- **WHEN** the endpoint answers the runner's connection with an authorization failure
- **THEN** the verdict is `UNKNOWN`, and the report names re-running `/wong-cloudflare` (whose widen grants the permission) as the fix
- **AND** the failure is reported as unrunnable infrastructure, never as a failing journey

#### Scenario: A session dies mid-walk

- **WHEN** a Browser Run session ends while a journey is in flight
- **THEN** that journey's evidence records the error and the remaining journeys run on fresh sessions
- **AND** one lost session does not cost the walk

#### Scenario: Video degrades honestly

- **WHEN** video recording is unavailable over the remote CDP attachment
- **THEN** the walk still runs, captures screenshots, and the evidence comment states that video was unavailable and why
- **AND** the absence of video does not change any verdict

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-06

~~~
<!-- end .openspec.yaml -->
