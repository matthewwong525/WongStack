<!-- openspec-archive v1 2026-08-09-walk-self-healing -->
<!-- file proposal.md utf8 5822 -->
# Walk self-healing

**Status:** ready-to-ship
**Open questions:** none

## Why

`/walk` spends its most expensive steps before it knows whether they are necessary, and it stops on conditions it already holds the credentials to fix. A pure-backend change pays for a full `/save` (push + CI wait) and a credential preflight only to learn there was nothing browser-observable to walk. A token that Browser Run refuses, or an Access login wall with no service token, each end the walk as `UNKNOWN` with a "go run `/wong-cloudflare`" message — even though the widen is pre-authorized and the walk holds the same `CLOUDFLARE_API_TOKEN` that can grant the permission or mint the token. And a `FAILURE` always stops, even when the broken behavior is squarely inside the change the session is already working on.

## What Changes

- **Scout first.** `/walk` reads the change's scenarios and decides walkability *before* invoking `/save` and before any credential preflight. Nothing browser-observable → `NONE` immediately, at near-zero cost.
- **Self-resolve access blocks, once each.** When Browser Run refuses the token (never widened into Browser Rendering Edit), `/walk` runs the pre-authorized widen protocol itself and retries. When the walk lands on the Access login wall with no service-token pair in the durable `.env`, `/walk` mints a service token via the API token, ensures the Access policy accepts it, stores the pair per the secrets convention, and retries. One heal-and-retry per block; a second refusal is `UNKNOWN` with the specific reason, as today.
- **Bounded in-scope fix loop on `FAILURE`.** When a failed journey traces to this change's own code, `/walk` resets staging, fixes the code, re-saves, and re-walks — at most 2 fix attempts. An out-of-scope failure keeps today's behavior exactly: reset, report, stop.
- Payload edit → `VERSION` bump, `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` run.

