# Fix the improve survey symlink entry

**Status:** ready-to-ship
**Branch:** repository-improvement
**Open questions:** none

## Why

The `/improve` skill tells agents to run its survey through `.claude/`, but this repository makes `.claude` a symlink to `.agents`. The helper compares the unresolved command path with its resolved module path, so the documented command exits successfully without a JSON report.

## What Changes

- Make the survey CLI recognize direct execution through a safe path alias while it keeps the same JSON output and exit-code contract. (review.html#/survey-entry/after/direct-entry)
- Add regression coverage that runs the helper through the documented `.claude/...` path, and publish the required WongStack patch release.

**Non-goals:** Changing survey findings, rotation, history selection, scope handling, or the deferred `CHANGELOG.md` link-noise finding.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `repository-improvement`: Require the documented survey command to emit its report when its script path resolves through an in-repository alias.

## Impact

Update the survey entry detection, its fixture tests, the repository-improvement contract, and the required payload release surfaces. No dependency, application runtime, credential, or external service changes are required.

## Decision log

- 2026-09-21: `/improve` ranked two confirmed survey faults; the user chose the CLI-entry repair and deferred historical changelog-link noise.
- 2026-09-21: Assumed the change name and a path-identity implementation because these details do not alter the selected behavior.
- 2026-09-21: Keep JSON content and exit codes unchanged; acceptance requires equivalent reports from the documented `.claude/...` path and the canonical `.agents/...` path.
- 2026-09-21: The bounded explore exit round is complete; scope, observable behavior, compatibility, and acceptance are settled.
- 2026-09-21: Implemented resolved-path direct-entry detection, added process-level alias coverage, published the 16.2.2 release surfaces, and passed all focused payload and OpenSpec checks.
- **2026-09-21** — Synced the completed repository-improvement contract and prepared the implementation checkpoint for CI.
- **2026-09-21** — Archived the complete change after its implementation checkpoint passed CI; this archive checkpoint now gates the exact record for squash merge.

Maintenance-Origin: /improve
Maintenance-Revision: ab4af9e8481bc76ffa319e80f0c84bca2a9c6ec9
Maintenance-Area: .agents/skills/wong-cloudflare
