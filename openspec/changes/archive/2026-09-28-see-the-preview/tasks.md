# Tasks

## 1. Skills

- [x] 1.1 In `.agents/skills/explore/references/asking-the-user.md`, allow *See the preview* as a fourth option, name its reply beside *Review the plan*'s as the ones that end without a question, and add a *Print the preview's link* section by the design; verify `node scripts/check-payload-links.mjs` passes.
- [x] 1.2 In `.agents/skills/apply/SKILL.md` *Finish with a preview* step 4, print the preview as *Click here to see the preview:* and offer *See the preview* when a preview was uploaded, linking the new section; verify by reading the step back against the apply spec delta.

- [x] 1.3 In `.agents/skills/plan/scripts/build-review.mjs`, print a blank line between the plan's link line and the next-step line, and say so in *Print the plan's link*; verify `node --test scripts/tests/review.test.mjs` passes with the updated output assertion.
- [x] 1.4 In *Print the preview's link*, point the link at the page that shows the change, the home page only when none does; verify by reading it back against the spec delta.

## 2. Release

- [x] 2.1 Add a `## Next (minor) — A "See the preview" choice after a build` entry at the top of `CHANGELOG.md` in plain words, with **Updating.** *Nothing to do by hand.*; verify `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `node scripts/measure-context.mjs --check` pass.
