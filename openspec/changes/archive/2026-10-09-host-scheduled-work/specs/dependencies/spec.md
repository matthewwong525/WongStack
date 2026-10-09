## REMOVED Requirements

### Requirement: Stack-pack tools stay in the repo's build and CI

**Reason:** Host scheduling removes the cloud routine runner installation exception.

**Migration:** Use the replacement requirement below; preserve installed legacy jobs while moving them explicitly.

## ADDED Requirements

### Requirement: Stack-pack tools retain only the check-runner exception

The Cloudflare stack pack's `node`, `npm`, and `wrangler` use SHALL run only in that repo's own build and CI, and provisioning SHALL use `curl` against the Cloudflare API so the person's machine needs no app dependency. The exception is the check runner of an Artifacts install: it is installed from the pack's own pinned and locked tools, outside the app, needs no container software on the computer, and adds nothing to the app's dependencies. Assistant scheduling SHALL use an available host's tools and SHALL not install a separate routine runner; deterministic scheduled app jobs SHALL use the app's ordinary build and delivery path.

#### Scenario: Setup provisions Cloudflare and the check runner

- **WHEN** setup provisions an Artifacts install and its check runner on a fresh computer
- **THEN** provisioning uses the Cloudflare API, the runner uses only the pack's pinned and locked tools, and no app dependency or container software is added to the computer

#### Scenario: First host schedule after updating

- **WHEN** a person requests their first schedule after updating from the cloud routine skill
- **THEN** no routine runner is installed and the available host's verified scheduler is used
