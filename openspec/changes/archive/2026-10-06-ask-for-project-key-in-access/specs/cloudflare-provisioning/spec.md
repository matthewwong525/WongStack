# Spec Delta

## MODIFIED Requirements

### Requirement: Setup tells the app which project it hands out

Setup and the Access step SHALL record, as committed nonsecret configuration, the one project the app hands out, on the live app and on staging. On an install whose project is kept in the employer's Cloudflare account they SHALL also connect the app to that repository, so no key is made or pasted. On a GitHub install they SHALL leave the read-only key to the employer through the private key link, and SHALL report it as missing with its numbered steps. They SHALL NOT raise that key as a to-do, and setup's closing report SHALL NOT mention it: the employer is asked in Access when they first let someone install the project. Running the step again SHALL change nothing that is already right. The account token SHALL still never reach a Worker.

#### Scenario: A Cloudflare-kept install updates

- **WHEN** the Access step runs on an install with no GitHub
- **THEN** the app is connected to its own repository, Project code shows as saved after the next publish, and no key was asked for

#### Scenario: A GitHub install updates

- **WHEN** the Access step runs on a GitHub install with no read-only key saved
- **THEN** the project is recorded, the report names the key as missing with its steps, no to-do asks for it, and Connect keeps working as before for everyone

#### Scenario: Setup finishes on GitHub with no teammate yet

- **WHEN** setup finishes a new GitHub install
- **THEN** its closing report says nothing about a read-only GitHub key, and the employer is not asked for one
