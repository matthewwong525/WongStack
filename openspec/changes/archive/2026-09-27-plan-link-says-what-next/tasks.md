# Tasks

## 1. Script

- [x] 1.1 In `.agents/skills/plan/scripts/build-review.mjs`, export `NEXT_STEP` (`When you're ready, type \`/apply\` to build it.`) and print it after the link line whenever the link prints; verify with `node --test scripts/tests/review.test.mjs`
- [x] 1.2 In `scripts/tests/review.test.mjs`, assert the CLI's stdout ends with the link line then the `NEXT_STEP` line, and that a `no-page` run prints neither; verify the same test passes

## 2. Skills

- [x] 2.1 In `.agents/skills/explore/references/asking-the-user.md` "Print the plan's link", say the builder's next line goes right under the link when the plan waits (standalone `/plan`, bare `/wong-sync`, review notes, the *Review the plan* reply), and is left out when the build goes on or the plan has shipped; verify by reading the section against the spec delta
- [x] 2.2 In `.agents/skills/plan/SKILL.md`, say the builder prints the status line, the link line, and the next-step line; verify by reading

## 3. AGENTS.md and release

- [x] 3.1 In `AGENTS.md`'s WONG-STACK plan-link rule line, add that a waiting plan's link is followed by the line to type `/apply`; verify by reading
- [x] 3.2 Add a `## Next (minor) — The plan's link says what to do next` entry to the top of `CHANGELOG.md`; verify `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs` pass
