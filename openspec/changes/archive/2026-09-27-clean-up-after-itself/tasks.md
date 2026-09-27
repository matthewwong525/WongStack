# Tasks

## 1. The tidy script

- [x] 1.1 Create `.agents/skills/routine/scripts/tidy.mjs` with the `scratch`, `close`, and `sweep` commands, `--dry-run`, `TIDY_PASEO_BIN`, and the exit codes from `lib/paseo.mjs`. Implement the ownership tests from design.md as exported pure helpers: this repo's workspace, saved, merged branch, idle, orphaned process, old temp, and old primary scratch. `scratch` creates `.scratch/` at the checkout root and adds it to `info/exclude` when `git check-ignore` says it is not ignored. Node built-ins only; header comment in `workspace.mjs`'s style. Verify with the tests in 1.4.
- [x] 1.2 `close`: check synchronously and refuse with exit 2, naming the reason, for the primary checkout, no Paseo agent, or unsaved work. Otherwise spawn the detached child: `paseo wait` with a 30-minute cap, `paseo workspace archive`, stop orphaned processes under the worktree path, delete the local branch only when `gh` shows the pull request `MERGED` at the local tip, and write the result into `<git-common-dir>/wong-tidy/report.json`. Verify with the tests in 1.4.
- [x] 1.3 `sweep`: take a lock, and exit when the last sweep began under 6 hours ago. Archive this repo's idle 3+ day saved workspaces, skipping the current agent's workspace. Stop orphaned processes; skip with a note where there is no `/proc`. Delete `wong-*` temp entries older than 24 h, and files older than 24 h in the primary checkout's `.scratch/`. Merge the results into the report. `sweep --report` prints one plain line and deletes the report; it prints nothing when the report is empty. Verify with the tests in 1.4.
- [x] 1.4 Add `scripts/tests/tidy.test.mjs` with a fake `paseo` (as in `workspace.test.mjs`), a fake `gh`, temp git repos with worktrees, and `TMPDIR` pointed at a test folder. Cover:
  - `close` refusing on a dirty tree and on the primary checkout;
  - `close`'s child sequence and its branch delete only on a matching merged PR;
  - `sweep` archiving an idle saved workspace;
  - `sweep` skipping an unpushed one, a running one, and another repo's;
  - old `wong-*` removed while `tsx-0` and fresh `wong-*` stay;
  - old primary `.scratch/` files removed while fresh ones stay;
  - a `.scratch/` file not blocking `close`;
  - `scratch` adding the exclude line only when the folder is not already ignored;
  - the 6-hour stamp and the lock;
  - the report printed once;
  - the orphan-process filter (pure, on fixture `/proc`-style entries).

  Verify with `TMPDIR=/var/tmp node --test scripts/tests/tidy.test.mjs`.

## 2. Hooks and skills

- [x] 2.1 In `.agents/skills/memory/scripts/session-start.mjs`, print the `sweep --report` line (read in-process, within the budget), then spawn `tidy.mjs sweep` detached, skipping it for background runs and when `WONG_TIDY=0`. Extend `scripts/tests/` hook coverage so the report line appears once and a failed spawn never breaks the hook. Verify with `node --test` on the hook tests.
- [x] 2.2 In `.agents/skills/ship/SKILL.md` Step 6 and `.agents/skills/plan/references/new-workspace.md` (Next work), add *Close this workspace* to the closing question when the ship ran in a Paseo worktree. It is recommended when no next work is waiting. Picking it runs `node "$(git rev-parse --show-toplevel)/.claude/skills/routine/scripts/tidy.mjs" close`, and a refusal is reported in plain words. Verify the option appears once in each page, and that the ask links the shared format and keeps no copy of it.
- [x] 2.3 Point scratch files at `tidy.mjs scratch`. In `new-workspace.md`, the brief's temporary file goes there. Add a short *Scratch files* line to `wiki/development/the-change-loop.md`, linking the script. Verify with `node scripts/check-payload-links.mjs`.
- [x] 2.4 Ignore `.scratch/`: add it to this repo's `.gitignore`, to the `.gitignore` fragment in `.agents/skills/wong-sync/references/stack-pack-fragments.md` (with one line on why), and to the ignore rules `wong-setup/SKILL.md` installs. Verify with `git check-ignore -q .scratch/x`, and with the fragment and setup naming it once each.

## 3. Tests' temp folders

- [x] 3.1 Rename every `mkdtemp` prefix in `scripts/tests/` that does not start with `wong-` to `wong-test-<old prefix>`, including the hardcoded `/tmp/...-` ones, which move to `os.tmpdir()`. Verify that every `mkdtemp` call's prefix starts with `wong-` (import lines aside), and the full suite passing in CI.

## 4. Docs and release

- [x] 4.1 Add a `## Next (minor) — WongStack cleans up after itself` entry at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating** note (first sweep may close several old chats; `WONG_TIDY=0` turns it off). `tidy.mjs` ships with the whole `routine` skill folder, so the manifest needs no edit. Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs`; verify all pass.
- [x] 4.2 Save with `/save`, and verify CI passes on the pushed branch.
