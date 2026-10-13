# Spec Delta

## REMOVED Requirements

### Requirement: Safe checks finish before a consolidated handoff

**Reason**: It held two promises and three scenarios. Both are kept, each under its own name: "Safe checks finish before one handoff" and "A skipped check stays unverified".

**Migration**: None. The walk asks for help and treats a skip as before.

## ADDED Requirements

### Requirement: Safe checks finish before one handoff

Within the requested scope, `/verify` SHALL complete every safe check possible with existing authorization and tools before asking for help. A blocked check SHALL pause only its dependents. Remaining checks SHALL form one handoff naming, for each, the reason, the exact action or authorization needed, and what the check should show. After the person helps, verification SHALL resume pending checks and repeat completed checks only when their conditions changed. Waiting or an unattended run SHALL NOT imply authorization.

#### Scenario: One check needs a person's login

- **WHEN** a login blocks one journey while other journeys need no person
- **THEN** those other journeys complete, and the final handoff names the blocked journey and how to enable or manually complete it

#### Scenario: Help enables the pending check

- **WHEN** the person supplies the requested authorization without changing completed checks' conditions
- **THEN** only the pending journey and its dependents resume

### Requirement: A skipped check stays unverified

The handoff SHALL let the person help, skip selected checks, or skip all that remain. A skipped check SHALL be reported as skipped and unverified, and SHALL NOT be requested again unless the person reopens it. Skipping SHALL NOT imply authorization, erase an observed failure, or count as a pass. The report SHALL distinguish completed, failed, partly shown, and unverified checks.

#### Scenario: The person skips remaining manual checks

- **WHEN** the person chooses to skip selected or all remaining checks
- **THEN** the report names those checks as skipped and unverified, retains observed failures and coverage gaps, and no further help is requested for them unless the person reopens them

## MODIFIED Requirements

### Requirement: A failed walk resets staging, then fixes in scope or stops

On `FAILURE`, `/verify` SHALL fix a failure in this change's own scope, save, rebuild staging from the seed under its turn, and walk again, at most twice, and SHALL report any other failure without fixing it; the report SHALL state the scope judgement. When an existing CI harness can cheaply reproduce an in-scope defect, the repair SHALL retain a focused regression check and evidence of that same check failing on the earlier source for the observed defect and passing on the repaired source. Where a lasting check is impractical, the report SHALL retain the available reproduction and explain the limitation without requiring new test infrastructure or weakening the delivery gate. A failure SHALL NOT prevent independent safe checks from completing.

#### Scenario: An in-scope failure

- **WHEN** a journey contradicts its `THEN` in this change's own code
- **THEN** `/verify` fixes, saves, rebuilds staging, and walks again, stopping after two failed attempts; a practical existing test path produces a retained regression with failing-before and passing-after evidence, otherwise the reproduction's limitation is reported

#### Scenario: An out-of-scope failure

- **WHEN** a journey fails on behavior this change did not introduce
- **THEN** `/verify` reports the failure and finishes independent safe checks without a fix

### Requirement: Related consumers are checked through confirmed contracts

Verification SHALL examine the material assumptions connecting changed behavior to its consumers and select a small set of existing checks that can disprove them. Selected checks SHALL name the concrete caller or data-contract relationship and their canonical expected behavior, including consumers in another capability. Speculative relationships SHALL NOT justify a whole-app sweep. Missing expectations or unavailable observation routes SHALL be reported as coverage gaps rather than invented promises.

#### Scenario: An API change feeds another screen

- **WHEN** a changed API field has a confirmed consumer in a screen covered by another capability
- **THEN** verification selects the relevant existing screen scenario, records the relationship, and reports what its evidence shows alongside the change's own checks

#### Scenario: A suspected consumer has no established relationship

- **WHEN** a possible consumer is suggested without a confirmed caller or data-contract relationship
- **THEN** verification does not expand the run on that speculation and retains the targeted selected checks
