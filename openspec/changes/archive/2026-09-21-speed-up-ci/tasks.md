## 1. Workflow

- [x] 1.1 Add the job-level event condition and the event-and-branch concurrency group to `.github/workflows/payload.yml`, per review.html#/workflow.
- [x] 1.2 Add the two-line header comment that points to the `test.yml` explanation instead of copying it, per review.html#/workflow.

## 2. Evidence

- [x] 2.1 Push through `/save` and confirm on the branch's first commit with an open pull request that the `pull_request` Payload checks run is skipped and the `push` run is green, per review.html#/once/after.

## 3. Release

- [x] 3.1 Bump `VERSION` to 16.1.1, add a newest-first `CHANGELOG.md` entry, and run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`.
