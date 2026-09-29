## ADDED Requirements

### Requirement: Pack scripts agree on the production branch

Every pack script that asks which branch is production SHALL answer by one rule: `CF_PRODUCTION_BRANCH` when set, else the remote's default branch when Git knows it, else `main`.

#### Scenario: Workers Builds with no variable set

- **WHEN** the deploy script runs on Workers Builds with no `CF_PRODUCTION_BRANCH`, on the branch the remote names as its default, `trunk`
- **THEN** it deploys production, and the preview script refuses to upload from `trunk`

#### Scenario: The variable wins

- **WHEN** `CF_PRODUCTION_BRANCH` names a branch other than the remote's default
- **THEN** the deploy and preview scripts both treat the named branch as production
