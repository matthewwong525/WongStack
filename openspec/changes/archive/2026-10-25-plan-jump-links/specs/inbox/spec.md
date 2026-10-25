## MODIFIED Requirements

### Requirement: A plan opens inside the inbox without reaching the app

A plan item SHALL show the same review page the plan's file holds, with its notes and its actions. The page SHALL run sealed from the app: it SHALL be unable to read the person's sign-in, call the app, or change anything but its own notes and the actions its item offers.

#### Scenario: The person reviews a plan

- **WHEN** the person opens a plan item and taps *Build it*
- **THEN** the build request is queued for that plan's chat, carrying the version of the page they saw

#### Scenario: The page tries to reach the app

- **WHEN** a script on a plan's page tries to call the app or read its cookies
- **THEN** the call fails and nothing in the app changes

#### Scenario: A link on the page

- **WHEN** the person taps a link in a plan's page
- **THEN** it opens in a new tab, and the frame keeps the plan; a page that later loads in the frame can't tap or read notes

#### Scenario: A section link on the page

- **WHEN** the person taps *Changes* at the top of a plan in the inbox
- **THEN** the plan scrolls to its list of changes and stays in the frame
