## Purpose

Pin, in deterministic tests, the paths, names, and deploy behavior that downstream users rely on, so that a WongStack change cannot silently break `wongstack-cloud`, installed repos, or the staging model.

## ADDED Requirements

### Requirement: Contract tests pin what downstream setup relies on

The source repository's CI SHALL run tests that fail when any of these change without the test being updated in the same commit: the README setup URL path; the name `/wong-setup` and the location of its provisioning runbook; the environment variable names `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_MEMORY_TOKEN` in `.env.example`; the GitHub secrets that `deploy.yml` reads; and the deploy token's permission list. Each failure SHALL name the downstream surface it protects.

#### Scenario: A rename breaks the contract

- **WHEN** a commit renames a pinned variable, secret, path, or permission
- **THEN** the contract test fails and names the surface that depends on it

#### Scenario: The workflow reads only the named secrets

- **WHEN** the test reads `.github/workflows/deploy.yml`
- **THEN** the only Cloudflare secrets it reads are `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`

### Requirement: The deploy branch logic is tested without Cloudflare

The pack's deploy script SHALL be tested against a fake `wrangler` that records its arguments. The tests SHALL cover the default branch deploying the production Worker, another branch deploying the staging Worker and uploading a preview alias, the preview URL output, and a refusal when the resolved Worker name would be production on a non-production branch. The tests SHALL need no network and no credential.

#### Scenario: A feature branch deploys only to staging

- **WHEN** the deploy script runs with a non-default branch and the fake `wrangler`
- **THEN** every recorded `wrangler` call targets the staging environment
- **AND** the script prints the preview URL that the fake reported

#### Scenario: The default branch deploys production

- **WHEN** the deploy script runs with the default branch
- **THEN** it calls `wrangler deploy` for the production Worker and uploads no preview alias

### Requirement: A live smoke run proves staging with the deploy token

Before release, one live run SHALL provision a throwaway repository from an empty folder with a user token on the host, push a branch, and confirm that CI deployed the staging Worker and published a preview URL with only the minted deploy token as its secret. The run SHALL then merge or push to the default branch to confirm the production deploy, and SHALL tear down every resource it created. The change SHALL record the result, the permissions the deploy token needed, and any permission that was missing.

#### Scenario: The deploy token is enough

- **WHEN** the throwaway repository's CI runs with the minted deploy token
- **THEN** migrations apply, the staging Worker deploys, and the preview URL returns `200`

#### Scenario: The smoke run cleans up

- **WHEN** the smoke run finishes
- **THEN** the teardown runbook removes the Workers, databases, memory store, and tokens it created, and reports anything skipped
