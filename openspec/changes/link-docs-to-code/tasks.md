# Tasks

## 1. The link library and wiki check

- [x] 1.1 Write `.agents/skills/memory/scripts/lib/links.mjs` (`backlinks`, `checkWiki`) per design.md; verify `checkWiki` returns nothing on this repo.
- [x] 1.2 Write `.github/scripts/wiki-links.mjs` and its *Check the wiki's links* step and Summary sentence in `.github/workflows/test.yml`; add the script to `payload-files.json` and the payload manifest; verify `node .github/scripts/wiki-links.mjs` passes here and `node scripts/check-payload-links.mjs` passes.
- [x] 1.3 Write `scripts/tests/wiki-links.test.mjs` on temp fixtures: a dead link, an orphan page, a hub missing a page, an assets-only folder exempt, a link in a code fence ignored, `.claude/` read as `.agents/`, a folder target, archives skipped, no `wiki/` passes; verify each guard is seen refusing.

## 2. The one lookup (memory skill)

- [x] 2.1 Add a `docs` list to each entry in `.agents/skills/memory/references/areas.json`, naming every `openspec/specs/*/spec.md` under at least one area and the wiki pages that own each area; add new areas (at least `browser`) where no area fits; verify every spec is named and every named path exists.
- [x] 2.2 Widen `memory.mjs areas` per design.md: topic positionals, `Docs:`, `Past changes:`, and `Linked from:` before the store opens; verify `memory.mjs areas app/worker/apps/x.ts` lists `wiki/stack/mini-apps.md`, the mini-apps spec, and `2026-10-01-mini-apps-in-the-main-app`, and `memory.mjs areas mini-apps` lists the same docs.
- [x] 2.3 Extend `scripts/tests/memory-areas.test.mjs`: docs, past changes, and backlinks printed before facts and with an unreachable store; missing docs skipped; exact-path past changes ranked before area-only ones and capped at 5; backlinks only for positional paths; a topic name resolved; every spec named by an area; every named doc exists; verify the coverage test fails when a spec is removed from the list.
- [x] 2.4 Update the `areas` row in the memory `SKILL.md`, step 1 of `.agents/skills/apply/references/build-helper.md`, and *Facts by code area* in `wiki/development/memory.md`, each offset by an equal cut; verify with `node scripts/measure-context.mjs --json` that none grew.

## 3. Where agents learn about it

- [x] 3.1 Name the lookup in `AGENTS.md` *Where context lives* and add the move and orphan lines to `wiki/wiki-style.md`, each offset by an equal cut; verify AGENTS.md's word count did not grow and `node .github/scripts/wiki-links.mjs` still passes.

## 4. Release

- [x] 4.1 Add a `## Next (minor) — One web of code, facts, wiki pages, specs, and past plans` entry to `CHANGELOG.md`, with a plain *Updating* note that an install's wiki is now checked on each publish; verify `check-payload-links.mjs`, `check-retired-names.mjs`, and `measure-context.mjs --check` pass.
- [ ] 4.2 Run `/save` and confirm CI passes on the pull request, the new wiki step included.
