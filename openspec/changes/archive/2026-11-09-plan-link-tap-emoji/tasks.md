# Tasks

## 1. Scripts

- [x] 1.1 `build-review.mjs`: `planLink(page, what)` returns `[👉 Tap here to see <what>](<link>)`, keeping the `<…>` wrap for a space or parenthesis.
- [x] 1.2 `preview-review.mjs`: print `planLink(link, 'the preview')` in place of its own line.
- [x] 1.3 `ask-check.mjs`: `CLICK` and its comment match the new line; `clickTarget` reads its target.
- [x] 1.4 Tests: update `review.test.mjs`, `preview-review.test.mjs`, and `ask-check.test.mjs` to the new line, with one case for a `<…>`-wrapped path.

## 2. Docs

- [x] 2.1 `asking-the-user.md` (*Print the plan's link*, *Print the preview's link*) and `wiki/development/reply-links.md`: the new wording.
- [x] 2.2 `CHANGELOG.md`: a `## Next (patch)` entry.

## 3. Checks

- [x] 3.1 `node .github/scripts/checks.mjs --worktree` passes.
