# Design

## Context

See [the proposal](proposal.md) for the why. Nine files in `.agents/skills/verify/scripts/` serve the private links, not `/verify`: `hand-over.mjs`, `hand-over-page.{html,mjs}`, `keys.mjs`, `keys-page.{html,mjs}`, `passwords.mjs`, and `passwords-page.{html,mjs}`. `hand-over.mjs` imports `../../memory/scripts/lib/cli.mjs`, `../../memory/scripts/lib/primary-root.mjs`, and `../../routine/scripts/lib/paseo.mjs`; `keys.mjs` imports `../../ship/scripts/worktree-secrets.mjs`. Startup instructions sit at 2,200 words, exactly the `startupCeiling`, and `measure-context.mjs` counts every `SKILL.md` description, hidden or not.

## Decisions

- **`git mv` the nine files to `.agents/skills/hand-over/scripts/`.** The new folder sits at the same depth as `verify/`, so every relative import (`./keys.mjs`, `../../memory/...`, `../../routine/...`, `../../ship/...`) resolves unchanged. Moving keeps each file's history.
- **A hidden `SKILL.md`.** Frontmatter `name: hand-over`, a description of about ten words (the private-link tool: hand the browser over, receive keys, save passwords), `hidden: true`, and `disable-model-invocation: true`, as `agent-browser` does. The body is two or three lines naming the three modes and linking the pages that own when and how: [browsing: hand the browser over](../../../wiki/development/browsing.md#hand-the-browser-over), [save your passwords](../../../wiki/development/browsing.md#save-your-passwords), and [secrets: the key link](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link). It repeats no command; the wiki pages keep them.
- **Offset the startup words.** Trim at least as many words from other skills' descriptions as the new description adds, keeping each description's meaning, so `node scripts/measure-context.mjs --check` passes without raising `startupCeiling`. Alternative: raise the ceiling. Rejected: raising it is a recorded decision for real growth, and this move adds no behavior.
- **Update every live reference.** The commands and links in `wiki/development/browsing.md` and `wiki/development/secrets.md`, `close/SKILL.md`'s close line, `hand-over.mjs`'s usage comment and header, the comment in `ship/scripts/worktree-secrets.mjs`, the imports and paths in `scripts/tests/{hand-over,hand-over-page,keys,passwords,passwords-page}.test.mjs`, and the `scripts/tests/cli-conventions.test.mjs` entry. Archives stay untouched.
- **Ship it.** Add `hand-over` to `core.skillDirs` in `payload-files.json` and name it in the payload manifest's Core list. Register `verify/scripts/hand-over`, `verify/scripts/keys`, and `verify/scripts/passwords` in `scripts/retired-names.json`, pointing at `hand-over/scripts/`, so `check-retired-names.mjs` catches a missed mention.
- **The context baseline.** If `measure-context.mjs --check` reports the moved files as a change against `scripts/fixtures/context-baseline.json`, follow its existing rule for renamed paths. Never raise a limit to make it pass.

## Risks / Trade-offs

- An install updates while a private link is open → its detached watcher still runs from the removed path. The Updating note says to let an open link finish first; the link closes itself within 10 minutes anyway.
- Codex lists hidden skills → the short description says what it is; `disable-model-invocation` keeps Claude from loading it.
- A missed path → the tests import the new paths, `check-payload-links.mjs` resolves links against an install's file set, and `check-retired-names.mjs` flags the old ones.

## Migration Plan

A minor payload release: `## Next (minor)` with an Updating note, in plain words, to let any open private link finish before updating. `/wong-sync`'s preflight shows the nine removals under `verify/` and the new `hand-over/` folder. CI runs the moved tests. No app preview: nothing under `app/` or `mini-apps/` changes.
