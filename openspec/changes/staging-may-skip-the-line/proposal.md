# The test copy of your app may run without the live line

**Status:** ready-to-ship
**Branch:** staging-may-skip-the-line
**Open questions:** none.

## Why

We're about to stop giving the test copy of your app a line of its own ([one-line-worker](../one-line-worker/proposal.md)). Each app checks a change against the check it already has live, and today's check fails when the test copy has no line. So this small release goes first: it teaches the live check that "no line" is fine, and once it's live, the bigger change can pass.

## What Changes

- **The test copy may have no line.** The check that keeps the test copy apart from the live app now passes when the test copy has no line at all. It still fails when the test copy points at the live line, as before. Nothing you see changes.
  ```mermaid
  flowchart LR
    test["test copy"] --> has{"its line?"}
    has -->|"its own"| pass["passes"]
    has -->|"none (new)"| pass
    has -->|"the live one"| fail["fails"]
  ```
- **Publish this before the next change.** An app that takes both at once would fail its check, so the next change's update note says to publish this one first. WongOS can take it in the update it's doing now.

Non-goals: removing the test copy's line (the next change); changing what the line does.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `stack-pack`: the staging app may point at no line Worker; it still never points at the live one.

## Impact

- **Pack scripts:** `scripts/cf-secrets.mjs` (`checkDurableObjectTwins`) and `scripts/tests/cf-secrets.test.mjs`. `buildProblem`'s `stagingLineProblem` in `scripts/lib-wrangler-config.mjs` already passes a preview with no line binding; a test pins it.
- **Docs:** `wiki/stack/staging-bindings.md` (the Durable Objects row), `CHANGELOG.md` (minor).

## Decision log

- **2026-10-25** — Asked how to get past each app's live check refusing a test copy with no line → chose two small releases: this one first, then the removal.
- **2026-10-25** — Assumed: this is a `minor` release, not a `patch`, because a check behaves differently, though nobody sees it and installs have nothing to do.
- **2026-10-25** — Assumed: a staging Durable Object binding to another Worker stays allowed when it names a different Worker from production's, because this release must still pass with today's staging line; the next change refuses all of them.
- **2026-10-25** — Built: the `buildProblem` test went in `scripts/tests/line-deploy.test.mjs`, not `wrangler-config.test.mjs`, because the line fixture and the live-line refusal test already live there.
- **2026-10-25** — Check: `secrets:check` stops failing when production binds a Durable Object in another Worker and staging binds none, because a missing binding can't reach live objects; the failure for staging naming production's Worker stays.
- **2026-10-25** — Fixed (second look): the `stack-pack` delta had picked up a scenario and a THEN line from `cloudflare-provisioning`'s *A production deploy keeps the default branch's config*; both are gone, here and in [one-line-worker](../one-line-worker/proposal.md)'s delta.
- **2026-10-25** — Save checkpoint: built and reviewed; the second plan, one-line-worker, is kept off this branch until this release is live.
