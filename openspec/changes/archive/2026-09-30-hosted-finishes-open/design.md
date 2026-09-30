# Design

## Context

See proposal.md - Why. `card-after-setup` (28.7.0) gave `provision()` an `openWithoutLogin` option: an `AccessSetupError` from `accessOrganization()` that is not transient, on a site not already private, records `report.access = { mode: 'open', … }`, skips `provisionAccess` and `provisionAccessPolicies`, and `wranglerConfig()` writes `WORKSPACE_LOGIN: "off"`. A rerun without `keepConfig` whose organization succeeds calls `closeOpenConfig()` to turn the config private. `server/install-wongstack.mjs` never passes the option, and always passes `keepConfig: mode === 'installed'`, so a reconnect can't turn an open install private.

wongstack-cloud PR #52 (`card-later-on-hosted`, merged) lists `AGENT_CONTRACTS = [1, 2]`. Its `receiveAccess` accepts an open result, parsed by `openResult()` with an exact key set, only when the VM's recorded `agent_contract >= 2`, and answers with the same `{ ok, connectionId, generation, state: "pending" }` receipt the agent's `deliver()` already checks. An open result on a connection that already holds metadata gets `409`.

The agent (`server/agent/agent.mjs`) runs from the build's source; the installer it runs comes from a clone pinned to the job's `sourceCommit` (`server/agent/source.mjs`). The two can differ.

## Goals / Non-Goals

**Goals:**
- A contract-2 server's install finishes open on the onboarding refusal, and delivers the open result.
- A reconnect after the card turns the install private, delivers the restricted result, and commits nothing.
- A no-card account's refused Access probe in `widen` does not stop the open path first.

**Non-Goals:**
- Any change on wongstack-cloud; `/wong-setup`'s runbook; detecting a card; a by-hand install opening without asking.

## Decisions

### The agent asks; the installer obeys

`CONTRACT` becomes 2. `installWongStack()` adds `openWithoutLogin: true` to the installer's stdin job. `install()` reads `job.openWithoutLogin === true` and passes it to `widen()` and `provision()`. A job without it stops on onboarding as today.

Rejected: the installer always opening. A contract-1 agent may run a newer installer pinned by the host; its open result would reach a Worker that refuses it for that VM, failing the job with a worse reason than today's `cloudflare`. Asking keeps each pairing safe: a contract-1 agent never asks, and a contract-2 agent running an older installer gets the old stop, since that installer ignores the field.

`jobFolder()` ignores the field; `server/README.md`'s job table lists it as optional, so a by-hand run may ask too.

### The open result

In `writeManagementResult()`, when `report.access.mode === 'open'`: skip the permission-group read, the token list, the markers, and cleanup; `writePrivate(destination.path, { version: 1, mode: 'open', recipient, source, accountId, repo, ownerEmail, anchorHostname })`, with `anchorHostname` from `report.urls.production` as today. An existing file for the same job must match those eight fields, else the existing "belongs to another job" failure.

When the report is restricted and the existing file is an open one (the card arrived between retries of one job), treat it as no existing result: mint and overwrite. `validateExistingManagementResult()` already compares only `version`, `recipient`, `accountId`, `repo`, `ownerEmail`, `source`, which both shapes share.

`cleanupTokenIds` on an open run stay untouched: the open result has no field to report them, and an open install never held a management token. Revoking them silently would lose the host's view of what went.

### The reconnect reruns without keepConfig when the config is open

In `install()`: `const loginOff = mode === 'installed' && /"WORKSPACE_LOGIN"\s*:\s*"off"/.test(readFileSync(app/wrangler.jsonc))`, then `keepConfig: mode === 'installed' && !loginOff`. That is the exact rerun `card-after-setup` built and tested: with Zero Trust now on, `provision()` makes the Access app and policies, `closeOpenConfig()` fills the four `CF_ACCESS_*` vars and drops the switch, updates `components.access` in the record, and adds the bucket and its binding if R2 is now on. Still no card: it finishes open again and the config stays as it was.

The push step is unchanged: an installed repo whose `origin/main` exists returns before any commit or push, so the edits stay uncommitted in `~/<name>` for the person's assistant to publish. The Worker stays open until then, never broken: the Worker honors the switch only while no Access id is set, and the deployed config has none.

Rejected: teaching `provision()`'s `keepConfig` to close an open config anyway. It changes `/wong-setup`'s `--keep-config` too, and forks a second path to turn private.

### The widen's Access probes on the open path

`widen({ …, openWithoutLogin })`: the D1 probe keeps stopping on refusal. For the three Access surface probes, when `openWithoutLogin` is set and the probe still fails with 401/403 after the full `PROPAGATION` wait, record it (`report.accessPending: [surface…]`) and go on. `accessOrganization()` then decides: a non-transient refusal there opens the site; a transient one stops.

Cost: a no-card account that refuses those probes waits the full schedule once, about a minute. After the first refused surface exhausts its wait, the other two get one try each, since that wait already covers propagation.

Risk: a card account whose Access groups propagate slower than the wait could reach `accessOrganization()` early and open. The wait is the same one every widen already trusts, and the reconnect turns it private.

## Risks / Trade-offs

- [A reconnect's edits sit uncommitted while the site stays open] → wongstack-cloud's first message has the assistant publish; the deploy check then runs in full.
- [The person has uncommitted edits to `app/wrangler.jsonc` on the server] → `closeOpenConfig()` edits in place and restores the file when the result doesn't parse to the expected private config, adding a `todo` instead.
- [The real no-card behavior of Cloudflare's Access reads is unknown] → The guard covers a refusal; an unverified-run thread stays open until wongstack-cloud's staging walk with a no-card account.
- [Contract-2 agent meets a host that lacks contract 2] → Ordered away: wongstack-cloud lists 2 already.

## Migration Plan

Servers built before this release keep contract 1 and stop as today. New builds declare 2 and finish open. Rollback: revert; wongstack-cloud keeps accepting contract 1.
