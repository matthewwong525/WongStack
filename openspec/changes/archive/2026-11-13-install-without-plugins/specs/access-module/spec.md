## MODIFIED Requirements

### Requirement: Access installs as one module

Access SHALL ship as one folder, with its own start-of-chat check, that every repo with Access holds as a real folder in its skills folder. The project's own settings SHALL run that check, never a plugin, so it runs in every chat, trusted folder or not. The folder SHALL import no file outside itself, and SHALL need no other WongStack module to run. A full WongStack install SHALL get it with each update, and WongStack's own app SHALL use the same folder it ships.

#### Scenario: Access alone in an empty repo

- **WHEN** the module's install test copies the Access folder alone into an empty repo, fills only the required slots with stand-ins, and runs a chat start and Access's check
- **THEN** both pass, and no file in the folder imports a file outside it

#### Scenario: A WongStack install after its update

- **WHEN** a WongStack install takes this release with its update
- **THEN** Access is a real folder in its skills folder, and the owner, Admins, and every person keep the same apps, key levels, and roles, with no step for the owner
