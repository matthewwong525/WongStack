# Secret save workflow

**Status:** ready-to-ship
**Open questions:** none

## Why

Each linked worktree currently gets its own ignored secrets files, so an agent can save or rotate a credential in a disposable checkout while the durable primary worktree keeps an older value. Later workflows then lose the credential or read a different copy, even though the repository's guidance says credentials already live in the repo environment.

## What Changes

- Make the primary worktree's ignored environment file the durable local store for real secret values, while retaining stack-specific dotenv equivalents.
- Require linked-worktree workflows to resolve that durable store and, where checkout-local tooling needs a conventional path, use an ignored link rather than a second independently editable copy.
- Clarify the committed example contract: a new secret adds its blank variable name and sourcing guidance to the active branch's `.env.example` (or equivalent), while rotations never put the value in git and need no template edit unless the contract changed.
- Make Cloudflare provisioning write and reread the durable credential file and make the staging walkthrough find the same credentials from any worktree.
- Make `/save` the universal checkpoint that preserves any explicitly supplied or rotated session secret in the durable file, maintains its blank example declaration when required, and excludes values from notes and other committed handoff surfaces.
- Make `/ship` invoke ordinary `/save` exactly once after `/ship` performs its owned OpenSpec archive step, so commit, push, PR update, secret/note capture, and CI handling have one implementation before `/ship` merges without a special command mode.
- Update the shipped guidance and examples, then release the payload with a version bump and changelog entry.
- **Non-goals:** synchronizing secrets between machines, committing encrypted secret values, replacing platform secret stores, or making `.env` mandatory in repos that use another stack convention.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `secrets-convention`: Define worktree-safe durable storage for real values and the names-only contract for committed example files.
- `cloudflare-provisioning`: Resolve, create, verify, and update the primary worktree credential file rather than a linked worktree copy.
- `staging-walkthrough`: Resolve the durable repository credential when a walk runs from any linked worktree.
- `session-notes`: Require `/save` to exclude secret values while retaining the non-secret context that a credential changed.
- `delivery-gate`: Make `/ship` delegate its branch checkpoint and CI path to `/save` instead of duplicating those mechanics.

## Impact

This changes the shipped secrets wiki page, the generic `WONG-STACK` agent guidance, environment example prose, `/wong-cloudflare`, `/walk` credential preflight, and the `/save` and `/ship` runbooks (including their `.claude/` and `.agents/` mirrors). It changes no external API and adds no dependency, but it is a behavioral payload release requiring `VERSION`, `CHANGELOG.md`, and the payload-link check.

## Decision log

- **2026-08-08** — Implemented the complete worktree-safe secret workflow and released it as 9.5.0. Git or agent hooks were rejected as the primary mechanism because they do not reliably observe ignored-file writes across agents; `/save` owns preservation and leak checks, with hooks left as optional defense-in-depth. `/ship` now performs its OpenSpec archive first and delegates the exact archive/code checkpoint to `/save --shipping`, eliminating duplicate commit, PR, and branch-CI logic while ensuring CI checks the commit that merges.
- **2026-08-08** — Simplified the ship handoff after review: two saves were rejected as redundant, and the special `--shipping` interface was removed. `/ship` archives first and invokes ordinary `/save` exactly once; `/save` safely infers the uniquely matching archive from the current branch, while `/ship` applies the stricter merge interpretation to the returned gate result. This keeps the archive inside the tested commit without duplicating checkpoint logic or adding user-visible modes.
