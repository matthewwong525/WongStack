# Tasks

## 1. Save script (`.agents/memory/knowledge.mjs`)

- [x] 1.1 Port ClaymooApp's new `knowledge.mjs` (PR #2361) with WongStack's paths (`.claude/memory/knowledge.mjs`, `wiki/stack/company-knowledge.md`, `.claude/.wong-stack.json`), WongStack's unexported `helperConfig`, and no Git 2.38–2.39 stand-in or Windows prefix change. Verify `node --test scripts/tests/knowledge.test.mjs` passes, with the ported cases: a save while the folder has an unsaved edit on a page the tip changed, a held save that clashes, forward merges, `.mine`, untracked pages, the wip mark, exit 4, two chats' folders, the symlink switch, `-2` branches, `remove`, `folders --send`, and carried pages.
- [x] 1.2 Make `remove`'s refusal print the save command, so `/close` names no WongStack file.

## 2. Callers

- [x] 2.1 Switch `session-start.mjs`, `worktree-secrets.mjs`, `.agents/daily/profile.mjs` and `tidy-pages.mjs` from `linkCopy` to `folderFor`; retire `linkCopy` in `scripts/retired-names.json`. Verify `node scripts/check-retired-names.mjs`.
- [x] 2.2 `tidyPrepare` runs `folders --send`; add `tidyCleanup` and the profile's `tidy.cleanup`; `run.mjs` calls it in its `finally` (memory module 5.1.0). Verify `scripts/tests/knowledge-folders.test.mjs` and `scripts/tests/memory-daily.test.mjs` pass.
- [x] 2.3 `closeWorkspace` runs tidy.mjs's dry run, then `knowledge.mjs remove`, with exits 7 and 8; `/close` names both (loop module 3.3.0). Verify `node --test scripts/tests/loop-profile.test.mjs`.

## 3. Docs and release

- [x] 3.1 Update `wiki/stack/company-knowledge.md`, `wiki/development/wiki-dream.md` (new *Edits left behind*) and `wiki/development/memory.md`; add the spec delta and the `## Next (minor)` changelog entry. Verify `node scripts/payload-checks.mjs` passes.
