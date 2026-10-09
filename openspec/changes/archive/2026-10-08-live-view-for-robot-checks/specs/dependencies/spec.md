# Spec Delta

## ADDED Requirements

### Requirement: A live view adds its tools on first use

A live view SHALL be the one step that needs a screen viewer and the tools that show and place the personal browser's window. The agent SHALL install them the first time a live view needs them, after asking once and saying which need admin rights on the computer. The screen viewer SHALL be the one version WongStack has tried, in the person's home folder. They SHALL add nothing to the repository. On a machine that cannot have them, the agent SHALL install nothing and SHALL give the person steps instead.

#### Scenario: A first live view

- **WHEN** a task first needs a live view on a machine without its tools
- **THEN** the agent says what the install needs, admin rights included, asks, installs them, and opens the view

#### Scenario: The person says no

- **WHEN** the person declines the install
- **THEN** nothing is installed and the agent gives the person steps to pass the check on their own device
