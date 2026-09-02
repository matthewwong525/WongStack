# Tasks — slim-claude-md-into-rules

## 1. Rules layer

- [x] 1.1 Write `.agents/rules/openspec.md` (paths: `openspec/**`) — the cross-surface routing fact in rule form (Decision log vs note vs wiki), plus "OpenSpec never runs git"; restate nothing any surface's own doc owns.
- [x] 1.2 Write `.agents/rules/secrets.md` (paths: `.env*`, `**/.env.example`) — one-line reason to care + link to `wiki/development/secrets.md`; no `@`-import (design decision 1).
- [x] 1.3 Write `.agents/rules/payload.md` (meta-only; paths per design decision 3) — release ritual (VERSION bump, newest-first CHANGELOG entry, `node scripts/check-payload-links.mjs`), template-is-code, repo-relative paths in skills, git-fronting skills keep their OpenSpec step, pointer to `wiki/development/` for the rest.
- [x] 1.4 Reread `code.md`, `wiki.md`, `notes.md` against the new set — keep `@`-imports, adjust wording only where the new rules now own a fact.

## 2. CLAUDE.md rewrite

- [x] 2.1 Rewrite the meta half (above the WONG-STACK markers) to identity + pointers per design decision 4; move everything relocated into `payload.md` (task 1.3) rather than deleting it.
- [x] 2.2 Rewrite the WONG-STACK block to orientation-only per design decision 4: four-surfaces table, read-the-owning-doc, the loop in one line + change-loop link, git-ownership boundary, one-liners with links for STE-100, gate, prose allowlist, secrets, wiki discipline. Cut the per-verb prose, the `/wong-sync` bullet, and the long credentials paragraph.
- [x] 2.3 Verify every fact cut from CLAUDE.md has a surviving owner (rule, skill description, or linked wiki page) — walk the old file section by section against the new set.

## 3. Skill description trims

- [x] 3.1 Trim `save`, `verify`, `wong-sync` descriptions to ≤600 chars each, preserving trigger phrases; confirm each dropped behavior is stated in the skill body before cutting it.
- [x] 3.2 Trim `dream`, `improve`, `wong-cloudflare`, `wong-setup`, `update-dependencies` the same way.
- [x] 3.3 Trim `continue`, `ship`, `apply`, `plan`, `explore` the same way (several may already fit — verify, don't churn).
- [x] 3.4 Confirm no `openspec-*` or `agent-browser` frontmatter changed (`git diff --stat` on those paths is empty).

## 4. Manifest and release

- [x] 4.1 Add `.claude/rules/openspec.md` and `.claude/rules/secrets.md` to `payload-files.json` core; update `payload-manifest.md`'s rules paragraph, noting meta-only rules stay unlisted.
- [x] 4.2 Bump `VERSION` to 12.3.0 and add the newest-first `CHANGELOG.md` entry explaining the slim block and new rules (so `/wong-sync`'s after-picture can).
- [x] 4.3 Run `node scripts/check-payload-links.mjs` and fix anything it reports as dead — the CLAUDE.md rewrite moves several link sources.
- [x] 4.4 Measure the result: report old vs new byte counts for CLAUDE.md, the block, and total description chars in the change's Decision log.
