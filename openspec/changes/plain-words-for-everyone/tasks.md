# Tasks

## 1. The shared rule

- [x] 1.1 Rename *Write at the reader's level* in `.agents/skills/explore/references/asking-the-user.md` to *Write in plain words* and rewrite it per design.md. Verify: `grep -rn "Technical level\|non-technical reader\|technical reader\|reader's level" .agents wiki AGENTS.md openspec/config.yaml` finds nothing.
- [x] 1.2 In `wiki/wiki-style.md` *People*, replace the level paragraph with where a standing ask for detail goes.

## 2. Skills and pages

- [x] 2.1 Move every link to `#write-at-the-readers-level` to `#write-in-plain-words`, and drop the reader split in `AGENTS.md`, `openspec/config.yaml`, `/plan`, `/apply`, `/save`, `/continue`, `/ship`, `wong-setup/references/tools.md`, and `wiki/development/the-change-loop.md`. Verify: `/save` still prints its gate line inside another verb.

## 3. Release

- [x] 3.1 Bump `VERSION` 25.13.0 → 25.14.0 and add a `CHANGELOG.md` entry whose **Updating** line says an old `**Technical level:**` line can be deleted.
- [x] 3.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `openspec validate plain-words-for-everyone --strict --no-interactive`. Verify: all pass.
- [ ] 3.3 CI passes on the pull request, checked by `/save`.
