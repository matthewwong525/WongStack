## ADDED Requirements

### Requirement: A script can open a tagged workspace and find it again

A repo's own script SHALL be able to open a workspace through the same opener a person's chat uses, with the same checks, and MAY give it one `key=value` tag that Paseo keeps on the new agent. A tag with any other shape SHALL be refused before anything opens.

#### Scenario: A tool opens a tagged chat

- **WHEN** a repo script opens a workspace with the tag `job=42`
- **THEN** the workspace opens as one a person would open, and listing agents tagged `job=42` finds it

#### Scenario: An unsafe tag

- **WHEN** a script asks for the tag `job=42; rm -rf ~`
- **THEN** the opener refuses it and no workspace opens
