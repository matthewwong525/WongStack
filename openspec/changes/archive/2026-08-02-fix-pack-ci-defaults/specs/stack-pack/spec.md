## MODIFIED Requirements

### Requirement: The pack ships a GitHub Actions workflow as its CI

The pack SHALL include a GitHub Actions workflow file that runs the pack's build and deploy scripts on push, supplying the branch name they need and reading the Cloudflare credentials from GitHub repository secrets. It SHALL be a drop-in payload file subject to the same copy-if-absent, never-overwrite rule as every other pack file, and SHALL surface as a pull-request check so the existing delivery gate has something to wait on.

The workflow SHALL NOT reimplement any branch logic. Deciding which database to migrate and which Worker to deploy to belongs to `scripts/cf-build.sh` and `scripts/cf-deploy.sh`, so that both CI backends run identical code and the deploy model is independent of the CI choice.

Where the Cloudflare credentials are absent, the workflow SHALL build without deploying, so a repo that took the pack but has not yet been provisioned gets a useful check rather than a permanently failing one. That path SHALL NOT route through the build wrapper, which requires a staging environment an unprovisioned repo does not yet have.

**No step that runs before the credential guard SHALL fail on a repo the pack has been installed into but not yet configured.** The pack ships its CI before a wrangler config exists, so "installed, not yet provisioned" is the default state and every step reachable in it SHALL either succeed or skip. Where the workflow can find neither a wrangler config nor an app to build, it SHALL report that the repo is not yet configured, name the provisioning skill, and **exit green**. A step that aborts in this state produces exactly the permanently red check this requirement exists to prevent, and does so on the first push a new adopter makes.

#### Scenario: A pack repo gains a PR check

- **WHEN** a repo that took the pack pushes a branch and opens a pull request
- **THEN** the workflow runs and reports as a check on that pull request
- **AND** `/save` and `/ship` wait on it through the existing check-waiting path

#### Scenario: An unprovisioned repo still gets a green check

- **WHEN** the workflow runs in a repo with no `CLOUDFLARE_API_TOKEN` secret
- **THEN** it builds the app and deploys nothing
- **AND** it reports why, naming the provisioning skill as the next step

#### Scenario: A repo with no wrangler config is not failed for it

- **WHEN** the workflow runs in a repo that has the pack but no wrangler config — the state the pack ships in
- **THEN** no step aborts, the job reports that the repo is not yet configured, and the check is green
- **AND** the message names `/wong-cloudflare` as what turns deploying on

#### Scenario: The workflow is never overwritten

- **WHEN** `/wong-sync` runs in a repo that already has the workflow file
- **THEN** the existing file is left untouched
- **AND** any upstream change to it surfaces through the adapt step as a proposal

## ADDED Requirements

### Requirement: One commit deploys once

A commit on a branch SHALL produce exactly one deploy. The pack's workflow triggers on both `push` and `pull_request`, and those two events SHALL NOT both deploy the same commit: two concurrent `wrangler versions upload` calls race to bind the same per-commit preview alias, and while the race settles the alias intermittently serves Cloudflare's placeholder page — indistinguishable, to the person looking at it, from a failed deploy.

Three constraints hold together, and satisfying only some of them reintroduces the problem in a different form:

- **The concurrency group SHALL distinguish the event as well as the branch.** Keying on the branch alone makes the two triggers share a group, and GitHub **cancels** the loser. `gh pr checks` reports a cancelled run as `fail`, so a shared group converts a double deploy into a blocked `/ship`.
- **A job-level condition SHALL prevent the redundant run from starting** — `push`, plus pull requests whose head repository differs from the base (forks, which produce no push event in this repo). A same-repo pull request is already covered by its own push.
- **`push` SHALL remain the deploying event.** Its `github.sha` is the branch head, which is what the preview-URL resolver looks up; a `pull_request` SHA is the merge commit, which no deploy ever published.

The condition alone SHALL NOT be relied on, because **GitHub evaluates concurrency before a job's `if`** — a run that will be skipped can still cancel the run doing the work.

#### Scenario: A branch with an open PR deploys once

- **WHEN** a commit is pushed to a branch that has an open pull request in the same repository
- **THEN** exactly one job deploys it
- **AND** no second job uploads a version bound to the same preview alias

#### Scenario: A skipped run cancels nothing

- **WHEN** the redundant `pull_request` run is skipped by its condition
- **THEN** the `push` run that is deploying is not cancelled
- **AND** the check reports success rather than cancellation

#### Scenario: The preview URL still resolves

- **WHEN** the deploy publishes a preview URL for a branch commit
- **THEN** the URL is attached to the branch head SHA
- **AND** `.claude/skills/save/scripts/preview-url.sh` resolves it for that commit

#### Scenario: A fork pull request still gets a check

- **WHEN** a pull request arrives from a fork, which produces no push event in this repository
- **THEN** the `pull_request` run executes so the contribution is still checked
