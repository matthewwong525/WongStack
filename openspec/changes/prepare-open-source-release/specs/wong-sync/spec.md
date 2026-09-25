## ADDED Requirements

### Requirement: Sync migrates repos installed before 18.0.0

A sync that brings in 18.0.0 SHALL plan these tasks for a repo that needs them: move a real `.claude/` folder to `.agents/` and add `.claude` and `.codex` links to it, preserving every local file; move a real `.codex/config.toml` and `.codex/hooks.json` into `.agents/`, merging with any local entries; remove the `wong-cloudflare` skill; and, where the repo has the stack pack, mint a `<repo>-deploy` token from the user token in the host `.env` and set it as the GitHub secret `CLOUDFLARE_API_TOKEN`. The plan SHALL recommend rolling the user token's value, because CI could read it before this release. The sync SHALL follow setup's provisioning runbook from the source checkout for the token step.

#### Scenario: A legacy layout moves

- **WHEN** `/wong-sync` runs in a repo with a real `.claude/` folder
- **THEN** its plan moves the folder to `.agents/`, adds both links, and lists every local file it preserves

#### Scenario: The GitHub secret is replaced

- **WHEN** `/wong-sync` runs in a stack-pack repo whose GitHub secret holds the user token
- **THEN** its plan mints the deploy token, replaces the secret, and recommends rolling the user token
