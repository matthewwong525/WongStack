# Tasks

## 1. Skill

- [x] 1.1 Rewrite `.agents/skills/verify/SKILL.md` as the goal-led brief in design.md: the outcome, the authorization list, the order as one short list with the `scout-check` and `preflight` commands, the Access paragraph word for word from main, the plain-check paragraph, the verdict table under `## Verdicts`, the hard rules, and the report and closing step (including returning the verdict inside `/ship`). Verify each of the 18 `staging-walkthrough` requirements (the 17 in `openspec/specs/staging-walkthrough/spec.md` plus this change's delta) maps to a line in the skill or the reference, and no numbered step headings remain.

## 2. Reference and wiki page

- [x] 2.1 Trim `.agents/skills/verify/references/walkthrough.md` to the how: drop the opening paragraph on which `RESULT` triggers which section and § e's restated fix actions, keep §§ a–f's headings, and point links at the skill's new anchors. Verify it holds no rule the skill or wiki page also states.
- [x] 2.2 Trim `wiki/development/staging-walkthrough.md` to the why by design.md's list, keeping every heading and every declined option the spec requires. Verify no point appears on both it and the reference, and its word count drops.
- [x] 2.3 Update every link to a removed `SKILL.md` anchor across the repo, and the payload manifest's `/verify` wording if it names the steps. Verify with `node scripts/check-payload-links.mjs`.

## 3. Release and contract

- [x] 3.1 Add one `## Next (minor) — Check the preview toward a goal` entry to `CHANGELOG.md` with an Updating note saying there is nothing to do by hand; leave `VERSION` alone. Verify the entry sits above 27.9.0.

## 4. Integration checks

- [x] 4.1 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/measure-context.mjs --check`, and `openspec validate simplify-verify --strict --no-interactive`; verify all pass and the skill plus reference word count is well below today's 2,310, recording the numbers in the handoff.
