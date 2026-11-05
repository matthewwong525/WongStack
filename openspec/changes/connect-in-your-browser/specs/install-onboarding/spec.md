# Spec Delta

## MODIFIED Requirements

### Requirement: Setup goes on to connecting the owner's tools

After a finished install's closing report, setup SHALL go on in the same chat to connecting the tools the owner works with. When that ends, setup SHALL offer in the same chat a first app built on the tools that work, with no step that opens the site to copy a request; the site's first request SHALL stay as a fallback. The owner SHALL be able to skip connecting, and setup SHALL then offer the first app at once. An evaluation run, or an install that did not finish, SHALL NOT start it.

#### Scenario: A fresh install

- **WHEN** an owner's install finishes and the closing report is given
- **THEN** the chat suggests the tools they use, connects them, and then offers a first app built on the tools that work

#### Scenario: The owner skips

- **WHEN** the owner answers *skip*
- **THEN** the chat connects nothing and offers the first app at once

#### Scenario: The owner declines the first app

- **WHEN** the owner says no to the first app
- **THEN** the chat ends on the site's address and says the request on the site starts it later
