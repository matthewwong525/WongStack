# Shared checks implementation evidence

Task 2.1 is complete at its implementation gate on Source main `02542fa2a8c4eb8a64266cacebee00987579564d`. The exact pushed head `796ddd9beadeaa12d8736fef9fe1d2b8227cb620` passed [Test](https://github.com/matthewwong525/WongStack/actions/runs/37166952516), [Deploy](https://github.com/matthewwong525/WongStack/actions/runs/37166952519) and [Payload checks](https://github.com/matthewwong525/WongStack/actions/runs/37166952543) in [Source #259](https://github.com/matthewwong525/WongStack/pull/259). These establish maintenance compatibility, not hosted execution or publication acceptance.

The first pushed head `f840702a609715196d7172696e3ad9871c1e63fc` passed Test and Deploy, including recorded branch preview deployment `6835193877`, but [Payload checks](https://github.com/matthewwong525/WongStack/actions/runs/37166722802) failed two of 1038 script cases. The new capability needed its documentation-area mapping, and the static payload-dependency test needed to follow fixed sibling command paths in the shared script. Both were repaired without dropping checks; the fresh full gate passed all 1038 cases with 91.63% lines and 88.63% branches. The 21 focused repair cases also passed.

Preview discovery for the accepted head returned deployment `6835229668` and [the Source branch preview](https://spotless-panther-wongstack-staging.matthewwong525.workers.dev). It is the existing GitHub staging/version route, not the future immutable managed native Preview acceptance.

The portable entry point requires the repository root, full base/head commits and default-branch context. It rejects a different checked-out head or nested root, evaluates the whole change, discovers the existing suite, and reports loosened checks and wiki failures even after installation or tests fail. Its fixtures use temporary repositories and an npm command double; they run no real app build, provider calls or deployed checks.

Prepared checks:

- `node --test scripts/tests/{checks,app-untouched,loosened-checks,cli-conventions}.test.mjs`: 88/88 passed.
- `scripts/tests/node_modules/.bin/c8 --include=.github/scripts/checks.mjs --reporter=text --reports-dir=.scratch/shared-checks-coverage --temp-directory=.scratch/shared-checks-coverage/tmp node --test scripts/tests/checks.test.mjs`: 17/17 passed, 100% lines and 95.31% branches.
- Focused oxlint with denied warnings and `bash -n .github/scripts/app-untouched.sh`: passed.
- Payload links, OpenSpec configuration, retired names, context budgets, wiki links and strict change validation: passed.

GitHub's Test workflow now calls this entry point. Source's extra payload checks remain separate. The existing Deploy workflow remains independent, with the same staging target and branch preview behavior; no Worker configuration, database schema or provider inventory is changed by this slice. The test workflow drops npm caching because suite discovery and execution now live in the portable script; its Check decision explains this change.

The user approved pushing this prepared shared-check slice and running Source's normal maintenance workflows on 2026-10-04, including the existing `wongstack-staging` Worker deployment, staging D1 migration check and branch-version preview upload. This authorization is separate from the earlier Cloud SDK staging approval. No new hosted resources, credentials, trial or production publication is included.