**Non-goals:** no change to what gets walked (still this change's scenarios only), no change to the non-gating stance, no new credentials or manifest fields, never installing anything, and no unbounded retry of any kind.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `staging-walkthrough`:
  - "/walk begins by invoking /save" — reordered: the scout runs first; `/save` and preflight run only when at least one browser-observable journey exists.
  - "The browser is remote, reached with the pack's credential" — a Browser Run auth refusal triggers one self-widen and retry before `UNKNOWN`; the `UNKNOWN` remedy text changes accordingly.
  - "Verdicts report, and gate nothing" — the Access-challenge scenario gains the mint-and-retry step before `UNKNOWN`.
  - "A failed walk resets staging, then stops" — becomes "resets staging, then fixes in scope or stops": bounded fix loop for in-scope failures, unchanged stop for out-of-scope ones.

## Impact

- `.claude/skills/walk/SKILL.md` — step order, healing steps, failure loop.
- `.claude/skills/walk/references/walkthrough.md` — scout timing, scope judgement for the fix loop.
- `.claude/skills/walk/scripts/walk-staging.sh` — preflight split so the scout can run before credential checks; distinct exit signals for "Browser Run refused token" vs other `UNKNOWN`s (the runner already exits 3 on the Access challenge).
- `wiki/stack/staging-walkthrough.md` — runbook order, healing behavior, fix-loop bounds.
- `VERSION`, `CHANGELOG.md`.
- Depends on nothing new: the widen protocol lives in `.claude/skills/wong-cloudflare/references/permission-groups.md` and is already pre-authorized; the Access token mint uses the Cloudflare API the pack already talks to.

## Decision log

- **2026-08-09** — Planned and implemented in one session, 13/13 tasks. Three findings shaped the build. **The two heal signals already existed:** `walk-runner.mjs` exits 3 on an Access challenge and 4 on a Browser Run token refusal, so no new detection was needed — only the repair, which the skill now owns while the script stays credential-free and side-effect-free (it reports `BLOCK=access-challenge` / `BLOCK=browser-run-refused` as causes rather than dead ends). **The scout split cleanly:** rather than reordering `preflight` internally, the script gained a `scout-check` phase that answers adoption only, touching no credential, API, or network — verified returning `NONE` in this repo. Preflight keeps the library, token, account, and URL checks, and now runs only once journeys exist. **Authorization was already recorded:** both repairs run under `cloudflare-credentials.md#the-widen-is-pre-authorized`, the same standing permission `/wong-cloudflare` uses, so nothing new is asked of the user. Bounds are stated as decisions, not implementation details — one heal + one retry per block, two fix attempts per walk — on the reasoning that an agent which keeps fixing until something passes will eventually pass something, and the walk's whole value is willingness to report a failure. The wiki's "no automatic retry" text was revised rather than deleted, and a new declined-option entry records why the bounds exist. `VERSION` 9.7.0 → 9.8.0; `check-payload-links.mjs` passes all four install shapes with no dead links.
- **2026-08-09** — Shipped. `/ship` archived the change to `openspec/changes/archive/2026-08-09-walk-self-healing/` and delegated this checkpoint; the delta specs were already folded into `openspec/specs/staging-walkthrough/` by the preceding `/save`, so the archive step re-verified rather than re-synced. Merged to `main` as v9.8.0 via PR #58. The companion change `ship-walks-and-ci-tests` (PR #59) was branched on top of this one rather than off `main`, because both edit `.claude/skills/walk/SKILL.md` and `wiki/stack/staging-walkthrough.md`; it merges next.

<!-- end proposal.md -->
<!-- file design.md utf8 7059 -->
# Design — walk-self-healing

## Context

Today `/walk` runs in this order: `/save` (push, CI wait, preview URL) → credential preflight (`walk-staging.sh preflight`) → scout scenarios into journeys → run → grade. The scout is the only cheap, local step, and it runs last. The script already emits `NONE` when the scout finds nothing browser-observable — but only after the save and preflight costs are paid.

Two access blocks currently end a walk as `UNKNOWN` with a manual remedy:

1. **Browser Run refuses the token** (401/403 on the CDP endpoint — the token was never widened into Browser Rendering Edit). Remedy today: "re-run `/wong-cloudflare`". The widen protocol (`.claude/skills/wong-cloudflare/references/permission-groups.md`) is recorded as pre-authorized: pasting the two-permission token *is* the authorization to widen.
2. **Cloudflare Access login wall** with no `CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET` in the durable `.env`. The runner detects the wall (exit 3). Remedy today: set the variables by hand per `wiki/stack/cloudflare-access.md`.

On `FAILURE`, the skill resets staging and stops unconditionally; the user fixes and re-invokes.

## Goals / Non-Goals

**Goals:**
- A pure-backend change exits `NONE` before any push, CI wait, or credential check.
- The walk resolves the two access blocks it holds credentials for — once each, then honest `UNKNOWN`.
- An in-scope `FAILURE` gets a bounded fix-and-re-walk loop instead of an unconditional stop.

**Non-Goals:**
- No change to the non-gating stance, the scenario scope, evidence capture, grading, or PR-comment behavior.
- No new credentials, env variables, or manifest fields.
- Never installing anything; never widening beyond what the walk needs.
- No unbounded loops anywhere.

## Decisions

**D1 — Scout before save, using the working tree.** The scout reads `openspec/changes/<slug>/specs/**` plus touched synced specs — all local files that do not depend on the push having happened. Reordering to scout → (journeys exist?) → `/save` → preflight → run changes no scout input. Alternative considered: keep the order and accept the cost — rejected; the whole point is that "nothing to walk" should cost nothing. Edge: when the scout finds journeys, `/save` still runs before anything remote, so the preview-URL invariant ("walk the commit CI published") is untouched.

**D2 — Split preflight so credential checks are separable from scout inputs.** `walk-staging.sh` gains a `scout-check` entry (or the SKILL reorders its calls) so the `NONE`-for-no-journeys answer no longer requires token resolution. The script keeps printing the same `RESULT:` vocabulary; only the order of evaluation moves.

**D3 — Self-widen on Browser Run refusal, by reusing the recorded protocol.** On the CDP 401/403 (the runner already distinguishes this message), the skill follows `permission-groups.md`: resolve the group id for Browser Rendering by name, `PUT` the widened set preserving existing groups, re-verify, retry the walk once. Authorization argument: the wiki records the widen as pre-authorized for `/wong-cloudflare`; the walk uses the same token under the same standing authorization, and reports what it granted, same as the widen step does. Alternative: invoke the whole `/wong-cloudflare` skill — rejected; it is the provisioning door and does far more than one permission grant.

**D4 — Mint the Access service token on the wall, store per secrets convention.** On runner exit 3 with no `CF_ACCESS_*` pair: create a service token via the Cloudflare Access API (named for the repo, e.g. `wongstack-walk-<repo>`), attach/confirm it in the Access policy per `wiki/stack/cloudflare-access.md`, write the pair into the **primary worktree's** durable `.env` (the secrets convention's store — never a linked-worktree copy, never printed), add nothing to `.env.example` (the declarations already exist there), then retry once. If the API token lacks the Access permission groups, that is itself a Browser-Run-style refusal: apply D3's widen for the Access groups first, still within the single heal-and-retry budget for this block. Alternative: only point at the docs — rejected by this change's premise.

