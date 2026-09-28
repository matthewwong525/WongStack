# Tasks

## 1. App scaffold

- [x] 1.1 In `app/`, run `npm uninstall @stryker-mutator/core @stryker-mutator/vitest-runner`; verify `grep -n stryker app/package.json app/package-lock.json` finds nothing.
- [x] 1.2 Remove ` && stryker run` from the `test` script in `app/package.json`; verify the script is `npm run lint && vitest run --coverage && knip && jscpd`.
- [x] 1.3 Delete `app/stryker.conf.json` and the `.stryker-tmp` line in `app/.gitignore`.
- [x] 1.4 Remove the two `// Stryker disable next-line` comments in `app/worker/access.ts`; verify `grep -rn -i stryker app/ --exclude-dir=node_modules` finds nothing.

## 2. Test workflow

- [x] 2.1 In `.github/workflows/test.yml`, remove the `schedule` trigger and its comment, the `github.event_name == 'schedule'` clause in the job `if`, and set `timeout-minutes: 30`.
- [x] 2.2 Remove the `stryker` and `stryker-key` outputs from "Locate the test suite", and the "Restore mutation results" and "Save mutation results" steps.
- [x] 2.3 Remove the header's "Why Stryker's result file is cached" section; verify `grep -n -i 'stryker\|mutant\|nightly\|schedule' .github/workflows/test.yml` finds nothing and the push and fork-PR conditions are unchanged.

## 3. Ship skill

- [x] 3.1 In `.claude/skills/ship/SKILL.md` Step 1, drop the sentence about a failing nightly Test run; verify the preflight query and the `failure` stop are unchanged.

## 4. Release

- [x] 4.1 Add a `## Next (minor) — Pushes skip mutation testing` entry at the top of `CHANGELOG.md`: what goes and why, that every other check stays, that Vitest 5 is no longer held back by Stryker, and an **Updating** note (nothing by hand; the sync plan needs `Check:` bullets for the files CI names); leave `VERSION` alone.
- [x] 4.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `node .github/scripts/loosened-checks.mjs --worktree`; verify each passes and the last lists every changed check file as explained.

## 5. Evidence

- [ ] 5.1 `/save` the change and record the branch's Test run: green, no Stryker step in the log, and its time.
