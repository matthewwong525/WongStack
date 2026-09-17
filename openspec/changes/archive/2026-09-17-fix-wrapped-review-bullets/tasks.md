## 1. Fold a wrapped bullet

- [x] 1.1 Add the fold pre-pass to `parseProposal()` in `.agents/skills/plan/references/review-kit.html`, exactly as design.md — Decisions gives it, and run the existing What Changes loop over the folded items per review.html#/parse/after/fold
- [x] 1.2 Confirm the kit's script constraints still hold: no optional chaining, no optional catch binding, nothing at the top level that can throw before the first render
- [x] 1.3 Add one line to step 4 of the kit's authoring header saying a bullet may wrap and the anchor is read from the end of the whole bullet, in Simplified Technical English, per review.html#/header

## 2. Prove the fold

- [x] 2.1 Run the parser's exact logic over the kit's own unwrapped example proposal, before and after the change, and confirm the bullets, anchors, and tail are byte-identical
- [x] 2.2 Run it over a hanging-indent wrapped proposal and an unindented ("lazy") wrapped one, and confirm every anchor resolves after the change and none did before
- [x] 2.3 Confirm a `**Non-goals:**` paragraph after a blank line still reaches the tail slot, and that a deliberate `no visual` bullet and a dead anchor still render as themselves
- [x] 2.4 Open this change's own `review.html` from `file://` and confirm it renders with no script error, since it carries the patched kit

## 3. Release

- [x] 3.1 Bump `VERSION` from 15.0.0 to 15.0.1 per review.html#/files/release
- [x] 3.2 Add the newest-first `CHANGELOG.md` entry for 15.0.1 per review.html#/files/release
- [x] 3.3 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`, and `openspec validate fix-wrapped-review-bullets --strict`
