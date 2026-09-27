# Tasks

## 1. Script

- [x] 1.1 Add `.agents/skills/explore/scripts/other-work.mjs` by the design: git worktrees of this repo from the primary, Paseo names and busy state when available, active OpenSpec changes read from disk, open non-bot pull requests folded into their worktrees, notes for Paseo or GitHub failures; `--help`, exit 2 on unknown flags
- [x] 1.2 Add `scripts/tests/other-work.test.mjs`: a temp repo with a primary and linked worktrees (one with an unsaved change folder, one clean and published, the current one), a fake `paseo` listing this repo and another project, and a fake `gh` (a person's PR, a bot PR, a PR on a listed worktree's branch, and a failing run); assert only this repo's live work appears, the current and clean worktrees are left out, the bot PR is skipped, the matching PR folds in, and a `gh` failure leaves a note with exit 0
- [x] 1.3 List the script in `scripts/tests/cli-conventions.test.mjs`

## 2. Skills

- [x] 2.1 In `.agents/skills/explore/SKILL.md`, add *Check for other work* after *Search memory before asking*, and run it in bounded-mode step 2 unless it already ran for this work
- [x] 2.2 In `.agents/skills/plan/references/new-workspace.md` *Ask once*, add the overlap ask: keep going here, work there instead, narrow this one

## 3. Docs and release

- [x] 3.1 Add one sentence to `wiki/development/the-change-loop.md` *Several parts, several workspaces*, linking the explore step
- [x] 3.2 Add a `## Next (minor) — Planning checks for other work first` entry to `CHANGELOG.md`

## 4. Verify

- [x] 4.1 Run the new tests and `cli-conventions.test.mjs` with `TMPDIR=/var/tmp`, then `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check`
- [x] 4.2 Run the script in this repo and confirm it lists this repo's other workspaces only
