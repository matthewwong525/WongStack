# Tasks

## 1. Memory skill

- [x] 1.1 Add `.agents/skills/memory/scripts/lib/callers.mjs`: walk code files (skip `node_modules`, `.git`, `dist`, `.wrangler`, symlinks, `*.d.ts`, archived changes), mask comments and string bodies (keeping `${…}` and newlines), parse `import … from`, `export … from`, and literal `import()`, resolve relative specifiers with `normalizePath` and the extension order in design.md, resolve alias specifiers by the nearest `tsconfig*.json`/`jsconfig.json` `compilerOptions.paths` (comments stripped, longest prefix wins), follow re-exports to a fixed point checking the asked path exports the name, count side-effect imports and literal `require()`, and return each outside user's file, up to three lines, names, and `via` file. Node built-ins only.
- [x] 1.2 In `.agents/skills/memory/scripts/memory.mjs`'s `areas`, print `Code using <path>:` after each direct path's backlinks, ten files then `+N more`; nothing for `--change` paths, Markdown files, missing paths, or no users. Update the `areas` usage line to mention code users.
- [x] 1.3 In `.agents/skills/memory/scripts/lib/areas.mjs`, match a path equal to an entry in an area's `docs` to that area, beside the longest-prefix match; in `memory.mjs`, print a `Code:` line of each matched area's folder `paths` after `Docs:`.
- [x] 1.4 Add tests to `scripts/tests/memory-areas.test.mjs` with a fixture repo: the shared-helper scenario (direct, `.claude/`, re-export via, same-name decoy not listed); a use in a comment or string not counted; a `.js` specifier landing on a `.ts` file; namespace and default imports; a function passed as a value; the cap and `+N more`; a change's paths printing no block; the block printing with the store unreachable; under 1 second on a generated 2,000-file fixture; a side-effect import and a literal `require()` listed with no names; an `@/*` import resolved through a fixture tsconfig and a vite-only alias skipped; a spec path matching its area by docs and the `Code:` folders line printing.

## 2. Docs and release

- [x] 2.1 In `wiki/development/memory.md#facts-by-code-area`, extend the "One lookup shows everything linked" bullet with the code users (who imports from a path asked about directly, read fresh, no parser), the doc-path area match, and the `Code:` folders line.
- [x] 2.2 Add a `## Next (minor) — The lookup lists the code that uses a file` entry at the top of `CHANGELOG.md`, with **Updating.** Nothing to do by hand.

## 3. Verification

- [x] 3.1 Run `node .claude/skills/memory/scripts/memory.mjs areas .agents/skills/memory/scripts/lib/cli.mjs` and `app/worker/api/contract.ts` on this repo; check the lists against the 2026-10-20 evaluation (all `defineAction` users, including `app/worker/api/health.ts`; `cli.mjs` users including those via `scripts/lib-cli.mjs` and `.claude/` imports).
- [x] 3.2 Run `node .github/scripts/checks.mjs --worktree` as a pre-check, then `/save`; CI is the gate.