**D5 — One heal-and-retry per block, then `UNKNOWN`.** Each block (Browser Run refusal, Access wall) gets exactly one heal attempt and one retry. A second occurrence of the same block reports `UNKNOWN` naming what was attempted and what still failed. This keeps the honesty rules: unverified stays unverified, and there is no loop that can burn browser minutes or API calls indefinitely.

**D6 — Fix loop bounds and the scope test.** On `FAILURE`: reset staging (unchanged), then judge scope — a failure is **in scope** when the contradicted `THEN` belongs to this change's own scenarios *and* the fix plausibly lives in files this branch already touches. In scope → fix, invoke `/save` (which re-pushes and re-gates), re-walk; at most **2** fix attempts per `/walk` invocation, then stop and report like today. Out of scope (pre-existing behavior, infra, another capability's scenario) → reset, report, stop — exactly today's behavior. The scope judgement is stated in the report either way, so a reader can contest it. Alternative: always fix — rejected; a walk that silently patches pre-existing behavior widens the change beyond its plan.

**D7 — Verdict vocabulary unchanged.** `NONE`/`SUCCESS`/`FAILURE`/`UNKNOWN`/`TIMEOUT` keep their meanings; healing and fixing happen *between* verdicts, and the final report states what was healed or fixed. `/ship` integration is deliberately left to the companion change (`ship-walks-and-ci-tests`).

## Risks / Trade-offs

