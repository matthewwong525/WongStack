# Spec Delta

## ADDED Requirements

### Requirement: An unsaved key link says what happened

When a key link ends with nothing saved, the agent SHALL learn whether the person ever opened it and, when it closed for another private link, which workspace opened that link. The agent SHALL say which happened before it offers a new link, and SHALL NOT send another link to a person who never opened the last one without asking whether it loaded. What the agent learns SHALL hold no key value, private address, or page content.

#### Scenario: A link that ran out unopened

- **WHEN** a key link reaches its 30 minutes and nobody opened it
- **THEN** the agent says nobody opened it and asks whether the link loaded, before any new link

#### Scenario: Another chat's link took its place

- **WHEN** an unopened key link closes because a chat in another workspace opened a private link
- **THEN** the first chat names that workspace, says its own link closed for it, and offers a new one
