# Shared checks implementation evidence

Task 2.1 is prepared on Source main `02542fa2a8c4eb8a64266cacebee00987579564d`. Its maintenance CI gate remains pending. These local checks establish script behavior, not hosted execution or publication acceptance.

The portable entry point requires the repository root, full base/head commits and default-branch context. It rejects a different checked-out head or nested root, evaluates the whole change, discovers the existing suite, and reports loosened checks and wiki failures even after installation or tests fail. Its fixtures use temporary repositories and an npm command double; they run no real app build, provider calls or deployed checks.

Prepared checks:

- `node --test scripts/tests/{checks,app-untouched,loosened-checks,cli-conventions}.test.mjs`: 88/88 passed.
- `scripts/tests/node_modules/.bin/c8 --include=.github/scripts/checks.mjs --reporter=text --reports-dir=.scratch/shared-checks-coverage --temp-directory=.scratch/shared-checks-coverage/tmp node --test scripts/tests/checks.test.mjs`: 17/17 passed, 100% lines and 95.31% branches.
- Focused oxlint with denied warnings and `bash -n .github/scripts/app-untouched.sh`: passed.
- Payload links, OpenSpec configuration, retired names, context budgets, wiki links and strict change validation: passed.

GitHub's Test workflow now calls this entry point. Source's extra payload checks remain separate. The existing Deploy workflow remains independent, with the same staging target and branch preview behavior; no Worker configuration, database schema or provider inventory is changed by this slice. The test workflow drops npm caching because suite discovery and execution now live in the portable script; its Check decision explains this change.

The user approved pushing this prepared shared-check slice and running Source's normal maintenance workflows on 2026-10-04, including the existing `wongstack-staging` Worker deployment, staging D1 migration check and branch-version preview upload. This authorization is separate from the earlier Cloud SDK staging approval. No new hosted resources, credentials, trial or production publication is included.
