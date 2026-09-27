## MODIFIED Requirements

### Requirement: A created wrangler config deploys

A wrangler config made from the fragment SHALL declare a deployable Worker, with entry point, assets, and compatibility settings beside the bindings, and every config-relative path SHALL be right for both the repo-root and `app/` layouts. Its compatibility settings SHALL turn off importable bindings, so code the Worker serves reaches a binding only when a route hands it one.

#### Scenario: The app layout

- **WHEN** provisioning creates `app/wrangler.jsonc`
- **THEN** `wrangler deploy` has an entry point, and migrations are found at `../schema/migrations`

#### Scenario: An installed repo updates

- **WHEN** `/wong-sync` plans an update from a release before this one
- **THEN** the plan adds the flag that turns off importable bindings to the repo's own `app/wrangler.jsonc`
