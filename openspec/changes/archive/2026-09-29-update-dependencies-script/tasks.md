## 1. Script

- [x] 1.1 Write `.agents/skills/update-dependencies/scripts/update.mjs` with the survey, tools, openspec-pins, app, test-tools, contract, and report stages and `--dry-run`, per design.md; verify `node .agents/skills/update-dependencies/scripts/update.mjs --dry-run` in this checkout prints every stage and leaves `git status` clean.
- [x] 1.2 Add `scripts/tests/update-dependencies.test.mjs`: range prefix kept, major detected, `@types/node` held to the `.nvmrc` major, all four OpenSpec pins rewritten together, a failing fake `npm install` stops with `FAIL` and exit 1, a rerun skips current stages, and nothing-outdated reports `status: current` with no file changed; verify with `node --test scripts/tests/update-dependencies.test.mjs`.

## 2. Skill

- [x] 2.1 Rewrite `.agents/skills/update-dependencies/SKILL.md` around running and watching the script: act on `FAIL`, majors, an OpenSpec move, and `needs you:` lines; hold back a major it cannot migrate; hand off to `/save`; keep the meta-only paragraph and every link target; description no longer than today's. Verify `node scripts/check-payload-links.mjs` and `node scripts/measure-context.mjs --check` pass.
