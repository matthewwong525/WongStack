# Fix the 19.0.0 follow-ups

**Status:** ready-to-ship
**Branch:** plan-19-0-1-fixes
**Open questions:** none

## Why

A real capture pass after the 19.0.0 merge was denied again, so background memory capture still fails on every run. The 19.0.0 fix sent JSON through a heredoc, and the test that proved it used plain JSON. Two smaller faults showed up at the same merge: `/ship` prints a false delete error now that GitHub deletes the head branch itself, and Dependabot proposes an `@types/node` major that the Node 22 pin rejects.

## What Changes

- **Background capture writes its JSON to a temp folder outside the repo, then passes the path.** Under `dontAsk`, Claude Code denies a multi-line heredoc whose JSON holds characters such as `<`, `>`, `|`, or `$`, and it denies every write under `.git/`. `run.mjs` makes one temp folder per run, grants writes to it alone with `Edit(/<dir>/**)` and `--add-dir <dir>`, and deletes it when the run ends. The runbook tells the model to write each input there and to run `put-facts --file <dir>/<name>.json`. Codex gets the same folder as a writable root. Interactive sessions keep the stdin heredoc (review.html#/capture)
- **A test pins the grant to the runbook.** It fails when the runbook names a heredoc, a file outside the granted folder, or a command outside the `Bash(...)` grant. A task also records one real `claude -p` capture pass on JSON with `<name>` and `>`, because CI runs no model.
- **`/ship` skips a branch that GitHub already deleted.** Step 5 still retargets stacked PRs. Then it deletes the remote branch only when `git ls-remote --heads` still lists it, and it reports "already deleted at merge" otherwise. A failed `ls-remote` stops as before.
- **Dependabot ignores `@types/node` majors.** `.github/dependabot.yml` gets an ignore rule for `version-update:semver-major` on `@types/node`, so the types follow the Node major in `.nvmrc`. This file is in the source repo only, not in the payload.
- **Release 19.0.2.** `VERSION` and a `CHANGELOG.md` entry.

**Non-goals:** No review or merge of the open Dependabot PRs #106–#113, other than #111 closing under the new rule. No change to the memory store, its schema, or the interactive write path. No change to GitHub's auto-delete setting.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory-capture`: the background run writes its JSON input only into a per-run temp folder outside the repo, which is the only write it is granted, instead of sending it on stdin.
- `delivery-gate`: `/ship` tolerates a remote branch that the forge already deleted at merge.

## Impact

- **Skills:** `.agents/skills/memory/scripts/run.mjs`, `memory/SKILL.md` (Background run section), the `--spooled` hint in `memory/scripts/memory.mjs`, and `ship/SKILL.md` Step 5.
- **Tests:** `scripts/tests/memory-capture.test.mjs`.
- **Config:** `.github/dependabot.yml`.
- **Release:** `VERSION` → 19.0.2, `CHANGELOG.md`.
- **Memory:** closes threads #151, #155, and #156 at save.

## Decision log

- **2026-09-26** — Asked the next step after the 19.0.0 ship → chose **ship a 19.0.1 fix** for capture, the branch-delete error, and the Dependabot rule, before the Dependabot PRs are reviewed.
- **2026-09-26** — Assumed: the capture input goes in a folder from `os.tmpdir()`, not under the repo or `.git/`. Claude Code denies writes under `.git/` in any mode, and a folder in the worktree would show in `git status`. The probe on 2026-09-26 (memory #157) confirmed that `Edit(//abs/**)` plus `--add-dir` lets the Write tool write there under `dontAsk`.
- **2026-09-26** — Assumed: the grant stays one `Bash(...)` rule plus one `Edit(...)` rule for that folder. `Write(...)` rules do not govern the Write tool in headless Claude Code; `Edit(...)` rules do.
- **2026-09-26** — Assumed: interactive `/save` keeps the stdin heredoc in the Write section. A user is present to approve it, and a second path would double the instructions.
- **2026-09-26** — Assumed: `/ship` checks `git ls-remote --exit-code --heads` before the delete, rather than ignoring a failed delete. Exit 2 means already gone; any other failure still stops and reports, so a network fault is not hidden.
- **2026-09-26** — Assumed: Dependabot closes #111 by itself once the ignore rule is on `main`. If it is still open after the next Dependabot run, a task closes it with a comment that names the rule.
- **2026-09-26** — Changed during apply: the runbook also embeds `## Write`, whose example was a heredoc. `## Write` now shows the JSON in a `json` block, names `--file <input>` (a path, or `-`), and keeps the heredoc in one **From a session** paragraph that `runbook()` drops. The test fails if `<<` reaches the background prompt. The `spool` hint reads `put-facts --file <input> --spooled <file>`.
- **2026-09-26** — Probed during apply: `agentCommand('claude', …)` output run with `claude -p` under `dontAsk`. Haiku wrote `gate-1.json` holding `<name> needs node >=22 | pipe $HOME` into the input folder and ran `gate --file` on it. There were zero permission denials, and `withInputDir` removed the folder. `gate` only reads, so the probe wrote no fact.
- **2026-09-26** — Probed during apply, end to end: the real runbook through `agentCommand` under `dontAsk`, with `stream-json` tracing. It ran `spool`, `pending`, and `strip` on 4 sessions. It wrote 8 JSON files into the input folder, ran `gate` and `put-facts --file` on them, and ran `due`, `live`, and both `finish-run` calls: 2 captured (7 facts added), 2 skipped, and zero permission denials. A hook-started run just before it reported `ok` with `private 4` but wrote nothing, and the store shows 0 private sessions. `finish-run` trusts the model's counts, which is out of scope here and is recorded as a memory thread.
- **2026-09-26** — Changed during apply: closing Dependabot PR #111 after the merge left the task list, because `/ship` archives only a change whose tasks are all checked. It is a memory thread instead.
- **2026-09-26** — Changed during save: `main` gained v19.0.1 (`remove-notes-migration`, #114) while this change was applied, so this release is 19.0.2. The earlier entries keep the number they were written with.
- **2026-09-26** — Saved the implementation (13 of 13 tasks) for CI, with the deltas reconciled into `openspec/specs/`. Closed memory threads #151, #155 (replaced by a narrower post-merge thread on PR #111), and #156. New threads: `finish-run` trusts model-reported counts, and the memory test harness leaks `/tmp` folders.
- **2026-09-26** — Distilled facts before the archive: `wiki/development/memory.md` (How facts are captured) now says the run writes JSON into a temp folder, replacing the stale stdin sentence, and that a headless `claude -p` inside the checkout fires the hook unless `WONG_MEMORY_RUN=1` is set (fact #170).
- **2026-09-26** — Archived after CI passed on PR #115, with the deltas already reconciled into `openspec/specs/`, so the archive used `--skip-specs`.
