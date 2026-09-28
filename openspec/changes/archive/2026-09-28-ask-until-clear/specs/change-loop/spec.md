## MODIFIED Requirements

### Requirement: A change asked with no verb stops twice

A code or process change asked for with no verb SHALL stop at the plan's review link to ask whether to build it now, and after `/apply`'s preview to ask whether to publish, running the next verb on yes. The question at the plan SHALL also offer to build and publish in one go, which runs `/ship` with no stop before the merge. A verb the person types SHALL keep its own reach.

#### Scenario: Yes to both stops

- **WHEN** the person asks to change how the app stores data, then says yes at both stops
- **THEN** the agent runs `/plan`, `/apply`, and `/ship` without the person naming a verb

#### Scenario: Build and publish at the plan

- **WHEN** the person picks *Build and publish* in the question under a finished plan
- **THEN** the agent runs `/ship`, which builds, checks, and merges with no stop at the preview

#### Scenario: The person types /ship

- **WHEN** the person invokes `/ship add a sign-up page`
- **THEN** the chain runs to the merge with no stop at the plan or before the merge
