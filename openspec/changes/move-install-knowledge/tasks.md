# Tasks

## 1. Before building

- [ ] 1.1 Confirm *The knowledge repo* and *A live reader in the app* shipped; read their shipped pages and record in design.md the local clone place, `<knowledge link>`, `<code link>`, the live reader's address form, and the module that builds both link forms. A form that differs from design.md's assumption gets a Decision log line before code.
- [ ] 1.2 Bring `main` in, then rerun `node scripts/measure-context.mjs --json` to note skill-text headroom.

## 2. The move script

- [ ] 2.1 Write `.agents/skills/wong-sync/scripts/knowledge-move.mjs` `plan` mode: own pages from the wiki root against the installed commit's `payload-files.json` (`docsPath` mapping, per-file inside wholly shipped folders), new paths, collisions as an error, versioned JSON with `moves`, `stays`, `rewrites`, `hand`, `outside`, counts by folder.
- [ ] 2.2 Add the reference scan: relative Markdown links, bare paths, string literals equal to a moved path, `/docs/<slug>` routes and `slug:` values, moved pages' links back into the code repo; run-time readers (`?raw`, `readFile*`, globs, JSON/config values) become `stays` or `replaced-reader`; anything built from parts becomes `hand`; skip `openspec/changes/archive/`, `CHANGELOG.md` and memory.
- [ ] 2.3 Write `move` mode: copy each move into the knowledge clone with the code repo commit recorded, `git rm` the originals, apply `rewrites`, write `.agents/knowledge-moves.json`; never touch `hand` items.
- [ ] 2.4 Write `recopy` mode: carry one-side changes since the move base to the knowledge clone; exit non-zero naming each page changed in both, writing nothing.
- [ ] 2.5 Write `scripts/tests/knowledge-move.test.mjs` on a made-up fixture install (no private repo names): a `docs/` root with `docsPath`, a `wiki/` root with own pages inside a shipped folder, a `?raw` import, a whole-tree glob, a built path, a back-link to code, an archive file left alone, a collision, and recopy's three cases.

## 3. Preflight and the wiki check

- [ ] 3.1 Add the `own-pages` catch-up code to `catchUpNeeds` in `.agents/skills/wong-sync/scripts/preflight.mjs`, with cases in `scripts/tests/wong-sync-preflight.test.mjs`: own pages and no moves list, a complete moves list, a shipped-only wiki.
- [ ] 3.2 Make `.agents/skills/memory/scripts/lib/links.mjs` fail on a file at a path in `.agents/knowledge-moves.json`, naming its new place; cases in `scripts/tests/wiki-links.test.mjs`.
- [ ] 3.3 Make `memory.mjs areas <old path>` print the new place from the moves list; a case in the memory tests.

## 4. Skill text, spec, wiki and release

- [ ] 4.1 Add step `own-pages` to `.agents/skills/wong-sync/references/catch-up.md`: run `knowledge-move.mjs plan`, list moves by folder and stays with their places in the plan, carry `hand` and `outside` items as tasks, `move` in the build after the knowledge repo is set up, `recopy` before publish, run `wiki-elsewhere` after it when both are reported. Offset its words to keep `measure-context.mjs --check` passing.
- [ ] 4.2 Add one line on the moves list and old paths to the knowledge repo's wiki page (shipped by that plan), linked from the catch-up step.
- [ ] 4.3 Add `.agents/skills/wong-sync/scripts/knowledge-move.mjs` to `payload-files.json` and the payload manifest; map it in `.agents/skills/memory/references/areas.json`.
- [ ] 4.4 Add a `## Next (major) — Your own pages move to the knowledge repo` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: say yes to the list, the update moves and relinks, look at the hand steps, then publish.

## 5. Verification

- [ ] 5.1 Run `node .github/scripts/checks.mjs --worktree` (payload links, OpenSpec config, measured context, retired names, private names) and the script tests.
- [ ] 5.2 Run `knowledge-move.mjs plan` read-only against `/root/ClaymooApp` and `/root/WongOS`; check its counts against design.md's table, that ClaymooApp's tutorial prompts, ad naming page and personas are `stays`, `docs-content.ts` is `replaced-reader`, WongOS's profile is a `stays` and its 7 ClaymooApp paths are `outside`. Record the counts in design.md; write nothing in either repo.
- [ ] 5.3 Run `move` then `recopy` on throwaway copies of both installs with a local bare repo as the knowledge clone; then run their wiki checks and their test suites. Record failures as hand-step kinds the plan must name, or fix the script.
- [ ] 5.4 `/save`, then confirm CI passes on the change.