- [Widen from a non-provisioning skill surprises a reader] → The report names the exact permission granted and links the standing-authorization section, same as `/wong-cloudflare` does.
- [Minted Access token accumulates if walks are torn down] → Name it deterministically per repo so re-mints reuse/replace rather than pile up; the pack's teardown already owns removal of what the pack created — add the walk token to its inventory.
- [Fix loop re-saves push commits the user didn't review] → Already true of `/save`'s CI auto-fix; the walk report lists each fix commit. Bound of 2 keeps the blast radius small.
- [Scope judgement is fuzzy] → It is stated, bounded (2 attempts), and errs toward stopping; ambiguous evidence still stops and asks, per the existing rule.
- [Scout-first re-order walks stale specs if the tree is dirty] → The scout reads the same working tree the subsequent `/save` will commit, so journey inputs and the deployed commit stay in sync.

## Migration Plan

Payload edit, single release: bump `VERSION` (minor), add the `CHANGELOG.md` entry, run `node scripts/check-payload-links.mjs`. Target repos receive it through `/wong-sync` as usual; no target action required (the heal paths activate only when their blocks occur).

## Open Questions

(none — bounds and authorization sources are recorded above)

<!-- end design.md -->
<!-- file tasks.md utf8 2504 -->
# Tasks — walk-self-healing

## 1. Walk skill (SKILL.md)

- [x] 1.1 Reorder the runbook: new Step 1 scouts scenarios into candidate journeys (local files only); `NONE` with a one-line report when nothing is browser-observable, before any `/save` or preflight
- [x] 1.2 Move `/save` to run only when journeys exist, keeping the preview-URL invariant text
- [x] 1.3 Add the Browser Run heal step: on the endpoint's auth refusal, follow the widen protocol (link `permission-groups.md` and the standing-authorization section), retry once, report the granted permission; second refusal → `UNKNOWN` naming what was attempted
- [x] 1.4 Add the Access heal step: on the challenge with no service-token pair, mint a deterministically named token via the API token (widening into Access groups first if needed), store the pair in the primary worktree's durable `.env` per the secrets convention, retry once; surviving challenge → `UNKNOWN`
- [x] 1.5 Replace Step 5 with the scoped failure flow: reset staging, judge scope, in-scope → fix + `/save` + re-walk (max 2 attempts), out-of-scope → stop and report; the report states the scope judgement either way
- [x] 1.6 Update the description frontmatter and hard rules (never print or commit a credential value; one heal-and-retry per block; no unbounded loops)

## 2. Walk scripts

- [x] 2.1 `walk-staging.sh`: make the scout/journey check runnable before credential resolution (split preflight or reorder), keeping the existing `RESULT:` vocabulary
- [x] 2.2 `walk-staging.sh` / `walk-runner.mjs`: distinguish "Browser Run refused the token" from other `UNKNOWN` causes with a stable signal the skill can key the widen on (runner already exits 3 for the Access challenge)

## 3. Reference and wiki

- [x] 3.1 `references/walkthrough.md`: scout-first ordering; the scope test for the fix loop; heal reporting
- [x] 3.2 `wiki/stack/staging-walkthrough.md`: update the runbook order, the two heal paths, the fix-loop bounds, and the recorded-decisions list (the "no automatic retry" decision is revised to "bounded in-scope fix loop")
- [x] 3.3 `wiki/stack/cloudflare-access.md` + `wiki/stack/cloudflare-credentials.md`: note that `/walk` may mint the service token and widen under the standing authorization; add the walk's service token to the teardown inventory in `/wong-cloudflare`

## 4. Release

- [x] 4.1 Bump `VERSION` (minor) and add the newest-first `CHANGELOG.md` entry
- [x] 4.2 Run `node scripts/check-payload-links.mjs` and fix any dead link

<!-- end tasks.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 11796 -->
# staging-walkthrough — delta for walk-self-healing

## MODIFIED Requirements

### Requirement: /walk begins by invoking /save

`/walk` SHALL scout the change's scenarios into candidate journeys **before** invoking `/save` and before any credential preflight. The scout reads only local files (the change's delta specs and any touched synced specs), so it costs no push, no CI wait, and no API call. When the scout finds no browser-observable scenario, the verdict SHALL be `NONE`, reported in one line, and `/save`, preflight, and every remote step SHALL be skipped.

When at least one journey exists, `/walk` SHALL invoke `/save` before walking, so the commit under test is pushed, CI has run, and the per-commit preview URL exists. `/walk` SHALL NOT implement any git action itself — it delegates, as `/apply` does when it hands completed work to `/save`. Because the scout reads the same working tree that `/save` then commits, the journeys and the deployed commit SHALL describe the same change.

The walk SHALL target the per-commit preview alias discovered by the existing preview-URL helper for the current head SHA. It SHALL NOT ask the user for a URL, and SHALL NOT construct one from a worker-name convention: a hand-built URL can address a commit that was never deployed and still answer `200`.

When `/save` reports that CI is absent (`NONE`), `/walk` SHALL still proceed if a preview URL can be discovered, and SHALL treat an undiscoverable URL as a condition to report rather than a URL to guess.

#### Scenario: Nothing browser-observable costs nothing

- **WHEN** `/walk` is invoked on a change whose scenarios all live off the request path (queue consumers, cron, pure backend)
- **THEN** the scout returns no journeys and the verdict is `NONE` with a one-line explanation
- **AND** no `/save`, no credential preflight, and no Browser Run session occurs

#### Scenario: Save runs first when there is something to walk

- **WHEN** `/walk` is invoked on a branch with uncommitted work and at least one browser-observable scenario
- **THEN** the scout runs, then `/save` runs — committing, pushing, waiting for CI, and resolving the preview URL
- **AND** the walk targets the URL that `/save` resolved

