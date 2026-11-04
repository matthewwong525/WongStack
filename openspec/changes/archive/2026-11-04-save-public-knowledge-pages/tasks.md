# Tasks

## 1. Page check

- [x] 1.1 In `.agents/skills/memory/scripts/lib/links.mjs`, add `FRONT` (the reader's pattern from `app/worker/apps/knowledge/render.ts`, with a one-line pointer) and blank a leading block's characters, keeping its newlines, before `pageProblems` masks code and looks for the title.
- [x] 1.2 In `scripts/tests/wiki-links.test.mjs`, add: a page with `---\npublic: true\n---\n# Voice\n\n…` passes; the same with a blank line after the block and with CRLF line ends passes; a `# comment` inside the block is not a second title; a block with no closing `---` fails with *has no # title on its first line*; a block followed by a list fails as *opens with a list*; a `knowledge/` page with the block passes.
- [x] 1.3 In `scripts/tests/wiki-links.test.mjs`, read `links.mjs` and `app/worker/apps/knowledge/render.ts` as text and assert their `const FRONT = /.../;` literals are equal, so a change to one copy fails.

## 2. Move

- [x] 2.1 In `scripts/tests/knowledge-move.test.mjs`, give one moving page a `public: true` frontmatter block and assert it arrives byte for byte and the knowledge check reports nothing.

## 3. Docs and release

- [x] 3.1 In `wiki/wiki-style.md`, under *Every page stands on its own*, say a page may start with one frontmatter block, such as `public: true`, and its title comes right after it; link [public pages](stack/knowledge-reader.md#public-pages).
- [x] 3.2 Add `## Next (patch) — Pages marked public can be saved` to `CHANGELOG.md`, with no hand step.

## 4. Verify

- [x] 4.1 Run `node --test scripts/tests/wiki-links.test.mjs scripts/tests/knowledge-move.test.mjs` and `node .github/scripts/checks.mjs --worktree`.
