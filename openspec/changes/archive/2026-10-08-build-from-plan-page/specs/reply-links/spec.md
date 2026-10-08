# Spec Delta

## ADDED Requirements

### Requirement: A page can offer fixed actions

A reply link's opener MAY name actions, each with the message it sends. A page on that link SHALL be able to trigger an action by name only, with the link's secret, and the chat that opened the link SHALL receive that action's message exactly as the opener wrote it: the page SHALL never supply or alter it. An action SHALL be refused when the page's file has changed since the page read it, and SHALL be accepted at most once per version of the file. The page SHALL be told which actions the link offers and whether a trigger reached the chat.

#### Scenario: The person taps an action

- **WHEN** the person triggers a named action on an open reply link whose file is unchanged
- **THEN** the chat receives that action's fixed message once, and a second trigger sends nothing

#### Scenario: The file changed since the page loaded

- **WHEN** the page's file is rebuilt and the person triggers an action from a tab opened before
- **THEN** nothing reaches the chat and the page is told the file changed
