# Spec Delta

## ADDED Requirements

### Requirement: A kept check replays on the site it was recorded on

A kept check MAY name a second site by the name of the commit status that carries that site's preview address; a check that names none SHALL belong to the main preview. The replay SHALL run a named check against that site's preview for the saved revision, and SHALL NOT send it the main preview's Access credentials. When the saved revision has no preview of that site, or its address can not be read, the check SHALL be reported as not run with that reason, SHALL NOT be reported as changed, SHALL spend none of the replay's time limit, and SHALL NOT count as a pass. Keeping a check recorded on a second site SHALL record the site's name and SHALL hold no address. A caller MAY supply a named site's address directly.

#### Scenario: The change leaves the second site alone

- **WHEN** the project holds a kept check that names a second site and the saved revision has no preview of that site
- **THEN** the replay reports that check as not run, naming the missing preview, and opens no page for it
- **AND** the checks of the main preview replay as before

#### Scenario: The change has a preview of the second site

- **WHEN** the project holds a kept check that names a second site and the saved revision has a preview of that site
- **THEN** the replay runs that check against the second site's preview and reports it as same or changed
- **AND** the request carries no Access credential of the main preview

#### Scenario: A check is kept from a second site

- **WHEN** a passed journey is kept with a second site named
- **THEN** the kept file records the site's name, holds no address, and replays against that site's preview
