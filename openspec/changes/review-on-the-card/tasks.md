## 1. The rule

- [x] 1.1 `asking-the-user.md`: add *Put the review on the card* and the pointer from *End every reply with the next step*.

## 2. The check

- [x] 2.1 `.agents/loop/ask-check.mjs`: `reviewBlocks`, `turnReview`, the review step in `linksDecision`, `REVIEW_REASON`, the shared send-back; reword `REASON` and `REMINDER`.
- [x] 2.2 `.agents/plugins/daily/scripts/chief.mjs` `askText()`: the same rewording as `REASON`.
- [x] 2.3 `scripts/tests/ask-check.test.mjs`: a draft above a bare card is sent back once; the draft, a reformatted table row, a link or a file path in the question lets it out; lists, plain sentences, mermaid fences, tool output, *Close this chat?* and earlier answers are not checked; the new `REASON` and `REMINDER` wording.

## 3. Release

- [x] 3.1 Offsetting cuts so `node scripts/measure-context.mjs --check` passes.
- [x] 3.2 Raise the loop and Daily module versions.
- [x] 3.3 `CHANGELOG.md`: the `## Next (minor)` entry.
- [x] 3.4 Local checks: `node scripts/payload-checks.mjs`, the script tests, oxlint, `check-payload-links.mjs`, `measure-context.mjs --check`, `openspec validate --strict`.

## 4. Gate

- [ ] 4.1 CI's `test` and `payload` checks pass on the pull request.
