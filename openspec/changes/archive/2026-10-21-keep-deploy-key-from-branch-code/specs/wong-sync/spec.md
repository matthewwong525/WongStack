# Spec Delta

## MODIFIED Requirements

### Requirement: An old install catches up in place

Sync SHALL plan the update of an install from before 19.0.0 in place, keeping every local edit, and SHALL NOT route it to a fresh setup. The comparison SHALL report, from the repo's layout, its install record and the secret name its `deploy.yml` reads, each move the install missed: the agent folder, the rules file in either link direction, WongStack pages kept outside `wiki/`, leftover generated OpenSpec skills, parts the record opted out of, the CI deploy token, and the deploy token's old secret name. The plan SHALL include each reported move and list opted-out parts as left out until the person asks for them.

#### Scenario: A months-old, edited install

- **WHEN** a person runs `/wong-sync` in a 16.x install with a real `.claude/` folder and edited skills
- **THEN** the plan moves the folder, keeps every edited file's local text, and brings the payload up to date

#### Scenario: A part the person turned down

- **WHEN** the install record says the repo declined the starter app
- **THEN** the plan lists the starter app as left out, with that reason, and adds none of its files

#### Scenario: The deploy key has its old name

- **WHEN** the install's `deploy.yml` reads `secrets.CLOUDFLARE_API_TOKEN`
- **THEN** the plan runs the deploy key step during the update's build, before publish, and says live deploys pause until the update is published