#### Scenario: The target URL is discovered, not configured

- **WHEN** the walk needs a URL
- **THEN** it uses the per-commit preview URL produced by the preview-URL helper for the current head SHA
- **AND** it neither prompts for a URL nor derives one from a naming convention

#### Scenario: No discoverable preview URL

- **WHEN** the repo's CI does not deploy, so no preview URL exists for this commit
- **THEN** the verdict is `UNKNOWN` and the report names the missing deployment as the cause
- **AND** no URL is guessed

### Requirement: The browser is remote, reached with the pack's credential

The walk SHALL drive a browser session on Cloudflare Browser Run, attached over CDP from the local runner (`connectOverCDP` against `wss://api.cloudflare.com/client/v4/accounts/{account_id}/browser-rendering/devtools/browser`, authenticated with `CLOUDFLARE_API_TOKEN` as a Bearer header). No browser binary SHALL be launched, required, or looked for on the machine running the walk. The journeys, the evidence directory, and the grading SHALL remain local and unchanged: only the browser process moves.

The runner SHALL open one Browser Run session per journey, so a session-duration limit bounds one journey's evidence rather than the walk, and concurrent-browser limits are never exceeded by a single walk.

Preflight SHALL verify the credential instead of a binary: once the dependency signals adoption, a missing `CLOUDFLARE_API_TOKEN`, an unresolvable account id, or a plan-limit refusal SHALL each produce `UNKNOWN` with the specific remedy named — the credentials page for a missing token, the plan's limits page when the daily browser budget is exhausted. None of these SHALL be reported as a failing application.

When the endpoint refuses the token with an authorization failure (the token was never widened into Browser Rendering Edit), `/walk` SHALL heal itself once: it SHALL follow the recorded widen protocol under the same standing authorization `/wong-cloudflare` uses — resolve the permission group by name, `PUT` the widened set preserving existing groups, re-verify — then retry the walk, and SHALL report which permission it granted. A refusal that survives the widen, or a widen the token cannot perform, SHALL produce `UNKNOWN` naming what was attempted and what still failed. There SHALL be exactly one widen-and-retry per invocation.

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
- **THEN** `/walk` performs the widen protocol itself, reports the permission it granted, and retries the walk once
- **AND** the heal is reported as infrastructure repair, never as a failing journey

#### Scenario: The widen does not take

- **WHEN** the widen fails or the endpoint still refuses after the single retry
- **THEN** the verdict is `UNKNOWN`, naming the attempted widen and the surviving refusal
- **AND** no second widen or retry is attempted in this invocation

#### Scenario: A session dies mid-walk

- **WHEN** a Browser Run session ends while a journey is in flight
- **THEN** that journey's evidence records the error and the remaining journeys run on fresh sessions
- **AND** one lost session does not cost the walk

#### Scenario: Video degrades honestly

- **WHEN** video recording is unavailable over the remote CDP attachment
- **THEN** the walk still runs, captures screenshots, and the evidence comment states that video was unavailable and why
- **AND** the absence of video does not change any verdict

### Requirement: Verdicts report, and gate nothing

The walk SHALL resolve to exactly one of five verdicts — `NONE`, `SUCCESS`, `FAILURE`, `UNKNOWN`, `TIMEOUT` — and each SHALL be reported to the user and on the pull request. **No verdict SHALL block, delay, or condition a merge**, because `/walk` performs no merge and no other skill consults its result.

- **NONE** — not adopted, or adopted with no browser-observable scenarios. Report which, in one line.
- **SUCCESS** — every journey satisfied its `THEN`.
- **FAILURE** — at least one journey contradicted its `THEN`.
- **UNKNOWN** — the walk could not run or could not be trusted after any permitted heal attempt: the browser is missing, the preview URL is undiscoverable, staging is unreachable, or an access block survived its single heal-and-retry.
- **TIMEOUT** — the walk did not finish in its budget.

