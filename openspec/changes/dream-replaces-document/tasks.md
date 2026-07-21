## 1. Upstream the payload from WongOS

- [x] 1.1 Add `.claude/skills/dream/SKILL.md`; delete `.claude/skills/document/` (SKILL.md + `references/progressive-disclosure.md`)
- [x] 1.2 Update `improve` — SKILL.md + `references/docs-audit-playbook.md` resolve the wiki root (`wiki/`, falling back to `docs/`) instead of hardcoding `docs/`
- [x] 1.3 Update `ship` — docs-distillation cross-references point at `/dream`
- [x] 1.4 Replace the `CLAUDE.md` WONG-STACK block — `wiki/` paths, `/dream` in the skill roster
- [x] 1.5 Update the convention pages `docs/wiki-style.md` (`/dream` as the gardener), `docs/voice.md`, `docs/development/secrets.md`

## 2. Make the repo consistent with the rename

- [x] 2.1 `install-wong-stack`: payload skill list + `.wong-stack.json` manifest say `dream`, not `document`
- [x] 2.2 `contribute-wong-stack`: manifest workflow-skill list says `dream`, not `document`
- [x] 2.3 `CLAUDE.md`: rulebook-canonical line points at `docs/wiki-style.md` (the deleted `references/progressive-disclosure.md` was its source)
- [x] 2.4 `README.md`: skill tables, install lists, and repo tree reference `/dream`; no `document/` reference remains
- [x] 2.5 Delta spec for `contribute-wong-stack` (manifest lists `dream`), folded into `openspec/specs/`

## 3. Release

- [x] 3.1 Bump `VERSION` 4.3.0 → 4.4.0 (minor — new skill behavior)
- [x] 3.2 Add newest-first `CHANGELOG.md` entry naming what was upstreamed and that it came from WongOS
