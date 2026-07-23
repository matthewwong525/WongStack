## 1. Move the tree

- [x] 1.1 `git mv docs wiki` — one directory move so rename detection holds (design decision 1), covering `README.md`, `wiki-style.md`, `voice.md`, `ux-principles.md`, and `development/{README.md, adding-a-skill.md, secrets.md, the-change-loop.md}`
- [ ] 1.2 Commit the pure rename on its own, before any reference edits (design decision 2), and confirm `git log --follow wiki/wiki-style.md` reaches the file's earlier revisions

## 2. Repair references in the wiki itself

- [x] 2.1 `wiki/README.md` — the "New section? Add a `docs/<section>/README.md` hub" line becomes `wiki/<section>/README.md`; verify the relative links to `wiki-style.md`, `voice.md`, `ux-principles.md`, and `development/README.md` still resolve
- [x] 2.2 `wiki/development/README.md` — the payload list's `[docs/](../README.md)` self-reference becomes `wiki/`; check its `../../` links to `.claude/skills/`, `VERSION`, `CHANGELOG.md`, and `CLAUDE.md`
- [x] 2.3 `wiki/voice.md`, `wiki/wiki-style.md`, `wiki/ux-principles.md`, `wiki/development/{adding-a-skill,secrets,the-change-loop}.md` — sweep each for `docs/` mentions and classify per design decision 4 before editing

## 3. Repair references in the payload surfaces

- [x] 3.1 `CLAUDE.md` — payload list `[docs/](docs/)` → `[wiki/](wiki/)`; the Rulebook-canonical line's `docs/wiki-style.md` → `wiki/wiki-style.md`; confirm the already-`wiki/` links in "Where context lives" (`wiki/README.md`, `wiki/wiki-style.md`) now resolve
- [x] 3.2 `README.md` — the repo tree diagram (`├── docs/{README.md, wiki-style.md}`) and the "installing into a target repo gives it" line; keep the `/improve docs` row's generic "(`wiki/`, falling back to `docs/`)" phrasing intact
- [x] 3.3 `.claude/skills/plan/SKILL.md` — three `docs/ux-principles.md` mentions incl. the relative link `../../../docs/ux-principles.md` → `../../../wiki/ux-principles.md`; verify the target file exists at that path
- [x] 3.4 `.claude/skills/dream/SKILL.md` — verify its existing `../../../wiki/wiki-style.md` link now resolves (no edit expected); leave the "falling back to `docs/`" resolution sentence alone
- [x] 3.5 `.claude/skills/improve/` — `SKILL.md` and `references/docs-audit-playbook.md`: leave every wiki-root resolution sentence, the `docs/adr/` glob, and the `docs` variant name untouched (design decision 4); edit only WongStack's own page paths
- [x] 3.6 `.claude/skills/wong-setup/SKILL.md` + `references/fit-playbook.md` — the research/seed steps and the research-hook question phrase a target's wiki generically rather than as `docs/`
- [x] 3.7 `.claude/skills/wong-sync/references/payload-manifest.md` — confirm the convention-page entries still resolve to the target's wiki root and name WongStack's own source paths as `wiki/`
- [x] 3.8 `openspec/config.yaml` — the `context` block's "the docs/ progressive-disclosure wiki" and the `design` rule's `docs/ux-principles.md` → `wiki/`

## 4. Active OpenSpec change

- [x] 4.1 `openspec/changes/recommended-stack-guide/` — rewrite the `docs/` paths in `proposal.md`, `design.md`, `tasks.md`, and `specs/stack-guide/spec.md` to `wiki/` so implementing it doesn't recreate `docs/`
- [x] 4.2 Leave `openspec/changes/archive/**` and existing `CHANGELOG.md` sections unrewritten (design non-goal); `improve-openspec-plans` needs no edits
- [x] 4.3 Add a `delivery-gate` delta spec — the 6.1 grep surfaced `docs/development/the-change-loop.md` inside its doctrine-text requirement, which the original plan missed

## 5. Release ritual

- [x] 5.1 Bump `VERSION` to `6.1.0` (design decision 5)
- [x] 5.2 Add the newest-first `CHANGELOG.md` entry: the source wiki moved to `wiki/`, the `wiki/`-then-`docs/` fallback is unchanged, and no installed repo needs to act

## 6. Verify

- [x] 6.1 `grep -rn "docs/" . --include='*.md' --include='*.yaml'` excluding `CHANGELOG.md` and `openspec/changes/archive/` — classify every surviving hit against the design's decision-4 table; nothing unexplained remains
- [x] 6.2 Repeat with a bare word-boundary `docs` grep to catch mentions without a trailing slash (design risk 1)
- [x] 6.3 Check each relative link out of `plan/SKILL.md`, `dream/SKILL.md`, `wiki/README.md`, and `wiki/development/README.md` resolves to an existing file
- [x] 6.4 Confirm no `docs/` directory remains at the repo root and `openspec validate rename-docs-to-wiki` passes
