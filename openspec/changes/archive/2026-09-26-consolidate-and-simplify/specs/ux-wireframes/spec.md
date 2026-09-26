## RENAMED Requirements

- FROM: `### Requirement: A UI-bearing change carries one wireframe file`
- TO: `### Requirement: Every change carries one review page`

## REMOVED Requirements

### Requirement: The revised kit applies to newly created pages

**Reason**: Its older-page refresh was removed in 19.0.0.
**Migration**: Replaced by "Every page uses the current kit"; archived pages are still never rebuilt.

## ADDED Requirements

### Requirement: Every page uses the current kit

Every assembled page SHALL use the current kit. Archived pages SHALL NOT be rebuilt.

#### Scenario: A new review is generated

- **WHEN** a plan builds a review from the current kit
- **THEN** the page is one scrolling document with text visuals, decisions, and tap-to-note

#### Scenario: Archived pages remain historical

- **WHEN** the shared kit changes
- **THEN** archived pages are not rebuilt
