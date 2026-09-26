## 1. Script

- [x] 1.1 Add `.agents/skills/save/scripts/mini-app-push.sh` per design: the folder check, the test run, the push, and one rebase-and-retry on a moved branch, with the exit codes and `key=value` output
- [x] 1.2 Add `scripts/tests/mini-app-push.test.mjs` with real git: a clean push; `main` moved on another file (rebased and pushed); a conflicting change to the same app (rebase aborted, `reason=rebase-conflict`); a failing test (exit 1, nothing pushed); a commit outside the folder (`reason=outside`); a hook refusal (`reason=refused`, no retry); a failing test after the rebase (`reason=tests-after-rebase`)

## 2. Docs

- [x] 2.1 In `.agents/skills/save/references/mini-app-save.md`, replace the test and push steps with the script, and map its exit codes to the report or the fallback
- [x] 2.2 In `wiki/stack/mini-apps.md` and the prose-allowlist section of `wiki/development/the-change-loop.md`, say that a moved `main` gets one rebase before a pull request

## 3. Release

- [x] 3.1 Set `VERSION` to 23.0.1 and add a newest-first `CHANGELOG.md` entry
- [x] 3.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check`
