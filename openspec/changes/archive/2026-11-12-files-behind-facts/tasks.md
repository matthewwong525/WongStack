# Tasks

## 1. The list (memory plugin)

- [x] 1.1 Add `.agents/plugins/memory/scripts/lib/files.mjs` with `namedPaths` and `filesBehind` by design decisions 1 and 3; verify with new cases in `scripts/tests/memory-files.test.mjs`: a shared file ranks first with every fact id, a missing path is dropped, a named path outranks a touched one, one change adds at most ten files, a fact with no change and no path gets its topic's docs, and a profile without `lookup.files` still answers.
- [x] 1.2 Add `changeFiles` to `.agents/memory/lookup.mjs` and the `lookup.files` part to `.agents/memory/profile.mjs` by design decision 2; verify in `scripts/tests/memory-files.test.mjs` against a temporary git repo: a squash commit's files come back sorted by changed lines without the plan folder, `CHANGELOG.md`, `VERSION`, or a lockfile; an active change returns its plan's existing paths; a file renamed after the change, then renamed again, comes back at its newest path; a deleted file is dropped; the rename read runs once per call and not when every path exists; a repo with no git returns the archive plan's named paths and does not throw.

## 2. Recall

- [x] 2.1 Build the list in `recallPacket` and admit it in `renderPacket` by design decision 4; verify with new cases in `scripts/tests/document-recall.test.mjs`: the text block and its label, the JSON `files` and `sources.files` with `version` 1, the 600-byte cap, no admitted fact or passage lost against the same input without files, no entry for a fact that was not admitted, no list on `documents`, and the packet at or under 6,144 bytes.
- [x] 2.2 Bound the lookup at 1,500 ms inside recall's deadline; verify with a test whose `lookup.files` never settles: recall returns its facts and passages, `sources.files` is `unavailable`, and the exit code is as without the list.

## 3. Pull

- [x] 3.1 Add the `files` section to `changeAnswer` and `factAnswer` in `.agents/plugins/memory/scripts/lib/pull.mjs` by design decision 5; verify with new cases in `scripts/tests/memory-pull.test.mjs`: three entries and a count of the rest, `--more files` shows the group whole, the JSON carries it, a change's files print when the store does not answer, and the answer stays within 60 lines and 6 KB.

## 4. Docs and release

- [x] 4.1 Add the section *Files behind the facts* to `wiki/development/document-retrieval.md`, and update the `lookup` row and the *One lookup* bullet in `wiki/development/memory.md` with an equal cut; verify `wc -w wiki/development/memory.md` is under 3,000 and the wiki checks pass.
- [x] 4.2 Add the `## Next (minor) — Memory shows the files behind each fact` entry to `CHANGELOG.md` with **Updating.** *Nothing to do by hand.*; verify `node scripts/check-payload-links.mjs` passes.
- [x] 4.3 Add `scripts/tests/manual/files-line-replay.mjs`, which repeats the proposal's replay through the real `filesBehind`; verify it prints the count of changes with a right file, the right files per answer, and the median added time.

## 5. Checks

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate files-behind-facts --strict --no-interactive`; verify both pass, with `measure-context.mjs --check` unchanged.
- [x] 5.2 Run `node scripts/tests/manual/files-line-replay.mjs 60`; verify a right file for at least 60% of the changes and a median of at most 700 ms added, and write both numbers in the proposal's Decision log.

## 6. Review fixes

- [x] 6.1 In `changeFiles`, follow moves only for a path that does not exist now, and replay only the moves made from that path's own change on, so a name moved twice reaches the right file (design decision 2.3); verify with two new cases in `scripts/tests/memory-files.test.mjs` that fail before the fix: a newer change's recreated file keeps its path, and an old name moved twice sends each change to its own file.
- [x] 6.2 In `renderPacket`, say `sources.files` is `ok` only when an entry is admitted, else `empty`, and keep `unavailable`; verify with a new case in `scripts/tests/document-recall.test.mjs` that fails before the fix: every entry's facts cut gives `files: []` and `{ state: 'empty' }`.
