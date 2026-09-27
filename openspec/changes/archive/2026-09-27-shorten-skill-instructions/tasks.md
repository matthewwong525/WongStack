## 1. Main instruction pages

- [x] 1.1 Record the before word counts per file (`wc -w`) in the Decision log.
- [x] 1.2 Rewrite `ship`, `continue`, `save`, and `improve` `SKILL.md` by the design's editing rules; check each against the spec requirements that name it.
- [x] 1.3 Rewrite `apply`, `memory`, `verify`, and `plan` `SKILL.md` the same way.
- [x] 1.4 Rewrite `explore`, `wong-setup`, `wong-sync`, `routine`, and `update-dependencies` `SKILL.md` the same way.

## 2. Linked reference pages

- [x] 2.1 Rewrite the `references/*.md` of `wong-setup`, `wong-sync`, and `verify`.
- [x] 2.2 Rewrite the remaining `references/*.md` (`explore`, `save`, `plan`, `improve`, `memory`).

## 3. Release

- [x] 3.1 Measure against the targets (at least 30% fewer words across the `SKILL.md` files, 20% across references) and record the after counts in the Decision log.
- [x] 3.2 Bump `VERSION` to 25.16.0 and add the `CHANGELOG.md` entry, naming the merge an adapted skill will need.
- [x] 3.3 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/measure-context.mjs --check`, and `openspec validate shorten-skill-instructions --strict --no-interactive`.
- [x] 3.4 Pass CI through `/save`.
