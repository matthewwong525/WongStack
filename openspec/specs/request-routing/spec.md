# request-routing Specification

## Purpose

Let every WongStack repo act as an assistant: do plain requests directly, and keep the change verbs for building or changing code, with the same rules in every repo.

## Requirements

### Requirement: Plain requests are done directly

In every repo, the agent SHALL do a plain request (research, an errand, a reminder, a question) directly, with no verb and no question round. It SHALL ask only when it can not act without an answer. It SHALL use the change verbs only when a request builds or changes code, and then the verbs SHALL work as before. The rule SHALL live in the `WONG-STACK` block.

#### Scenario: An errand

- **WHEN** the person asks for the opening hours of a shop
- **THEN** the agent finds them and answers, with no `/explore` round and no OpenSpec change

#### Scenario: A code change

- **WHEN** the person asks to add a page to the repo's app
- **THEN** the agent runs the change loop, starting at `/explore`

### Requirement: No repo has a mode

No install record field, flag, or file SHALL change how a repo handles requests or writes its wiki. A home repo and a work repo SHALL follow the same rules. Home SHALL differ only in that the machine records it as the person's own repo.

#### Scenario: The same request in home and at work

- **WHEN** the same errand is asked in home and in a work repo
- **THEN** both handle it the same way
