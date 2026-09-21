## Context

`payload.yml` triggers on `push` and `pull_request` with no job condition and no concurrency group. `test.yml` and `deploy.yml` collapse the double fire with a job-level `if` and a concurrency group keyed on event and branch; the `deploy.yml` header explains why both parts are needed. Measured on 2026-09-20: Payload checks takes 25 to 31 s and ran once per event, so twice per commit on a branch with an open pull request. `/save` waits on `gh pr checks`, which reports a cancelled run as `fail`.

## Goals / Non-Goals

**Goals:** One Payload checks run per commit. Fork pull requests still checked. No cancelled run visible to `/save`. The explanation stays in one place.

**Non-Goals:** Changing what the job checks. Caching the OpenSpec CLI or the app dependencies. Any change to a file in the payload manifest.

## Decisions

1. **Copy the condition and group shape from `test.yml`.** A job-level `if` keeps the `push` run and any fork `pull_request` run. The group is `payload-<event>-<branch>` with `cancel-in-progress` off the default branch. Alternative: drop the `pull_request` trigger. Rejected: a fork pull request fires no `push` in this repo, so its commits would go unchecked. Alternative: a group keyed on branch only. Rejected: the two events would cancel each other, and `gh pr checks` reads a cancelled run as a failure that blocks `/ship`.
2. **Point at the explanation; do not repeat it.** A two-line header comment names `test.yml` as the owner of the why. Alternative: copy the header. Rejected: three copies of one explanation drift.
3. **State the rule in a spec of its own.** `ci-tests` owns the shipped test workflow; the meta-only checks had no spec. A `payload-checks` capability gives `/verify` a scenario to grade against the Actions run list. Alternative: `skip_specs`. Rejected: the same rule for `test.yml` is a spec requirement, and this one is as observable.

## Risks / Trade-offs

- **The skipped `pull_request` run shows as a grey "skipped" check** → `/save` already treats the skipped Test and Deploy runs as passing; the same applies here.
- **A fork pull request runs the checks with the fork's code** → the job has read-only permissions and no secrets, so the exposure is unchanged from today.
- **Runner time is the only saving** → the wall-clock gate still waits about 68 s for Test. The proposal names this so nobody expects a faster gate.

## Migration Plan

Edit the workflow on the feature branch. The first push with an open pull request shows the `pull_request` run skipped and the `push` run green. Rollback is a revert of the file.
