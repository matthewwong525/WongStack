# Spec Delta

## MODIFIED Requirements

### Requirement: Stack-pack tools stay in the repo's build and CI

The Cloudflare stack pack's `node`, `npm`, and `wrangler` use SHALL run only in that repo's own build and CI, and provisioning SHALL use `curl` against the Cloudflare API so the person's machine needs no app dependency. The two exceptions are the check runner of an Artifacts install and the routine runner of an install that schedules: each is installed from the pack's own pinned and locked tools, outside the app, and adds nothing to the app's dependencies.

#### Scenario: Setup provisions Cloudflare

- **WHEN** setup provisions the app on a fresh computer
- **THEN** it reaches Cloudflare with `curl` and installs no app dependency

#### Scenario: Setup installs the check runner

- **WHEN** setup installs the check runner of an Artifacts install
- **THEN** it uses only the pack's pinned and locked tools, needs no container software on the computer, and leaves the app's dependencies unchanged

#### Scenario: The first routine installs the routine runner

- **WHEN** a person's first `/routine` installs the routine runner
- **THEN** it uses only the pack's pinned and locked tools, needs no container software on the computer, and leaves the app's dependencies unchanged
