# Spec Delta

## ADDED Requirements

### Requirement: Credential boundaries are tested without Cloudflare

Tests SHALL prove, with no network and dummy credentials, that each deploy workflow's job that holds the token checks out and runs only default-branch files and installs with scripts off. They SHALL prove that each job running branch code references no Cloudflare secret, and that a fork pull request never selects production. They SHALL prove the check runner's deploy stage runs no workspace file and no package install script while the token is held, that a preview whose build leaves staging or binds another database is refused, and that no workflow reads the old deploy secret name `CLOUDFLARE_API_TOKEN`.

#### Scenario: A workflow edit hands branch code the token

- **WHEN** a change puts the token at job level, references a secret in the build job, or runs a branch script, local action or `npm ci` without `--ignore-scripts` in the credentialed job
- **THEN** the workflow test fails naming the job and step

#### Scenario: The runner's deploy stage reaches the token

- **WHEN** a stand-in install script in the deploy stage reads its ancestors' `/proc` environment, or a checks-stage script edits a workspace deploy script
- **THEN** the check runner test fails, because no token is found and no edited file runs

#### Scenario: A workflow reads the old secret name

- **WHEN** a workflow names `secrets.CLOUDFLARE_API_TOKEN`
- **THEN** the workflow test fails naming the file
