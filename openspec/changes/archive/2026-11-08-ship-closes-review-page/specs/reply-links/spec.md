## ADDED Requirements

### Requirement: A shipped plan leaves Needs you

When a change ships and is live, its plan's page in the person's Inbox SHALL close and move to the Archive, wherever the plan was made: another chat, folder or computer. A page whose chat or folder is gone SHALL still close in its app while any folder on the computer can reach that app. A failed close SHALL NOT stop the ship. Asking for a shipped plan's link SHALL NOT open a new page that waits on the person.

#### Scenario: A plan made in a closed chat ships

- **WHEN** a plan's page waits in the Inbox, its chat was closed and its folder deleted, and the change ships from another chat
- **THEN** once the change is live, the page leaves Needs you and opens read-only from the Archive

#### Scenario: The Inbox can not be reached at ship time

- **WHEN** the change merges but the Inbox does not answer the close
- **THEN** the ship finishes and its report says the plan page was not closed
