# Tasks

## 1. Budget baseline

- [x] 1.1 Run `node scripts/measure-context.mjs --check` before any text edit and note the headroom (144 bytes, 1 start-up word at planning)

## 2. Skills

- [x] 2.1 Write `.agents/skills/close/SKILL.md`: frontmatter (`name: close`, a trigger-rich description of about 18 words, `user-invocable: true`), authorization line, state read, the wrap-up facts (goal, done, one thread per undone piece, finished threads superseded), the keep / wrap / discard routes, `## Update the wiki` with change and session scopes, `keep-transcript current`, closing this chat's open hand-over link, the `tidy.mjs close` exit handling, and the report
- [x] 2.2 `.agents/skills/ship/SKILL.md`: delete the distill section and Step 2's "after the distillation"; Step 6 says *Close this workspace* runs `/close`
- [x] 2.3 `.agents/skills/plan/references/new-workspace.md` *Next work*: keep the ordering rule, replace the `tidy.mjs close` block and exit list with a link to `/close`
- [x] 2.4 `.agents/skills/explore/references/asking-the-user.md`: add the finished-work close bullet to the next-step list
- [x] 2.5 Trim instruction text elsewhere until `measure-context.mjs --check` passes, words and bytes and start-up ceiling, with no ceiling raise

## 3. Script

- [x] 3.1 `.agents/skills/routine/scripts/tidy.mjs`: `close --discard` (skip the saved check, refuse primary and non-Paseo, close the open PR, delete the remote branch, reset and clean the worktree, hand off with `deleteBranch: true`, report `discarded`); update the header comment and `USAGE`
- [x] 3.2 `scripts/tests/tidy.test.mjs`: discard on a dirty worktree with an open PR (fake `gh`), discard with no PR, discard refused in the primary checkout, `--discard --dry-run` touches nothing, and plain `close` still refuses unsaved work

- [x] 3.3 `.agents/skills/memory/scripts/memory.mjs`: `keep-transcript <session|current>`, sharing the redact-and-upload code with `strip`; add it to `USAGE` and the memory skill's command table
- [x] 3.4 `scripts/tests/memory-capture.test.mjs`, beside the `strip` tests and their transcript fixtures: keep-transcript uploads the redacted body and sets `raw_key` without changing capture status; skips `#private`, no bucket, and over 50 MB with exit 0

## 4. Docs and wiring

- [x] 4.1 `.agents/skills/wong-sync/references/payload-files.json`: add `close` to `core.skillDirs`; payload manifest names `/close` among the workflow skills if it lists them
- [x] 4.2 `wiki/development/the-change-loop.md`: `/close` in *The steps* and the plain-request paragraph (finished work offers to close; `/close` updates the wiki)
- [x] 4.3 `wiki/wiki-style.md`, `wiki/agent-knowledge-center.md`, `wiki/development/memory.md`: `/close`, not `/ship`, catches what a session missed
- [x] 4.4 `AGENTS.md` `WONG-STACK` verb line and `README.md` command table: add `/close`
- [x] 4.5 `CHANGELOG.md`: `## Next (minor) — Close a workspace from any finished task` entry, with an **Updating.** note in plain words
- [x] 4.6 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, and `node scripts/check-openspec-config.mjs`

## 5. Gate

- [ ] 5.1 `/save`: CI passes, including the tidy tests, payload checks, and the context-size check
