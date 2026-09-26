# request-routing Specification

## Purpose

Let every WongStack repo act as an assistant: do plain requests directly, let a verb the person invokes serve any work, send a new standalone page or tool down the mini-app path, and keep the full change loop for changing the repo's code or process, with the same rules in every repo.
## Requirements
### Requirement: Plain requests are done directly

In every repo, the agent SHALL do a plain request (research, an errand, a reminder, a question) directly, with no verb and no question round. It SHALL ask only when it can not act without an answer. It SHALL start the change loop on its own only when a request changes the repo's existing code or process. A request for a new standalone page or small tool SHALL take the mini-app path that `mini-apps` defines. When the person invokes a verb, the verb SHALL serve the work whatever its kind, as `work-verbs` defines. The rule SHALL live in the `WONG-STACK` block.

#### Scenario: An errand

- **WHEN** the person asks for the opening hours of a shop
- **THEN** the agent finds them and answers, with no `/explore` round and no OpenSpec change

#### Scenario: A code change

- **WHEN** the person asks to change how the repo's app stores data
- **THEN** the agent runs the change loop, starting at `/explore`

#### Scenario: A mini app

- **WHEN** the person asks for a new page that tracks their runs
- **THEN** the agent builds it on the mini-app path, with no `/explore` round, and reports a preview URL

#### Scenario: A verb for non-code work

- **WHEN** the person invokes `/plan` for their week
- **THEN** the agent writes a to-do in the conversation and creates no OpenSpec change

### Requirement: No repo has a mode

No install record field, flag, or file SHALL change how a repo handles requests or writes its wiki. A home repo and a work repo SHALL follow the same rules. Home SHALL differ only in that the machine records it as the person's own repo.

#### Scenario: The same request in home and at work

- **WHEN** the same errand is asked in home and in a work repo
- **THEN** both handle it the same way

