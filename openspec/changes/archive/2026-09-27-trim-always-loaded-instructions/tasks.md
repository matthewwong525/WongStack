# Tasks

## 1. Measurement script

- [x] 1.1 Add `--write-baseline` to `scripts/measure-context.mjs`, widen the inventory to every `.agents/skills/*` folder except `agent-browser`, and add the synthetic `skill-descriptions` entry; cover each in `scripts/tests/context-measurement.test.mjs` and verify the suite passes
- [x] 1.2 Add the `startup` route and `startupCeiling` check; test that a load over the ceiling yields an issue naming both numbers, and one under it yields none
- [x] 1.3 Before any text edit, run `node scripts/measure-context.mjs --write-baseline` and verify the fixture records `1f41711` and a start-up load of about 3,615 words; paste the `--check` output into the Decision log as the before number

## 2. Link checker

- [x] 2.1 Extend `scripts/check-payload-links.mjs`'s anchor test to links in shipped payload files; add a failing fixture (a renamed linked heading) and a passing one to `scripts/tests/payload-links.test.mjs`, and verify `node scripts/check-payload-links.mjs` passes on the untrimmed tree

## 3. Start-up text

- [x] 3.1 Trim the `WONG-STACK` block and meta half of `AGENTS.md`, writing each rule's row in `rule-map.md`
- [x] 3.2 Trim `wiki/wiki-style.md` and `wiki/voice.md`, keeping every linked heading, with their `rule-map.md` rows
- [x] 3.3 Trim every WongStack-authored skill `description:` to purpose and triggers
- [x] 3.4 Verify the `startup` route is ≤ 2,200 words with `node scripts/measure-context.mjs --check`

## 4. The change loop page

- [x] 4.1 Trim `wiki/development/the-change-loop.md` to ≤ 2,000 words, keeping every linked heading, with its `rule-map.md` rows; verify links and anchors with `node scripts/check-payload-links.mjs`

## 5. Skills

- [x] 5.1 Trim the loop verbs' `SKILL.md` and references (`explore`, `plan`, `apply`, `save`, `continue`, `ship`, `verify`), replacing restated doctrine with links to its owner, with `rule-map.md` rows
- [x] 5.2 Trim the other authored skills (`improve`, `memory`, `routine`, `wong-sync`, `wong-setup`, `update-dependencies`), with `rule-map.md` rows
- [x] 5.3 Verify authored skill Markdown is ≤ 21,000 words, or record the shortfall and why in the Decision log; run the script suite, since some tests read skill text

## 6. Release and records

- [x] 6.1 Add a `## Next (minor) — Shorter instructions, the same rules` entry to `CHANGELOG.md` with the before and after numbers and an Updating note for locally adapted files
- [x] 6.2 Check `rule-map.md` has a row for every rule in the old text of each edited file
- [x] 6.3 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/measure-context.mjs --check`, and `openspec validate --specs --strict --no-interactive`
- [x] 6.4 `/save`, and confirm the payload and test checks pass in CI
