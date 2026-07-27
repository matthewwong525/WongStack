# Drop the jq dependency

**Status:** ready-to-ship
**Open questions:** none

## Why

WongStack's payload requires `jq` on PATH, but only three places actually use the standalone binary — every other `--jq` in the payload is `gh`'s own embedded jq (gojq), which costs nothing. That leaves a real external dependency, and a `wong-setup` preflight that gates onboarding on it, for a handful of trivial JSON reads. On a machine with `gh` but no `jq` — a common shape — `wait-for-checks.sh` silently produces empty output and `/wong-sync` Step 0 resolves every manifest field to empty.

## What Changes

- Rewrite `save/scripts/wait-for-checks.sh` to do its filtering with `gh pr checks --jq` (gh's built-in gojq) plus plain shell, removing all four pipes to a standalone `jq`.
- Reframe `/wong-sync` Step 0's four manifest reads: instead of `jq -r` shelling out, the skill instructs the agent to read `.claude/.wong-stack.json` directly and note `commit`, `upstream.repo`, `upstream.fork`, `upstream.clone` — with the defaults and `~` expansion stated in prose.
- Drop `jq` from the `wong-setup` GitHub-readiness preflight; the required external tools become `git`, `gh`, and `openspec`.
- Document the resulting rule so it doesn't regress: payload scripts and skills may use `gh --jq`, never a standalone `jq`.
- Mirror every skill edit across both `.agents/skills/` and `.claude/skills/`, which are byte-identical copies.
- Release ritual: bump `VERSION`, add a newest-first `CHANGELOG.md` entry.

Non-goals: no change to what `wait-for-checks.sh` reports (same four RESULT lines, same semantics), no change to the manifest schema, no swap to `python3`/`node` as a replacement parser.

## Capabilities

### New Capabilities
- `toolchain-dependencies`: the external commands the WongStack payload is allowed to depend on, and the rule that JSON handling goes through `gh --jq` rather than a standalone `jq`.

### Modified Capabilities
<!-- None. The `wong-setup` readiness preflight's tool list is not spec-level in
     `install-onboarding`; the new `toolchain-dependencies` capability owns it. -->


## Impact

- `.agents/skills/save/scripts/wait-for-checks.sh` + `.claude/` mirror
- `.agents/skills/wong-sync/SKILL.md` Step 0 + `.claude/` mirror
- `.agents/skills/wong-setup/SKILL.md` preflight item 9 + `.claude/` mirror
- `wiki/` — a short note on the allowed toolchain
- `VERSION`, `CHANGELOG.md`
- Removes one external dependency for every WongStack target repo; the only behavior change for users who already have `jq` is that the CI gate stops reporting false green (see the Decision log).

## Decision log

- **2026-07-27** — Implemented in full; all 13 tasks complete, `VERSION` 6.4.0. Two findings changed the shape of the work. **(1)** The `RC -ne 0` half of `wait-for-checks.sh`'s no-checks guard is an independent bug that had to be dropped rather than carried over: `gh pr checks` exits `8` on pending and `1` on failure, so the exit code reports the *verdict*, not whether checks exist — meaning any PR with live checks took the `RESULT: NONE` branch on the first poll and `/save`/`/ship` skipped the gate entirely. This hit every user, `jq` installed or not, and is now fixed alongside the jq-specific false-`SUCCESS` bug; captured in design.md under "Correction found during implementation". **(2)** The planned `.agents/` ↔ `.claude/` mirroring step was a no-op — `.claude` is a committed *symlink* to `.agents`, so there is one skill tree, not two; the design risk is struck through and task 5.1 records why. Also decided the new `wiki/development/required-tools.md` stays **out** of the wong-sync payload manifest (it documents working on WongStack itself, like `the-change-loop.md`), which meant removing the link to it I had added in `wong-setup/SKILL.md` — that skill *is* synced, so the link would dangle in every target repo. Ruled out swapping `jq` for `python3`/`node`: trades one dependency for a less universal one.
