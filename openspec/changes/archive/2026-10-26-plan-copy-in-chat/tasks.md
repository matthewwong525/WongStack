## 1. Page builder

- [x] 1.1 Add an exported `chatCopy(name, markdown)` to `.agents/skills/plan/scripts/build-review.mjs` (Why, numbered What Changes, assumed decisions, picture lines, tables and text fences kept) and print it from the CLI between the status line and the link line for current plan pages only; verify by running the builder on this change.
- [x] 1.2 Add tests to `scripts/tests/review.test.mjs`: picture fences become the page line, tables and text fences survive, only `Assumed` decisions print, and the CLI prints status, copy, link, review line in that order; verify with `node --test scripts/tests/review.test.mjs`.

## 2. Rules and docs

- [x] 2.1 Update *Print the plan's link* in `.agents/skills/explore/references/asking-the-user.md` to say a reply ending on the review line prints the builder's chat copy above the link, and no other reply does; update `/plan`'s *Finish* (replace "sum up the plan in a few plain lines") and *Draw in the proposal* copy line, and `wiki/development/reply-links.md`, linking that section rather than restating it; verify by reading each and with the wiki link check.
- [x] 2.2 Add a `## Next (minor) — The plan prints in the chat` entry to `CHANGELOG.md`.

## 3. Verify

- [x] 3.1 Run `openspec validate plan-copy-in-chat --strict --no-interactive`, the review tests, and the payload and wiki checks locally as a pre-check, then `/save` and confirm CI passes.
