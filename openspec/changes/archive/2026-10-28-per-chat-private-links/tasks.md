# Tasks

## 1. Script and tests

- [x] 1.1 Port WongOS#170's `hand-over.mjs` changes (per-chat `links/<chat>/` place, `viewHolder()` and the view-opener mark, `useOwnPlace()` at `wait` and `close`, holder names in blocked-open messages, help text) onto `.agents/skills/hand-over/scripts/hand-over.mjs`; verify `diff` against WongOS's copy shows no difference
- [x] 1.2 Move `scripts/tests/hand-over.test.mjs`'s fixture state path to the chat's folder and add WongOS's per-chat tests (two chats, close is per chat, same-chat replacement only, busy chat named, one live view and two starting at once, older links: kept, own closed, other's untouched); verify `node --test scripts/tests/hand-over.test.mjs` passes

## 2. Docs and specs

- [x] 2.1 Rewrite the one-link lines in `wiki/development/browsing.md`, `secrets.md`, `passwords.md`, `private-form.md` and `live-view.md` for one link per chat and one live view on the computer, against the current text; verify `node scripts/check-payload-links.mjs` passes
- [x] 2.2 Add `openspec/specs/private-links/spec.md` to the `browser` area's docs in `.agents/skills/memory/references/areas.json`; verify `node --test scripts/tests/memory-areas.test.mjs` passes
- [x] 2.3 Add a `## Next (minor) — Each chat gets its own private link` entry to `CHANGELOG.md`, with **Updating.** *Nothing to do. A link open during the update keeps working until it closes.*; verify the entry sits at the top of the entries

## 3. Verification

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree`; verify it passes
- [x] 3.2 Open the pull request against `matthewwong525/WongStack` `main` after Matthew's yes (given 2026-10-28; `/ship`'s save opens it), with a body that argues generality (any install with two chats hits it) and cites the 2026-10-25 evidence without private names or paths; verify CI passes
