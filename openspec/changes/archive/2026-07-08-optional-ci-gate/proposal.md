## Why

WongStack's doctrine currently asserts GitHub Actions as *the* build gate — "CI is the only gate," "nothing builds locally." That framing makes CI a required pillar, which is wrong: the durable system is pull requests (available on any VCS forge), version control, OpenSpec, and everything-lives-in-the-repo. CI is an optional accelerator, not the foundation — and plenty of target repos have thin or no CI.

## What Changes

- Reframe the delivery doctrine everywhere it appears: **GitHub Actions is optional and honored when present, never required.** The gate is CI when a repo has checks configured; otherwise the gate is **PR review only** (a human approves the PR).
- No behavioral change to the skills' mechanics — `wait-for-checks.sh` already returns `NONE` when no checks exist, and `/save`/`/ship` already proceed on `NONE`. This change makes the *prose* match the mechanics and removes "CI is the only gate" absolutism.
- No local-build fallback is introduced: skills still never build or test locally as a prerequisite, whether or not CI is present.
- Doctrine/wording edits across the payload: `CLAUDE.md` rule, `README.md` (delivery pitch + "CI is the only gate" + prerequisites), `save/SKILL.md`, `ship/SKILL.md`, `wait-for-checks.sh` header comment, `docs/development/the-change-loop.md`, `install-wong-stack/SKILL.md`.
- Release chore: bump `VERSION` (minor — doctrine shift, no breaking behavior) and add a newest-first `CHANGELOG.md` entry.

Non-goals: rewriting the PR tooling to support non-GitHub forges (skills still use `gh`); adding a local-verify gate; changing the CI wait/auto-fix mechanics.

## Capabilities

### New Capabilities
- `delivery-gate`: the rule that governs when `/save` checkpoints and `/ship` merges — CI-when-present-else-PR-review, with no local build in either path.

### Modified Capabilities
<!-- None — no existing specs in openspec/specs/. -->

## Impact

- Prose only: `CLAUDE.md`, `README.md`, `docs/development/the-change-loop.md`, and skills `save`, `ship`, `install-wong-stack`; the header comment of `save/scripts/wait-for-checks.sh` (comment only, no logic change).
- `VERSION` + `CHANGELOG.md` (release bookkeeping).
- No code logic, no test suite (payload is markdown). Existing `NONE → proceed` behavior is now the documented contract.
