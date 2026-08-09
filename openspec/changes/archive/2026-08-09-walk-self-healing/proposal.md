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
