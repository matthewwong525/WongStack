# Tasks

## 1. Skill and checks

- [x] 1.1 In `.agents/skills/dream-memory/SKILL.md` step 11, name the branch `dream-<date>`, adding `-2`, `-3` when taken; verify `node scripts/measure-context.mjs --check` passes.
- [x] 1.2 Remove `openspec/specs/multi-part-workspaces/spec.md` from the `/improve` allow in `scripts/retired-names.json` and fix its reason; verify `node scripts/check-retired-names.mjs` passes once the spec delta is applied.
- [x] 1.3 Add the `## Next (patch)` entry to `CHANGELOG.md`; verify `node scripts/check-payload-links.mjs` passes.

## 2. Verification

- [x] 2.1 Run `openspec validate fix-dream-leftovers --strict --no-interactive` and `node .github/scripts/checks.mjs --worktree`; both pass.
