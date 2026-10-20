# Design

## Context

`memory.mjs areas <paths>` prints areas, docs, past changes, and Markdown backlinks before it opens the store. The backlinks come from [`lib/links.mjs`](../../../.agents/skills/memory/scripts/lib/links.mjs): a fresh walk over the files, Node built-ins only, and printed only for paths asked about directly. The memory scripts ship to every install and have no package dependencies. The new block follows the same pattern.

The evaluation behind the plan is in the proposal's Decision log. The throwaway prototype (`/tmp/callmap/callmap.mjs`, TypeScript 5.9 parser) and its scorer are not committed. The scorer's regex import-follower, which this design adopts, agreed with the parser on all 91 caller files.

## Goals / Non-Goals

**Goals:**
- A `Code using <path>:` block after the backlinks, for each direct path, listing outside files with up to three line numbers and the imported names they use.
- Correct across same-name functions, `.claude/` or `.codex/` imports, `export … from` chains, TypeScript's `.js` → `.ts` specifiers, default, named, and namespace imports, and `import()` with a literal path.
- Under one second on this repo.

**Non-Goals:** see the proposal. No parser and no cache. Bare package specifiers (`hono`, `node:fs`) and aliases defined only in build code (vite's `resolve.alias`) are skipped.

## Decisions

- **Regex import-following, not a parser.** Chosen by the user. Mask comments and string contents first, keeping offsets and newlines, so a `parseCli(` inside a comment or string isn't a use. Then read `import … from '<spec>'`, `export … from '<spec>'`, and `import('<spec>')` from the unmasked specifier text. Resolve relative specifiers against the importer's folder, map `.claude/` and `.codex/` to `.agents/` with `normalizePath`, and try the specifier as written, then `.js`→`.ts`/`.tsx`, then appended `.ts`, `.tsx`, `.mjs`, `.js`, `.mts`, then `/index.*`. *Alternative:* the TypeScript compiler API. It names the calling function, but needs a package in every install, and app's `typescript` 7 is the native compiler with no JS API.
- **A use is the imported local name appearing after the import, outside the import statement.** For a namespace or default import of a module, a use is any `ns.` or the default name. This counts callbacks and handler tables (`{ health }`, `.map(redact)`), which a call-only rule would miss.
- **Re-exports pass through, checked against the origin.** A file outside the path that re-exports from it (`export * from`, `export { x } from`) becomes a source in its own right: its importers count, labelled `via <file>`. Because a re-exporter may add its own exports, a name imported through one counts only when a file under the asked path exports that name (regex over `export function|const|let|class|{…}` declarations). The re-exporter lists only if it also uses the names. Re-export chains are followed to a fixed point. The repo's own `scripts/lib-cli.mjs` is the live case: `export * from '../.claude/skills/memory/scripts/lib/cli.mjs'`, exercising both the chain and the `.claude/` mapping.
- **Folder shortcuts resolve through tsconfig.** An alias specifier (`@/x`, `~/x`) resolves by the `compilerOptions.paths` of the nearest `tsconfig*.json` or `jsconfig.json` above the importing file (comments stripped before parsing, longest alias prefix wins), then the normal extension order. Why in scope: measured 2026-10-20 on ClaymooApp, 2,386 of its 7,314 internal imports (a third) use `@/` or `~/`; skipping them would hide exactly the app code's own links. An alias defined only in a vite config is JS, not data, and is skipped — failing toward a shorter list.
- **Side-effect and CJS loads count.** `import './x.mjs'` with no names, and `require('<literal spec>')`, both list the loader with no names shown: it still breaks when the loaded file changes. A computed specifier still doesn't count.
- **A doc path matches its area.** In `areas.mjs`, a path equal to an entry in an area's `docs` matches that area, alongside the longest-prefix match, so `openspec/specs/memory/spec.md` lands on `memory` and not only `openspec`. Specs name no code files (the spec bar forbids it), so this map is the only spec ↔ code edge; it is already curated per area and test-enforced.
- **Each matched area prints its code folders.** A `Code:` line lists the area's `paths` entries that are folders, right after `Docs:`, closing the doc → code direction. Code → doc was already the `Docs:` line.
- **Files walked:** `.mjs .cjs .js .ts .tsx .mts` under the root, skipping `node_modules`, `.git`, `dist`, `.wrangler`, symlinks (so `.claude` isn't read twice), `*.d.ts`, and archived changes. Reuse `links.mjs`'s walk shape. *Alternative:* `git ls-files`. Rejected so an unsaved new file counts, matching backlinks.
- **Output and cap.** Files sorted by path; ten shown, then `+N more`, like backlinks. A path with no users prints nothing. A path that is a Markdown file or missing prints nothing.
- **Direct paths only.** `--change` paths get no block, matching backlinks, and `/apply`'s build is unchanged.
- **Graphify concepts not taken:** found-versus-guessed edge marks (every link here comes from an import line) and a most-connected report (a separate ask).

## Risks / Trade-offs

- **Regex misses unusual syntax**: an import split by a comment, or a computed `import(name)` or `require(name)`. These are rare here and fail toward a shorter list, never a wrong entry. A test pins each shape the repo uses.
- **Masking strings hides template-literal code**: `${parseCli()}` inside a template counts as string. Masking keeps `${…}` bodies to avoid this.
- **Speed grows with code size.** One read per file per call. On this repo, a regex scan of 472 files and 2,451 imports took 91 ms. Measured on ClaymooApp, the largest install: 2,812 files, 13,818 imports, 28.3 MB read in 508 ms. The test pins a 1-second ceiling on a generated 2,000-file fixture.
