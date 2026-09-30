# Tasks

## 1. The new skill folder

- [x] 1.1 `git mv` the nine private-link files from `.agents/skills/verify/scripts/` to `.agents/skills/hand-over/scripts/`, and update `hand-over.mjs`'s header and usage paths. Verify `verify/scripts/` holds only `verify-runner.sh` and `verify-staging.sh`, and `node .agents/skills/hand-over/scripts/hand-over.mjs` with no arguments prints its usage.
- [x] 1.2 Add `.agents/skills/hand-over/SKILL.md` by design.md: hidden, `disable-model-invocation: true`, a description of about ten words, and a body linking the three owning wiki sections without repeating their commands. Verify with `node scripts/check-payload-links.mjs`.
- [x] 1.3 Trim other skills' descriptions by at least the new description's words, keeping their meaning. Verify `node scripts/measure-context.mjs --check` passes with `startupCeiling` unchanged.

## 2. Callers and tests

- [x] 2.1 Point the five test files and the `cli-conventions.test.mjs` entry at the new paths. Verify with `node --test scripts/tests/hand-over.test.mjs scripts/tests/hand-over-page.test.mjs scripts/tests/keys.test.mjs scripts/tests/passwords.test.mjs scripts/tests/passwords-page.test.mjs scripts/tests/cli-conventions.test.mjs`, rerunning a start-wait timeout once (a known flake under load).
- [x] 2.2 Update the commands and links in `wiki/development/browsing.md` and `wiki/development/secrets.md`, the close line in `.agents/skills/close/SKILL.md`, and the comment in `.agents/skills/ship/scripts/worktree-secrets.mjs`. Verify `grep -rn "verify/scripts/\(hand-over\|keys\|passwords\)"` finds nothing outside `openspec/changes/archive/` and `CHANGELOG.md`.

## 3. Payload and release

- [x] 3.1 Add `hand-over` to `core.skillDirs` in `.agents/skills/wong-sync/references/payload-files.json`, name it in the payload manifest's Core list, and register the three old path prefixes in `scripts/retired-names.json`. Verify `node scripts/check-retired-names.mjs` and `node scripts/check-payload-links.mjs` pass.
- [x] 3.2 Add one `## Next (minor) — Give the private links their own home` entry to `CHANGELOG.md`, with an Updating note in plain words to let any open private link finish before updating; leave `VERSION` alone. Verify the entry sits at the top.

## 4. Integration checks

- [x] 4.1 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/measure-context.mjs --check`, and `openspec validate move-hand-over-scripts --strict --no-interactive`; verify all pass, recording the startup word count in the handoff. CI runs the full suite at `/save`.
