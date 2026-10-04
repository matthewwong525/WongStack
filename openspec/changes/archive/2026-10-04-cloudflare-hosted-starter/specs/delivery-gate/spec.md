## MODIFIED Requirements

### Requirement: The gate is CI when present, else PR review

For a GitHub repository, `/ship` SHALL merge only when `/save`'s gate result is `SUCCESS` (checks passed) or `NONE` (the repo has no checks, so PR review is the gate); `UNKNOWN`, `TIMEOUT`, or `FAILURE` SHALL stop the merge. `/ship` SHALL NOT bypass, repeat, or reinterpret that result, and SHALL NOT start while the default branch's own checks are failing or unreadable.

For a verified managed Artifacts project, `/ship` SHALL use the mandatory exact-candidate Cloudflare check result and the approved publication contract defined by `cloudflare-hosted-projects`; no GitHub pull request or absent GitHub check SHALL count as its gate. A failed, timed-out or unreadable hosted gate SHALL stop publication.

#### Scenario: Checks fail on the branch

- **WHEN** a pushed commit's checks fail
- **THEN** the skill reads the failure and pushes a fix, at most three times
- **AND** `/ship` merges only once the checks pass

#### Scenario: The repo has no checks

- **WHEN** the repo has no CI workflow
- **THEN** `/save` reports `NONE` and `/ship` merges on PR review

#### Scenario: Hosted checks are unreadable

- **WHEN** the Cloudflare check result for the approved hosted candidate cannot be read
- **THEN** publication stops unverified and no GitHub fallback is used

### Requirement: The gate reads the pushed commit

The check wait on every route SHALL report on the commit just pushed and no other. For the GitHub route it SHALL report `NONE` only when the repo has no workflow files or no check appears within a grace period, and `UNKNOWN` when the check state cannot be read, so `/save` finishes unverified and `/ship` does not merge.

For the managed Artifacts route, mandatory checks SHALL never be treated as absent; missing or foreign-run results SHALL be unreadable rather than successful.

#### Scenario: The previous commit was green

- **WHEN** the previous commit's checks passed and the new commit's checks have not started
- **THEN** the wait does not report `SUCCESS`

### Requirement: Save checkpoints and never merges

For GitHub repositories, `/save` SHALL commit, push, open or update the pull request, and wait on the gate, and SHALL NOT merge, force-push, or bypass hooks. The pull request body SHALL show the change's current Status, its exact task checklist, and review and preview links when they exist, and no live credential value SHALL reach a commit, fact, pull request, or report.

For a verified managed Artifacts project, `/save` SHALL commit and push the candidate branch, maintain the same change record, wait for its exact Cloudflare gate and report its verified preview without a GitHub PR. On every route `/save` SHALL NOT merge, publish production, force-push or bypass hooks, and live credentials SHALL stay out of tracked content and reports.

#### Scenario: A normal save

- **WHEN** `/save` runs on a branch with an active change
- **THEN** the pull request shows the current Status and checklist, and the report ends with one gate result

#### Scenario: A hosted checkpoint

- **WHEN** `/save` runs on a verified managed Artifacts project
- **THEN** the candidate and change record are saved and the Cloudflare check result is reported, without creating a GitHub PR or publishing production

### Requirement: Git verbs check their preconditions first

For GitHub repositories, `/save`, `/continue`, and `/ship` SHALL check that `gh` is signed in, an `origin` remote exists, and the `openspec` CLI runs, before any git or GitHub action. A failed check SHALL stop the verb with the command that fixes it, and a sign-in failure SHALL NOT be read as "no PR".

For a managed Artifacts project, those verbs SHALL instead verify the private hosted handoff, project identity, authorized remote and applicable Cloudflare status before a mutation; a missing or invalid handoff SHALL stop with reconnect guidance rather than request a GitHub or customer Cloudflare sign-in. An Artifacts origin or committed marker SHALL NOT establish authorization.

#### Scenario: gh is signed out

- **WHEN** `/save` runs and `gh` is not signed in
- **THEN** it stops before the push and says to run `gh auth login`

#### Scenario: Hosted authority is missing

- **WHEN** a checkout identifies Artifacts but has no valid private hosted handoff
- **THEN** the verb stops before mutation with reconnect guidance and does not use personal setup

### Requirement: Every file edit takes the same route

Every save that changes a GitHub repository file SHALL take a feature branch, a pull request, and the gate, whatever paths or file types it changes. `/save` SHALL author an OpenSpec change only for code or a plan for code; a save with no change SHALL get a pull request body that describes the edit in plain words. A save whose only output is facts SHALL make no commit.

Every save that changes a verified managed Artifacts project SHALL take the candidate branch, change review and exact Cloudflare gate defined by `cloudflare-hosted-projects`, whatever paths it changes; the provider SHALL NOT alter plan, archive or wiki conventions. Facts-only saves SHALL make no repository mutation on either route.

#### Scenario: A wiki-only save

- **WHEN** `/save` runs and the only changed file is a wiki page
- **THEN** it opens a pull request with a plain body and waits on the gate, with no OpenSpec change
- **AND** nothing is pushed to the default branch

#### Scenario: A facts-only save

- **WHEN** the session only produced facts
- **THEN** they go to the memory store with no commit, branch, or pull request

### Requirement: Ship deletes the branch only after a confirmed merge

For GitHub repositories, `/ship` SHALL merge exactly the gated commit, confirm the merge, and retarget every open pull request based on the branch to the default branch before deleting it. When the merge fails, or the dependent pull requests cannot be listed, it SHALL keep the branch; a branch the forge already deleted SHALL be reported as deleted at merge, not as an error.

For managed Artifacts projects, `/ship` SHALL preserve the candidate/release refs until the approved publication and exact main acknowledgment are confirmed. A pending or failed publication SHALL retain its refs and evidence; deletion after success SHALL not erase the immutable publication receipt or customer history.

#### Scenario: A stacked pull request

- **WHEN** an open pull request uses the merged branch as its base
- **THEN** it is retargeted to the default branch before the delete, and the report names it
