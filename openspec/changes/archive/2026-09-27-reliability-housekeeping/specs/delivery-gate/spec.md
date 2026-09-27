## MODIFIED Requirements

### Requirement: Ship distills the change's facts into the wiki

Before archiving, `/ship` SHALL read the facts recorded on the change, on its branch, and by any session that wrote a fact on the change, so a renamed branch loses none. It SHALL keep only repeatable knowledge and write it into the owning wiki pages in the same pull request (`knowledge-center`), noting the pages or "no repeatable fact" in the Decision log. A private-life fact SHALL NOT move into the repo's wiki, and an unreachable store SHALL skip the step without blocking the ship.

#### Scenario: A reusable convention

- **WHEN** a change's facts record a convention for future work
- **THEN** the ship pull request edits the wiki page that owns it

#### Scenario: The branch was renamed mid-change

- **WHEN** a session started on a branch that was later renamed, and wrote facts on the change and on another topic
- **THEN** the distill step reads both facts
