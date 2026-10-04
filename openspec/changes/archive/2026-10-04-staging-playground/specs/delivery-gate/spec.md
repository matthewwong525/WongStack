# Spec Delta

## ADDED Requirements

### Requirement: Ship looks at the live app once after the merge

After a merge that deploys, `/ship` SHALL wait a bounded time for the default branch's release of the merged commit and open the live app once. The look SHALL only read: it SHALL NOT save, send, purchase, or change anything on the live app. A release that failed or a live app that does not open SHALL be reported in plain words in the same chat; `/ship` SHALL then build one fix through the normal change loop and ask before publishing it, and SHALL NOT publish it unasked or try a second fix. A look that cannot run (no release recorded, no live address, no access, or the wait ran out) SHALL be one line in the report, never a failed ship. A merge that deploys nothing SHALL skip the look.

#### Scenario: The release lands

- **WHEN** the merged commit's release succeeds and the live app opens
- **THEN** the ship report says it is live and that the live app was opened

#### Scenario: The release fails

- **WHEN** the merged commit's release fails, or the live app answers with an error
- **THEN** the chat says what is not working, a fix is built and previewed, and the person is asked whether to publish it
