## ADDED Requirements

### Requirement: Setup creates the GitHub repository

Before setup sets a GitHub secret or pushes, it SHALL confirm that `gh` is authenticated, initialize git in the empty folder, and create a private GitHub repository with `origin` pointing at it. When `origin` already exists, setup SHALL use it and create nothing. When `gh` is not authenticated, setup SHALL stop with the sign-in command before it creates any Cloudflare resource.

#### Scenario: A new folder gets its repository

- **WHEN** setup runs in an empty folder and `gh` is authenticated
- **THEN** the folder is a git repository with an `origin` on GitHub before the CI secret is set

#### Scenario: gh is signed out

- **WHEN** setup runs and `gh auth status` fails
- **THEN** setup stops, names `gh auth login`, and has created no Cloudflare resource
