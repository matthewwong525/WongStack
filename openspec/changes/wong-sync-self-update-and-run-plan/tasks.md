## 1. Self-update pass — .agents/skills/wong-sync/SKILL.md

- [x] 1.1 Add the self-update pass at the top of Step 2, before the general file loop: apply update-if-untouched to `SKILL.md` + `references/**` of this skill's own directory, reusing the proof already defined there rather than restating it, and exclude those files from the general loop so nothing is considered twice.
- [x] 1.2 State the re-read semantics: re-read `SKILL.md` and `references/**` and discard the running instructions; re-run Step 0's manifest resolution against the new text; keep Step 1's refreshed clone, `LATEST`, `WS_HEAD`, and changelog list with no second fetch.
- [x] 1.3 State the guards: the pass runs at most once per run (hard rule, not left to the proof), and a `wong-sync` that fails the blob proof is never touched — the run says plainly it is continuing on the installed version, names it, and leaves the adaptation to Step 3's ordinary `adopt` path.
- [x] 1.4 Update the five-box pipeline diagram and the opener so Step 2 reads as self-update-then-copy/update, and note in the "no git" rule that reading clone history to prove a file unmodified is not a mutation.

## 2. One plan per run — SKILL.md Step 3/5 + references/adapt.md

- [x] 2.1 In `references/adapt.md`'s output contract, rename `adopt-wongstack-<YYYY-MM-DD>/` to `sync-wongstack-<YYYY-MM-DD>/` (keeping the `-2`/`-3` collision rule) and change the write trigger from "only when something is `adopt`" to "whenever the run copied, updated, self-updated, or has an `adopt`"; state that pre-existing `adopt-wongstack-*` folders are left alone.
- [x] 2.2 Specify `proposal.md`'s contents in `adapt.md`: version span, files copied, files updated with version spans, the self-update when it happened, each adoption and what it buys this repo, and the pointer to `.claude/wong-sync-verdicts.md` — with landed edits described as landed, not written as tasks.
- [x] 2.3 Specify `tasks.md` in `adapt.md`: one task per `adopt`, preceded by a single review task when any file change landed; keep the concreteness bar for adoption tasks; keep "no-op run writes no folder".
- [x] 2.4 Update the ASCII diagram in `adapt.md` and the Step 3 summary in `SKILL.md` to the new folder name and trigger, and reconcile every other mention of `adopt-wongstack` in the payload (grep `.agents/` and `AGENTS.md`, since `grep -r` does not follow the `.claude` symlinks).
- [x] 2.5 Add the self-update line to Step 5's report alongside Copied/Updated, including the version span and the statement that the rest of the run followed the newer instructions.

## 3. Release

- [x] 3.1 Add the newest-first `CHANGELOG.md` entry covering both behaviors and bump `VERSION` (minor, from 9.10.0).
- [x] 3.2 Run `node scripts/check-payload-links.mjs` and fix anything dead.
