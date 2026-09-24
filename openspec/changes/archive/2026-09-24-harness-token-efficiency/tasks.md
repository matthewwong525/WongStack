## 1. Script

- [x] 1.1 Add `scripts/measure-usage.mjs`: per-request billing-type cost from transcript usage, request dedupe by id, subagent roll-up per task, per-model/skill/tree totals, prefix-rewrite causes, estimated context-source split, `--dir`/`--cwd`/`--since`/`--json`
- [x] 1.2 Add `scripts/tests/usage-measurement.test.mjs` covering pricing and unknown models, dedupe and chunk placement, miss causes, subagent roll-up and the working-directory filter

## 2. Skill

- [x] 2.1 Update the git gate to publish an open PR's body with `gh api -X PATCH "repos/{owner}/{repo}/pulls/$PR_NUMBER" -F "body=@$BODY_FILE"` and keep `gh pr create --body-file` for new PRs (review.html#/pr-body)
- [x] 2.2 Bump `VERSION` to 16.7.1 and add the `CHANGELOG.md` entry

## 3. Docs

- [x] 3.1 Record the baseline, ranked levers, proposed `WONG-STACK` block diff, and test plan in `notes/harness-token-efficiency.md`

## 4. Checks

- [x] 4.1 Run the script tests, `scripts/check-payload-links.mjs`, and `scripts/check-openspec-config.mjs`
- [x] 4.2 CI passes on the pull request (via `/save`)
