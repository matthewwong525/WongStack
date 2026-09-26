## MODIFIED Requirements

### Requirement: The starter landing page lists the mini apps and teaches the loop

The starter app's landing page SHALL open with a tutorial titled *Learn the development loop*. The tutorial SHALL show one plain-language message for the person to paste into their chat with the agent, and a button that copies it. The message SHALL ask the agent to remove the tutorial from the home page and to explain each step as it goes. It SHALL NOT be a command. The tutorial SHALL NOT list the loop's steps itself; the agent explains them in chat. Removing it is the person's first change, so it teaches the loop by doing. When copying fails, the button SHALL say to copy the message by hand, and the message SHALL stay selectable.

The tutorial SHALL be one part of the page that can be removed with no other change. Below it, the page SHALL list the mini apps from `/apps/apps.json`, each with its title, description, and a link to it. With no mini apps, it SHALL say how to ask for one.

Setup's closing report SHALL point the person to the tutorial on their site. `/wong-sync` SHALL add or update the tutorial only when the target's landing page still renders it; a removed tutorial SHALL stay removed.

#### Scenario: A fresh install

- **WHEN** a person opens the production app of a new install
- **THEN** the landing page opens with *Learn the development loop*, the message, and a Copy button, and lists the example app below it

#### Scenario: Copying the message

- **WHEN** the person presses Copy
- **THEN** the message is on their clipboard and the button says it was copied

#### Scenario: Copying is blocked

- **WHEN** the browser refuses clipboard access
- **THEN** the button says to copy the message by hand, and the message can be selected

#### Scenario: The agent teaches the loop

- **WHEN** the person pastes the message into the chat
- **THEN** the agent explains each step before it runs it, stops at the plan to ask "build it now?", and stops after the preview to ask "publish it?"

#### Scenario: The list can not load

- **WHEN** `/apps/apps.json` fails to load
- **THEN** the landing page still shows the tutorial and a link to `/apps/`

#### Scenario: The tutorial is done

- **WHEN** the person publishes the change that removes the tutorial
- **THEN** the landing page shows only the app list, and nothing else on it changes

#### Scenario: A removed tutorial after an update

- **WHEN** a target removed its tutorial and syncs to a later release
- **THEN** no tutorial is added back to its landing page
