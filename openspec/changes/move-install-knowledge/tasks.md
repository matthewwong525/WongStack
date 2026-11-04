# Tasks

## 1. Before building

- [x] 1.1 Confirm *The knowledge repo* shipped (45.8.0) and record its place, link forms and save in design.md; the live reader is not shipped, so the move holds where it is needed (Decision log, 2026-11-04).
- [x] 1.2 Bring `main` in, then run `node scripts/measure-context.mjs --json` to note skill-text headroom.

## 2. The move script

- [x] 2.1 Write `.agents/skills/wong-sync/scripts/knowledge-move.mjs` `plan` mode: own pages from the wiki root against the source's `payload-files.json` (`docsPath` mapping, per-file inside wholly shipped folders), `knowledge/` paths, non-pages as `stays`, collisions as an error, versioned JSON with `moves`, `stays`, `replacedReaders`, `readerShipped`, `held`, `rewrites`, `hand`, `outside`, counts by folder.
- [x] 2.2 Add the reference scan: relative Markdown links, bare paths, string literals equal to a moved path; `/docs/<slug>` routes and `slug:` values as `hand`; run-time readers (`?raw`, `readFile*`, globs, JSON/config values) become `stays` or `replaced-reader`; anything built from parts becomes `hand`; skip `openspec/changes/archive/`, `CHANGELOG.md` and memory.
- [x] 2.3 Write `move` mode: refuse a held move; copy each move into `knowledge/`, remove the originals, apply `rewrites`, add missing knowledge root hub links, write `.agents/knowledge-moves.json` with `base`, run `checkWiki` on `wiki` (or the docs root) and `knowledge` and print problems; no git commit, no knowledge save, never touch `hand` items.
- [x] 2.4 Write `recopy` mode: carry code-repo-only changes since `base` to `knowledge/`; exit non-zero naming each page changed in both, writing nothing.
- [x] 2.5 Write `scripts/tests/knowledge-move.test.mjs` on a made-up fixture install (no private repo names): a `docs/` root with `docsPath`, a `wiki/` root with own pages inside a shipped folder, a `?raw` import, a whole-tree glob with and without a shipped reader (held), a built path, a back-link to code kept as is, a non-page file, an archive file left alone, a collision, and recopy's three cases.

## 3. Preflight and the wiki check

- [x] 3.1 Add the `own-pages` catch-up code to `catchUpNeeds` in `.agents/skills/wong-sync/scripts/preflight.mjs`, with cases in `scripts/tests/wong-sync-preflight.test.mjs`: own pages and no moves list, a complete moves list, a shipped-only wiki.
- [x] 3.2 Make `.agents/skills/memory/scripts/lib/links.mjs` fail on a file at a path in `.agents/knowledge-moves.json`, naming its new place; cases in `scripts/tests/wiki-links.test.mjs`.
- [x] 3.3 Make `memory.mjs areas <old path>` print the new place from the moves list; a case in the memory tests.
- [x] 3.4 Report `own-pages` only with no moves list and an install below 45.8.0 or with `components.knowledgeMove: 'held'`; the held plan's install-record task sets the flag, the move's removes it; cases for 45.8.0, 26.0.0, a held 46.x and a moves list.
- [x] 3.5 Run `wiki-elsewhere` before the knowledge move when both are reported, in `catch-up.md`, `wiki/stack/company-knowledge.md` and design.md.
- [x] 3.6 In `knowledge-move.mjs`, make a string in code equal to a moved path a `hand` step, not a rewrite, and let a whole-wiki pattern hold the move only when code runs it (a comment's holds nothing; JSDoc lines are comments); tests for both.
- [x] 3.7 Hold `wiki-elsewhere` while the knowledge move is held, keeping `docsPath`, in `catch-up.md`, `wiki/stack/company-knowledge.md` and design.md; a preflight case (held, `docsPath`, own pages in `docs/` reports both codes) and a `plan` case on that record.

## 4. Skill text, spec, wiki and release

- [x] 4.1 Add step `own-pages` to `.agents/skills/wong-sync/references/catch-up.md`: run `knowledge-move.mjs plan`; a held move lists the pages and says it waits for the live reader; else list moves by folder and stays with their places, carry `hand` and `outside` items as tasks, set up the knowledge copy if missing, `move` in the build, fix the printed problems, `knowledge.mjs save`, `recopy` before publish (save again if it carried pages), and run `wiki-elsewhere` before it when both are reported (3.5). Offset its words to keep `measure-context.mjs --check` passing.
- [x] 4.2 Add a short section on moving an older install's pages, the moves list and old paths to `wiki/stack/company-knowledge.md`, linked from the catch-up step.
- [x] 4.3 Add `.agents/skills/wong-sync/scripts/knowledge-move.mjs` to `payload-files.json` and the payload manifest; map it in `.agents/skills/memory/references/areas.json`.
- [x] 4.4 Add a `## Next (major) — Your own pages move to the knowledge repo` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: say yes to the list, the update moves and relinks, look at the hand steps, then publish; an install whose app shows its pages waits for the live reader.

## 5. Verification

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` (payload links, OpenSpec config, measured context, retired names, private names) and the script tests.
- [x] 5.2 Run `knowledge-move.mjs plan` read-only against `/root/ClaymooApp` and `/root/WongOS`; check its counts against design.md's table, that ClaymooApp's tutorial prompts, ad naming page and personas are `stays`, `docs-content.ts` is `replaced-reader` and the move is `held`, WongOS's profile is a `stays` and its 7 ClaymooApp paths are `outside`. Record the counts in design.md; write nothing in either repo.
- [x] 5.3 Run `move` then `recopy` on a throwaway copy of WongOS with a scratch `knowledge/` folder (no save), and `move` on a ClaymooApp copy to see it refused as held; then run WongOS's wiki check and its test suite. Record failures as hand-step kinds the plan must name, or fix the script.
- [ ] 5.4 `/save`, then confirm CI passes on the change.
