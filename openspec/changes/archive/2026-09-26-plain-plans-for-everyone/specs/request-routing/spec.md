## MODIFIED Requirements

### Requirement: Plain requests are done directly

In every repo, the agent SHALL do a plain request (research, an errand, a reminder, a question) directly, with no verb and no question round. It SHALL ask only when it can not act without an answer. It SHALL start the change loop on its own only when a request changes the repo's existing code or process. A request for a new standalone page or small tool SHALL take the mini-app path that `mini-apps` defines. When the person invokes a verb, the verb SHALL serve the work whatever its kind, as `work-verbs` defines. The rule SHALL live in the `WONG-STACK` block.

A code or process change the person asks for with no verb SHALL stop for the person twice. First, the agent SHALL run `/plan`, which ends with the review link and asks whether to build it now. On yes, it SHALL run `/apply`, whose completion save returns the CI result and the preview. It SHALL then ask whether to publish the change. On yes, it SHALL run `/ship`. A verb the person invokes SHALL keep its own authorization: `/ship` still runs the whole chain, and `/apply` still plans and builds without a stop. The person SHALL NOT need to name a verb to move the work to its next stage.

#### Scenario: An errand

- **WHEN** the person asks for the opening hours of a shop
- **THEN** the agent finds them and answers, with no `/explore` round and no OpenSpec change

#### Scenario: A code change

- **WHEN** the person asks to change how the repo's app stores data
- **THEN** the agent runs the change loop, starting at `/explore`
- **AND** it stops at the plan's review page and asks whether to build it now

#### Scenario: The person says yes to both stops

- **WHEN** the person answers "build it now" and then "publish it" with no verb
- **THEN** the agent runs `/apply`, reports the preview, and on the second yes runs `/ship` to the merge

#### Scenario: The person types /ship

- **WHEN** the person invokes `/ship add a sign-up page`
- **THEN** the chain runs to the merge with no stop at the plan or before the merge

#### Scenario: A mini app

- **WHEN** the person asks for a new page that tracks their runs
- **THEN** the agent builds it on the mini-app path, with no `/explore` round, and reports a preview URL

#### Scenario: A verb for non-code work

- **WHEN** the person invokes `/plan` for their week
- **THEN** the agent writes a to-do in the conversation and creates no OpenSpec change
