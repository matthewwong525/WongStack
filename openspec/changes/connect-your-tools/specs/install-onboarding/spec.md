## ADDED Requirements

### Requirement: Setup goes on to connecting the owner's tools

After a finished install's closing report, setup SHALL go on in the same chat to connecting the tools the owner works with, before the step that opens the site and pastes the first request. The owner SHALL be able to skip it, and setup SHALL then give that step at once. An evaluation run, or an install that did not finish, SHALL NOT start it.

#### Scenario: A fresh install

- **WHEN** an owner's install finishes and the closing report is given
- **THEN** the chat asks which tools they use, connects them, and then says to open the site and paste the first request

#### Scenario: The owner skips

- **WHEN** the owner answers *skip*
- **THEN** the chat gives the step that opens the site and pastes the first request, and connects nothing
