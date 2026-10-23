## MODIFIED Requirements

### Requirement: A change asked with no verb stops at the plan and at the preview

A code or process change asked for with no verb SHALL stop at the plan's review link, with no question: from that page the person builds it, or builds and publishes it in one go with no stop before the merge. After a build alone, it SHALL stop at the preview to ask whether to publish, running the next verb on yes. A verb the person types SHALL keep its own reach.

#### Scenario: Yes to both stops

- **WHEN** the person asks to change how the app stores data, taps *Build it* on the plan's page, then says yes at the preview
- **THEN** the agent runs `/plan`, `/apply`, and `/ship` without the person naming a verb

#### Scenario: The person types /ship

- **WHEN** the person invokes `/ship add a sign-up page`
- **THEN** the chain runs to the merge with no stop at the plan or before the merge
