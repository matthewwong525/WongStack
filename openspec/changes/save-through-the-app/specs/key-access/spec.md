# Spec Delta

## MODIFIED Requirements

### Requirement: Project code is a key with one level

Project code SHALL be a key offering Read as its only level, settable per person and per role like any key and usable with no app ticked. That one level SHALL let a person install the project and save changes through the app. A person's page and a role's page SHALL offer it as one tick that says the person can install the project, with a line saying they can save changes too, off for a new person. It SHALL count as saved when the installation holds a credential that reads its one project, or is connected to its own repository in the employer's Cloudflare account. Ticking an app SHALL never give it. Its credentials SHALL be usable for that one project only, and no action or mini app SHALL be handed them.

While the installation can not hand its project out, every place Project code is given SHALL name the one step left and what it is for: a key where the project is kept on GitHub with none saved, or finishing Access setup where no project is recorded. On GitHub that step SHALL ask for one key that both hands the project out and saves changes. The employer SHALL get the request to hand their assistant; a manager SHALL read that the step is the employer's. Giving Project code SHALL still save, and SHALL take effect once the project can be handed out.

While the installation can hand its project out and can not yet save changes, the same places SHALL say saving needs one more step and name it, and SHALL keep handing the project out meanwhile. An installation connected to its own repository and check runner in the employer's Cloudflare account SHALL need no key and no step from the employer to save.

#### Scenario: The employer gives Project code to a role

- **WHEN** the employer sets Project code to Read on a role two people hold
- **THEN** both people may install the project on their next request, and a person outside the role may not

#### Scenario: The credential is not saved yet

- **WHEN** the employer opens a person on an installation that can not yet hand its project out
- **THEN** Project code shows as not saved with the one step left, and nobody's connection changes

#### Scenario: The employer lets a new person install the project with no key saved

- **WHEN** the employer adds a person on a GitHub installation with no key and ticks that they can install the project
- **THEN** the page says a GitHub key comes first and gives the request to copy, the tick saves, and the person can install the project and save changes once the key is saved with no further change in Access

#### Scenario: The project can be handed out

- **WHEN** the employer opens a person on an installation that can hand its project out and save changes
- **THEN** the tick shows with no step under it, and ticking it and saving lets that person install the project and save changes on their next request

#### Scenario: A GitHub installation holds only its read-only key

- **WHEN** the employer opens a person on a GitHub installation that holds only a read-only key
- **THEN** the tick says saving needs one more step and gives the request to copy, people who hold the tick keep installing the project, and they can save once the new key is in with no further change in Access
