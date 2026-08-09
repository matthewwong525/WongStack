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
