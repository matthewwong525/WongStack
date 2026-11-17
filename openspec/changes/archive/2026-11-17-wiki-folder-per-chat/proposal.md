# Each chat gets its own company folder, and a save never gets stuck

**Status:** ready-to-ship
**Branch:** wiki-folder-per-chat
**Open questions:** none

## Why

Every chat on a computer shares one company-knowledge folder. When one chat leaves an edit unsaved and the team later changes that page, every other chat's save on that computer gets stuck: the save's commit stays on the computer and the team never sees it. A ClaymooApp computer had 7 leftover drafts holding back 11 saves, some for a day, 6 times in 9 days. ClaymooApp fixed it in its PR #2361; this change brings the fix to every WongStack repo.

## What Changes

- **Each chat workspace gets its own `knowledge/` folder**: a git worktree of the computer's shared copy, on the branch `chat/<workspace>`. Another chat's unsaved edit is never in its folder, so it can't stop its save. Only `main` is sent to the app.
- **Open chats switch by themselves.** At the next chat start, the old `knowledge` link becomes the chat's own folder. Only the link is removed; the shared copy keeps every file and save.
- **A save builds on the newest published version in memory, pushes with no force, then moves the folder forward**, with its unsaved edits merged on top. No unsaved edit stops it.
- **A clash publishes the rest.** The clashing page keeps the published text, and the chat's version goes beside it as `<page>.mine.<ext>`. The save prints `saved=`, one `conflict=` line per page, and exits 4.
- **Only a link problem the save adds stops it.** A broken link already published stops no one.
- **New commands:** `knowledge.mjs remove [--discard]` and `knowledge.mjs folders [--send]`.
- **`/close` removes the chat's folder**: unsaved or clashing pages stop it with exit 7, another save running with exit 8; on discard it drops them.
- **The daily tidy sends saves chats left behind** before its first map, merges an ended chat's clash, and removes its own folder when its run ends, through a new `tidy.cleanup` profile slot.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `company-knowledge`: each chat workspace has its own folder; a save merges onto the newest published version and is never stopped by unsaved edits; `/close` and the daily tidy finish what a chat leaves behind.

## Impact

- `.agents/memory/knowledge.mjs`: `place` gains `dir`; `linkCopy` becomes `folderFor`; `publish` builds in memory, then `forward`; new `remove`, `folders`, `clashes`; `saveProblems(k, commit, base)`.
- Callers: `.agents/memory/session-start.mjs`, `.agents/loop/worktree-secrets.mjs`, `.agents/daily/profile.mjs`, `.agents/memory/tidy-pages.mjs` and `.agents/memory/profile.mjs`, `.agents/loop/profile.mjs` (`closeWorkspace`).
- Modules: the memory module's `run.mjs` calls the new `tidy.cleanup` slot (5.1.0); `/close` names exits 7 and 8 (loop 3.3.0).
- Docs: `wiki/stack/company-knowledge.md`, `wiki/development/wiki-dream.md`, `wiki/development/memory.md`.
- Tests: `scripts/tests/knowledge.test.mjs`, the new `scripts/tests/knowledge-folders.test.mjs`, `scripts/tests/loop-profile.test.mjs`, `scripts/tests/memory-daily.test.mjs`.

## Decision log

- **2026-11-17** — Asked by the owner to bring ClaymooApp's "each chat gets its own wiki folder" fix (PR #2361) to WongStack → port it, generalized, and ship it.
- **2026-11-17** — Assumed: the Daily module's worker gets no knowledge step when it deletes a job copy, because a module may reach no file outside its folder. Deleting the copy deletes only the job folder's own files; the shared copy's record of that folder is pruned at the next `folderFor` or `folders`, and a held save keeps its branch for `folders --send`. A test covers it.
- **2026-11-17** — Assumed: the daily tidy's `prepare` runs `folders --send` itself, in code, instead of a step in the memory module's tidy brief, because that brief ships in the module and can name no WongStack file. The tidy learns to merge a `.mine` page from the profile's `publish` line.
- **2026-11-17** — Assumed: the tidy does not save facts from another open chat's unsaved drafts (ClaymooApp's step 3), because that chat keeps its own edits and `/close` saves them; the generic tidy brief can't name the command.
- **2026-11-17** — Assumed: `/close`'s text names only exits 7 and 8, and `knowledge.mjs remove` prints the save command, because the close skill ships in the loop module and can name no WongStack file.
- **2026-11-17** — Assumed: ClaymooApp's own differences stay out (its Git 2.38–2.39 stand-in merge, its Windows path fix, its install-record reader, the one-off clear-up of its stuck copy), because they are not part of this fix.
- **2026-11-17** — Archive checkpoint: `/ship` archived the change and numbered it 61.10.0; payload checks pass and the full test run has no failures.
