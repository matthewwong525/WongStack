# Design

## Context

`hand-over.mjs` keeps every link's files in one folder, `~/.wong-stack/hand-over/`. `open` refuses while that folder holds a live link (an unopened key link gives way), and `close` signals whatever watcher it finds there. So `/close` in one chat (`.agents/skills/close/SKILL.md` step: `hand-over.mjs close # only when this chat's private link is open`) closes another chat's link: the script can't tell whose link it is. Matthew's evidence: four key links closed about 3 s after another chat's `/close` on 2026-10-25, `cause: close-command` in `timings.jsonl`.

WongOS fixed this in matthewwong525/WongOS#170 (`394ae66`); `hand-over.mjs` has not changed there since. The fix is about 90 lines in one file and 250 lines of tests.

## Goals / Non-Goals

**Goals:** port that fix as written, so WongStack and WongOS run the same code again.

**Non-Goals:** no change to a link's page, its time limits, its waking, or the Inbox listing. No clean-up of an older shared-place link: it ends by itself.

## Decisions

- **Folder per chat, keyed by `sessionName()`.** `links/<chat>/` holds the link files; `<chat>` is the checkout's folder name, the same name `browse.mjs` gives the chat's browser session (a bare `.` or `..` becomes `default`). `timings.jsonl` stays in the shared folder. Alternative, keep one folder and make `close` check the state's `cwd`: smaller, but chats still block each other, so rejected.
- **Live view stays one per computer.** `viewHolder()` scans the shared folder and every chat folder for a live view with a live watcher, and a `view-opener.<pid>` mark covers the gap before a starting view writes its state. The open checks before and after writing its mark, so two at once can't both pass.
- **Older links: `useOwnPlace()`.** At `wait` and `close`, a chat with no files of its own points at the shared folder only when that link's state names it by `cwd` folder or `session`, and its watcher lives. Another chat's older link is never touched.
- **Port, then adapt to drift.** Copy WongOS's `hand-over.mjs` diff hunk by hunk onto WongStack's current file (they match except for the fix today). Wiki text has drifted since 2026-10-21, so rewrite the five pages' lines by hand rather than copy WongOS's.
- **Tests go where WongStack keeps them.** WongOS's `.agents/skills/hand-over/scripts/hand-over.test.mjs` becomes new tests in `scripts/tests/hand-over.test.mjs` (or a sibling `scripts/tests/private-links.test.mjs` if the fixture differs too much); the existing fixture's `f.state` moves to `links/<chat>`.

## Risks / Trade-offs

- [Two checkouts with the same folder name share a place] → the same as browser sessions today; names are worktree folders, which Paseo makes unique.
- [A link open while the update lands] → it keeps working in the shared folder and only its own chat reaches it; covered by the older-link tests.
- [Existing tests assume the shared folder] → update the fixture path once; run the whole suite.

## Migration Plan

Ship as a `minor` release. Installs get it at their next `/wong-sync`; no hand step. Roll back by reverting the release: a per-chat link open at that moment ends at its time limit.
