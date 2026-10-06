# Spec Delta

## ADDED Requirements

### Requirement: Setup tells the app which project it hands out

Setup and the Access step SHALL record, as committed nonsecret configuration, the one project the app hands out, on the live app and on staging. On an install whose project is kept in the employer's Cloudflare account they SHALL also connect the app to that repository, so no key is made or pasted. On a GitHub install they SHALL leave the read-only key to the employer through the private key link, with numbered steps, and SHALL report it as the one step left. Running the step again SHALL change nothing that is already right. The account token SHALL still never reach a Worker.

#### Scenario: A Cloudflare-kept install updates

- **WHEN** the Access step runs on an install with no GitHub
- **THEN** the app is connected to its own repository, Project code shows as saved after the next publish, and no key was asked for

#### Scenario: A GitHub install updates

- **WHEN** the Access step runs on a GitHub install with no read-only key saved
- **THEN** the project is recorded, the report names the key as the one step left, and Connect keeps working as before for everyone
