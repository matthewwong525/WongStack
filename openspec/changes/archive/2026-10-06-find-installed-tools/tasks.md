# Tasks

The snippet, the hook command, and every test case are in design.md; copy them from there. In `.agents/skills/wong-setup/references/tools.md`, change the one paragraph named in 1.1 and nothing else: pull request #291 edits the same file.

Run no test before section 4: each *verify … passes* in sections 1 and 2 is checked there, after every source and test file is written.

## 1. Setup's line

- [x] 1.1 `.agents/skills/wong-setup/references/tools.md`: replace the paragraph that starts *After a user-folder install* with the text in design.md - Decision 1. Verify `git diff --stat` shows that file changed in one hunk, and the fenced snippet equals design.md's character for character.
- [x] 1.2 Add `scripts/tests/tools-on-path.test.mjs` with the snippet cases in design.md - Decision 4: the snippet is read out of `tools.md`, each child starts with `env -i`, `SHLVL=1`, and `stdin` ignored, and the file is skipped on Windows. Verify it holds the five cases and the bottom-line case that must find nothing under root's files.

## 2. Claude Code's session step

- [x] 2.1 `.agents/settings.json`: add the shell hook first under `SessionStart`, timeout 3, and prefix the two `node` hook commands, by design.md - Decision 2. Verify the file parses as JSON and `git diff --stat` does not list `.agents/hooks.json`.
- [x] 2.2 Extend `scripts/tests/tools-on-path.test.mjs` with the hook cases in design.md - Decision 4: the command is read out of `.agents/settings.json`, four cases each exiting 0, the prefix on both `node` commands, and no `PATH=` in `.agents/hooks.json`. Verify the cases are written.

## 3. Guide and release

- [x] 3.1 `wiki/development/required-tools.md`: add `## Where an assistant finds its tools` after *Runtimes install at the point of need*, by design.md - Decision 5, in the wiki's voice (`wiki/voice.md`). Verify it is under 150 words, links `tools.md` the way the section above it does, and that the heading text matches the anchor `tools.md` links.
- [x] 3.2 `CHANGELOG.md`: add `## Next (patch) — A later chat finds the tools setup installed` at the top of the entries, with the **Updating.** note in design.md - Decision 6. Verify `git diff --stat` does not list `VERSION`.

## 4. Verification

- [x] 4.1 Run `node --test scripts/tests/tools-on-path.test.mjs`. Verify it passes. Then prove it can fail: change the snippet in `tools.md` to append the line (`echo "$L" >> "$F"`), see the root-files cases fail by name, and restore the snippet.
- [x] 4.2 Claude Code's path on this server, by design.md - Decision 7: start a new Claude Code session in this workspace with one instruction, to print `PATH`. Verify `/root/.local/bin` is on it and the memory digest loaded. If the folder is missing, stop and report it as a blocker: `CLAUDE_ENV_FILE` did not work as read, and Decision 2 needs another way.
- [x] 4.3 Codex's path on this server, by design.md - Decision 7: copy `~/.bashrc` to `/tmp/bashrc.before-find-installed-tools`, record that `env -i HOME=/root SHLVL=1 bash -lc 'echo $PATH' </dev/null` does not name `/root/.local/bin`, run the snippet from `tools.md` against the real file, and verify the same command now names it. Verify the file's first line is the line, lines 2 on equal the copy, and a second run changes nothing.
- [x] 4.4 Run `node .github/scripts/checks.mjs --worktree`. Verify every step passes, the context budget included; if it fails, trim this change's own lines in `tools.md`, not another file's.
- [x] 4.5 Run `openspec validate "find-installed-tools" --strict --no-interactive`. Verify it passes.
