## ADDED Requirements

### Requirement: The scaffold ships only the mini Worker and its example app

The payload manifest SHALL list the mini-app scaffold file by file: the mini Worker, its editor config, its ignore files, and the example app folder `mini-apps/apps/hello/`. It SHALL NOT list `mini-apps/` or `mini-apps/apps/` as a whole folder, and it SHALL NOT list `mini-apps/wrangler.jsonc`. An app folder added to the source repo SHALL therefore never reach a target through setup or sync.

#### Scenario: An app made in the source repo stays there

- **WHEN** the source repo gains `mini-apps/apps/tips/` and a target syncs
- **THEN** the sync selects no path under `mini-apps/apps/tips/`
- **AND** it still selects the example app and the mini Worker
