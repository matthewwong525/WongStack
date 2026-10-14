## ADDED Requirements

### Requirement: Project code has a save level and a publish level

Project code SHALL be a key offering two levels, settable per person and per role like any key and usable with no app ticked. Its first level SHALL let a person install the project and save changes through the app. Its second level SHALL also let them publish a saved change through the app. A person's page and a role's page SHALL offer the levels as two ticks: one that says the person can install the project, with a line saying they can save changes too, and one that says they can publish, with a line saying their changes go live once the checks pass. Both SHALL be off for a new person; the publish tick SHALL need the install tick. The owner and Admins SHALL hold both. Project code SHALL count as saved when the installation holds a credential that reads its one project, or is connected to its own repository in the employer's Cloudflare account. Ticking an app SHALL never give it. Its credentials SHALL be usable for that one project only, and no action or mini app SHALL be handed them.

While the installation can not hand its project out, every place Project code is given SHALL name the one step left and what it is for: a key where the project is kept on GitHub with none saved, or finishing Access setup where no project is recorded. On GitHub that step SHALL ask for one key that hands the project out, saves changes and publishes them. The employer SHALL get the request to hand their assistant; a manager SHALL read that the step is the employer's. Giving Project code SHALL still save, and SHALL take effect once the project can be handed out.

While the installation can hand its project out and can not yet save or publish changes, the same places SHALL say what needs one more step and name it, and SHALL keep handing the project out meanwhile. An installation connected to its own repository and check runner in the employer's Cloudflare account SHALL need no key and no step from the employer to save or publish.

#### Scenario: The employer gives Project code to a role

- **WHEN** the employer ticks install for a role two people hold
- **THEN** both people may install the project and save on their next request, neither may publish, and a person outside the role may not install

#### Scenario: The employer lets one teammate publish

- **WHEN** the employer ticks publish for Ana, who can already install the project
- **THEN** Ana's next publish of a change whose checks passed goes live, and Bo, who holds only the install tick, is refused

#### Scenario: The credential is not saved yet

- **WHEN** the employer opens a person on an installation that can not yet hand its project out
- **THEN** Project code shows as not saved with the one step left, and nobody's connection changes

#### Scenario: A GitHub installation holds only its read-only key

- **WHEN** the employer opens a person on a GitHub installation that holds only a read-only key
- **THEN** the ticks say saving and publishing need one more step and give the request to copy, people who hold the install tick keep installing the project, and they can save once the new key is in with no further change in Access

## REMOVED Requirements

### Requirement: Project code is a key with one level

**Reason**: Project code gains a publish level.

**Migration**: "Project code has a save level and a publish level". Everyone who holds Project code today keeps install and save; nobody but the owner and Admins gets publish.
