# Spec Delta

## REMOVED Requirements

### Requirement: A change asked with no verb stops twice

**Reason**: It carried three scenarios, one of them the plan question's option by name. The promise is kept, under a new name, as "A change asked with no verb stops at the plan and at the preview".

**Migration**: None. The two stops and the one-go choice at the plan are unchanged.

## ADDED Requirements

### Requirement: A change asked with no verb stops at the plan and at the preview

A code or process change asked for with no verb SHALL stop at the plan's review link to ask whether to build it, and after the build's preview to ask whether to publish, running the next verb on yes. The question at the plan SHALL also offer to build and publish in one go, with no stop before the merge. A verb the person types SHALL keep its own reach.

#### Scenario: Yes to both stops

- **WHEN** the person asks to change how the app stores data, then says yes at both stops
- **THEN** the agent runs `/plan`, `/apply`, and `/ship` without the person naming a verb

#### Scenario: The person types /ship

- **WHEN** the person invokes `/ship add a sign-up page`
- **THEN** the chain runs to the merge with no stop at the plan or before the merge
