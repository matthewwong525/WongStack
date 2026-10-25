# Design

## Context

See proposal.md, Why. CI's *Check staging/production parity* step runs the default branch's `trusted/scripts/cf-secrets.mjs check` against the branch's own `app/wrangler.jsonc` (copied in by `--take-build` on a preview). `checkDurableObjectTwins` fails a production Durable Object binding with a `script_name` when `env.staging` has no binding of that name ("names no other Worker for it") or one naming the same Worker. So [one-line-worker](../one-line-worker/design.md), which drops staging's `LIVE_LINE`, fails CI in every repo until its default branch carries this check.

The deploy's own refusal, `stagingLineProblem` in `scripts/lib-wrangler-config.mjs`, already passes a build with no `script_name` binding, and the other default-branch scripts (`cf-deploy.sh`, `check-private-access.mjs`) read only the default branch's own line config. `cf-secrets.mjs` is the only blocker.

## Goals / Non-Goals

**Goals:** a staging app with no line binding passes every default-branch check; staging naming production's Worker still fails.

**Non-Goals:** removing staging's binding or the staging line Worker (next change); refusing a staging twin (next change).

## Decisions

### 1. No staging binding is not a failure

In `checkDurableObjectTwins`, skip a production `script_name` binding whose name `env.staging` doesn't bind. Keep the failure for a staging binding with the same `script_name` as production's. A staging twin naming another Worker still passes, so this repo's own config, which still binds `wongstack-line-staging`, keeps passing.

Alternative: refuse every staging `script_name` binding now. Rejected: today's config has one, so this release's own check would fail on its default branch.

### 2. Docs

`wiki/stack/staging-bindings.md`, the Durable Objects row: staging may leave a `script_name` binding out; naming the live Worker fails `secrets:check`. `CHANGELOG.md`: `## Next (minor) — The test copy may run without the live line`, with no **Updating.** step beyond publishing it before the next change.

## Risks / Trade-offs

- [An install takes this and the next change in one update] → its live check still has the old rule, and the update's first save fails the staging check. The next change's **Updating.** note says to publish this one first.

## Migration Plan

Publish; nothing to deploy by hand. Rollback: revert the release.
