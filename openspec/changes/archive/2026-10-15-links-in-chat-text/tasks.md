# Tasks

## 1. Skill reference

- [x] 1.1 In `.agents/skills/explore/references/asking-the-user.md`, "End every reply with the next step": replace the report-and-link sentence with the general every-link rule from the design
- [x] 1.2 In "Print the plan's link", replace "Keep it out of the question itself: a tool's card may not make a link clickable." with a link to the general rule

## 2. Release

- [x] 2.1 Add a `## Next (patch) — Every link in the chat` entry at the top of `CHANGELOG.md`

## 3. Verification

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree` (payload links, context budget, retired names) and fix what fails
