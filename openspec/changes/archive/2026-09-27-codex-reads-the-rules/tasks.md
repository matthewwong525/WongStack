# Tasks

## 1. Setup and sync

- [x] 1.1 In `.agents/skills/wong-sync/references/payload-manifest.md` *The agent folder*, add the rules-file layout (real `AGENTS.md` with the `WONG-STACK` block, `CLAUDE.md` linking to it) and the sync migration: move when only `CLAUDE.md` is real, reviewed merge when both are real, nothing when already linked; make the link with `MSYS=winsymlinks:nativestrict` on Windows.
- [x] 1.2 In `.agents/skills/wong-setup/SKILL.md`, have the setup prompt and the agent-folder step write `AGENTS.md` and `ln -s AGENTS.md CLAUDE.md`, with the Windows prefix.
- [x] 1.3 Check `.agents/skills/wong-sync/SKILL.md` and its references for any text that assumes a target's `CLAUDE.md` is a real file, and point it at the manifest rule.

## 2. Scripts and tests

- [x] 2.1 In `scripts/tests/wong-sync-preflight.test.mjs`, add a target whose `CLAUDE.md` links to `AGENTS.md`: an unchanged block classifies `installed-equivalent`, and an edited one `locally-adapted`.
- [x] 2.2 In `scripts/check-payload-links.mjs`, add `AGENTS.md` to the target file set and drop the shipped-page exception for a link through `CLAUDE.md`; update `scripts/tests/payload-links.test.mjs` so a shipped link through `CLAUDE.md` now fails with an `AGENTS.md` suggestion.

## 3. Docs

- [x] 3.1 Point shipped links to `CLAUDE.md` at `AGENTS.md`: `wiki/development/home.md`, `wiki/agent-knowledge-center.md`, `.agents/rules/wiki.md`, and any other hit from `grep -rn "CLAUDE.md" .agents wiki`.
- [x] 3.2 In `wiki/agent-knowledge-center.md`, replace "repos that use other agents can add an `AGENTS.md` pointer" with the shared-file layout, linked to the manifest.
- [x] 3.3 In `wiki/development/repo-layout.md`, drop the "a target has a real `CLAUDE.md` … and no `AGENTS.md`" paragraph; say every install keeps this layout.

## 4. Release

- [x] 4.1 Add a `## Next (minor) — Codex reads the WongStack rules in every install` entry at the top of `CHANGELOG.md`'s entries, saying the next `/wong-sync` moves `CLAUDE.md` to `AGENTS.md` with a link.
- [x] 4.2 Run `node scripts/check-payload-links.mjs` and the script suite (`TMPDIR=/var/tmp`); the payload checks in CI confirm on `/save`.