When the walk lands on a Cloudflare Access challenge and no service-token pair exists in the durable store, `/walk` SHALL heal itself once before concluding `UNKNOWN`: mint a deterministically named service token through the Cloudflare Access API using `CLOUDFLARE_API_TOKEN` (widening into the Access permission groups first if needed, under the same standing authorization), ensure the Access policy accepts it, store the pair in the primary worktree's durable `.env` per the secrets convention without printing a value, and retry. A challenge that survives the mint-and-retry SHALL be `UNKNOWN`, naming what was attempted. There SHALL be exactly one mint-and-retry per invocation.

`UNKNOWN` SHALL NOT be reported as `NONE`. Once a repo has adopted the walkthrough, a walk that cannot run is **unverified** rather than **absent**, and the report SHALL say so in those terms. This distinction SHALL survive as reporting honesty even though it no longer gates anything: an Access challenge screenshotted and described as "a page rendered" would convert an unchecked assumption into a checked-looking one, which is the failure mode the distinction exists to prevent.

#### Scenario: A failing walk blocks nothing

- **WHEN** a walk returns `FAILURE`
- **THEN** the failure is reported and posted
- **AND** no merge, push, or other skill is prevented from running afterwards

#### Scenario: Adopted but nothing to walk

- **WHEN** the scout finds no browser-observable scenarios in an adopted repo
- **THEN** the verdict is `NONE` and one line explains why there was nothing to walk

#### Scenario: An Access challenge heals once

- **WHEN** a walk against an Access-protected preview receives the Access login interstitial and the durable store has no service-token pair
- **THEN** `/walk` mints the service token, stores the pair per the secrets convention, and retries the walk once
- **AND** no credential value is printed or committed

#### Scenario: An Access challenge that survives the heal

- **WHEN** the retry after the mint still lands on the Access interstitial
- **THEN** the verdict is `UNKNOWN` rather than a passing or failing journey
- **AND** the report names the mint attempt and the surviving challenge

#### Scenario: Unverified is reported as unverified

- **WHEN** an adopted repo's walk cannot run because the browser is unreachable
- **THEN** the verdict is `UNKNOWN` and the report states the walk was not verified
- **AND** it is not described as "nothing to walk"

### Requirement: A failed walk resets staging, then fixes in scope or stops

On `FAILURE`, `/walk` SHALL reset the staging database using the stack pack's existing staging reset command. The reset SHALL run only on failure — a passing walk's data SHALL be left in place, staging being a fixture database rather than a preserved one. The reset guarantees the next walk begins from the seeded fixture rather than from the partial state a failed walk left behind.

After the reset, `/walk` SHALL judge scope. A failure is **in scope** when the contradicted `THEN` belongs to this change's own scenarios and the fix plausibly lives in files this branch already touches. For an in-scope failure, `/walk` SHALL fix the code, invoke `/save` (so the fix is pushed and gated normally), and re-walk — with at most **two** fix attempts per invocation, after which it stops and reports like any failure. For an out-of-scope failure (pre-existing behavior, infrastructure, another capability's scenario), `/walk` SHALL stop after the reset and report what failed and what to look at, exactly as before. The report SHALL state the scope judgement either way, so the reader can contest it. Genuinely ambiguous evidence SHALL still stop and ask the user.

#### Scenario: Reset follows a failure

- **WHEN** a journey fails
- **THEN** the staging reset command runs before any fix attempt or stop

#### Scenario: A passing walk leaves its data

- **WHEN** a walk returns `SUCCESS` after journeys that created and deleted records
- **THEN** no reset runs

#### Scenario: An in-scope failure gets a bounded fix loop

- **WHEN** a journey contradicts its `THEN` and the broken behavior belongs to this change's own code
- **THEN** `/walk` resets staging, fixes the code, invokes `/save`, and walks again
- **AND** after two fix attempts without a pass, it stops and reports

#### Scenario: An out-of-scope failure stops

- **WHEN** a journey fails because of behavior this change did not introduce
- **THEN** the skill resets staging, reports the failure and the scope judgement, and stops
- **AND** no fix, re-push, or re-walk is attempted

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-09

~~~
<!-- end .openspec.yaml -->
