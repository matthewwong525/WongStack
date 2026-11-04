# Design

## Context

`pageProblems` in `.agents/skills/memory/scripts/lib/links.mjs` finds the first non-blank line of the code-masked page and wants `# ` there. It also counts every masked line that starts with `# ` as a title. `checkWiki` calls it for every page under `wiki/` or `knowledge/`, so one function serves `knowledge.mjs save`, `.github/scripts/wiki-links.mjs` in CI, and the move's check in `knowledge-move.mjs`.

The reader finds frontmatter with `FRONT = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/` in `app/worker/apps/knowledge/render.ts`: only at byte 0, closed by the next `---` line. ClaymooApp's pages use the same shape, some with a blank line after the block (`docs/welcome.md`: `public: true`, `title: Welcome`).

`knowledge-move.mjs` `move` copies each page with `copyFileSync` and rewrites only lines with a link or a path to a moved page, so a page's frontmatter arrives unchanged. Its one text edit, merging a moving `README.md` into `knowledge/README.md`, applies only to a root hub, which WongStack ships and never moves.

## Goals / Non-Goals

**Goals:**
- A page that opens with one frontmatter block passes when the title and a sentence follow the block.
- The check and the reader agree on what a frontmatter block is.

**Non-Goals:**
- Reading or checking the block's fields.
- Sharing one module between the Worker (TypeScript, bundled) and the skill scripts (plain Node): the app does not import skill code, and the skills ship without the app's build.

## Decisions

- **Blank the block, keep the line numbers.** In `pageProblems`, match the block with the reader's pattern and replace its characters, but not its newlines, with spaces before `maskCode` runs. Then `first` skips it as blank, a YAML `# comment` inside never counts as a title, and every later index still lines up with `lines`. Alternative: slice the block off and re-index; more code for the same result.
- **Copy the pattern, with a pointer.** `links.mjs` holds its own `FRONT` with a one-line comment naming `render.ts`, and a test runs the reader's own test inputs (closed, CRLF, unclosed) through the check. Alternative: import across the app and skill boundary; refused above.
- **Leave headings, links and the word count alone.** A frontmatter line rarely looks like a link or a heading, and the spec counts the whole file.
- **No change to `knowledge-move.mjs`.** A test pins it instead: a moved page with frontmatter arrives byte for byte and the knowledge check passes.

## Risks / Trade-offs

- The two copies of the pattern could drift. → The test above fails when the check reads a block the reader would not, or the reverse, on the cases the reader tests.
- A wiki page could hide prose in a frontmatter block. → It is still counted in the word cap; no shipped page uses frontmatter today.
