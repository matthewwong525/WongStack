# Tasks

## 1. Measure the walk first

- [x] 1.1 Write the candidate `walkthrough.md` in this change's folder: § a with the playground rule, shared-key rule, missing-seed naming and manual trigger; the FAILURE reset wording per the spec. Done when the file exists and differs from the live reference only in those passages.
- [x] 1.2 Extend `scripts/eval-verify.mjs --exercise mixed` and its scorer test with a destructive journey on seeded data, a service on a shared key, and a scheduled job with a manual trigger. Done when the scorer test passes through `/save`.
- [x] 1.3 Run baseline and candidate, two runs each, and record caught, passed and false-alarm counts in this folder. Done when the counts are recorded and the keep rule in design § 8 is judged; a failed rule stops the walk-instruction tasks and is reported.

## 2. Scripts

- [x] 2.1 Add `cf-secrets.mjs shared`: names only, `own` and `shared`, no network. Add tests for no staging file, one differing key, and that no value is printed. Verify through `/save`.
- [x] 2.2 Add `verify-staging.sh turn take|give` on `refs/wong/staging-turn` with create-only push, lease-guarded give, and expiry takeover. Test against a local bare remote in `verify-scripts.test.mjs`: two takers, give, stale takeover, refused push. Verify through `/save`.
- [x] 2.3 Make `preflight` take the turn, reset staging, and print `SEEDED` and `PLAYGROUND`; make `cleanup` give the turn. `--no-preview` does neither. Extend the script tests with a fake wrangler. Verify through `/save`.
- [x] 2.4 Record the production deployment in `.github/workflows/deploy.yml` and the pack's copy, with the address from the deploy output; a failed record does not fail the job. Extend the workflow contract test. Verify through `/save` that the workflow test passes.
- [x] 2.5 Add `.agents/skills/ship/scripts/live-look.sh` with tests using a fake `gh` and `curl`: success, failed release, error answer, login redirect without a token, nothing released, timeout. Verify through `/save`.
- [x] 2.6 Confirm a `refs/wong/` push is accepted on GitHub, starts no CI run, and record the result in this folder (`turn-check.md`). A hosted workspace was not available to test; a refusal there follows the design's fallback.

## 3. Skills

- [x] 3.1 Replace the live `walkthrough.md` passages with the measured candidate, and update `/verify`'s SKILL.md (authorized actions, FAILURE step, hard rules) to match. Done when `node scripts/measure-context.mjs --check` passes.
- [x] 3.2 Add the live look to `/ship` after the merge: one report line for `ok` or `unknown`; on `failed`, the plain report then one `/apply` with the evidence. Trim `/ship`'s own text to fit. Done when `measure-context --check` passes.
- [x] 3.3 Add the seed-upkeep and manual-trigger lines to `.agents/rules/code.md` and update the `schema/seed.sql` template comment. Done when `node scripts/check-payload-links.mjs` passes.

## 4. Docs

- [x] 4.1 Update `wiki/development/staging-walkthrough.md`: the turn and reset, free rein and why it is safe, the shared-key rule, the live look under what the walk is not. Keep linked headings' exact text.
- [x] 4.2 Update `wiki/stack/d1-pipeline.md` (seeded staging, shared staging and turns) and `wiki/stack/staging-bindings.md` (staging-only test keys, the `shared` report, the manual trigger convention).
- [x] 4.3 Update `wiki/development/the-change-loop.md` where `/ship`'s end is described. Done when the wiki checks pass through `/save`.

## 5. Release

- [x] 5.1 Add the `## Next (minor)` entry to `CHANGELOG.md` with a plain Updating note about staging-only test keys. Run `check-payload-links.mjs`, `check-openspec-config.mjs` and `measure-context.mjs --check`.
- [x] 5.2 Through `/save`, confirm CI passes. Then walk this change once with `/verify`: the turn is taken and given, staging is rebuilt, and the report shows `SEEDED` and `PLAYGROUND`.
- [x] 5.3 Record in the Decision log that the live look's first real run is this change's own release, read from `/ship`'s report; it can not be a ticked task, since the plan is archived before the merge. Done when the entry exists.
