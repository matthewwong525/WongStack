# Staging walkthrough delta

## MODIFIED Requirements

### Requirement: The evidence is graded against the THEN

Each journey SHALL pass only when its evidence shows what its `THEN` describes; a run with no error or a bare `200` SHALL NOT pass. A journey whose evidence shows some of its `THEN` and contradicts none SHALL be reported as partly shown, naming each part not shown and why, and SHALL NOT be reported as a plain pass; it does not change the walk's verdict. Ambiguous evidence SHALL remain unverified and be shown beside its `THEN` for the person to resolve after independent safe checks finish.

#### Scenario: A bare 200

- **WHEN** a request probe returns `200` with a body that does not show the `THEN`
- **THEN** the journey fails

#### Scenario: A part the preview cannot show

- **WHEN** a `THEN` promises a greeting that appears and is announced, and the evidence shows it appearing but nothing can show it announced
- **THEN** the journey is reported as partly shown, naming the announcement, and the walk's verdict is unchanged

#### Scenario: Ambiguity does not stop independent checks

- **WHEN** one journey's evidence is ambiguous and another journey can safely run independently
- **THEN** the independent journey completes before the person is asked to resolve the ambiguous evidence

### Requirement: A failed walk resets staging, then fixes in scope or stops

On `FAILURE` only, `/verify` SHALL reset staging to its seed only when it is an established disposable staging database, separate from production, and no overlapping work depends on its current data. Otherwise it SHALL preserve shared data and clean up only records it owns through known safe operations. It SHALL then fix a failure in this change's own scope, save, and walk again, at most twice, and SHALL report any other failure without fixing it; the report SHALL state the scope judgement. A failure SHALL NOT prevent independent safe checks from completing.

#### Scenario: An in-scope failure

- **WHEN** a journey contradicts its `THEN` in this change's own code
- **THEN** `/verify` safely restores its disposable test data, fixes, saves, and walks again, stopping after two failed attempts

#### Scenario: An out-of-scope failure

- **WHEN** a journey fails on behavior this change did not introduce
- **THEN** `/verify` preserves shared data, reports the failure, and finishes independent safe checks without a fix

## ADDED Requirements

### Requirement: Safe checks finish before a consolidated handoff

Within the requested scope, `/verify` SHALL complete every safe check possible with existing authorization and tools before asking for help. A blocked check SHALL pause only its dependents. The report SHALL distinguish completed, failed, partly shown, and unverified checks. Remaining checks SHALL form one consolidated handoff naming the reason, exact manual action or authorization needed, and expected observation, with options to help, skip selected checks, or skip all remaining checks. Skipped checks SHALL remain explicitly unverified and SHALL NOT be requested again unless the person reopens them. Skipping SHALL NOT imply authorization, erase an observed failure, or count as a pass. After the person helps, verification SHALL resume pending checks and repeat completed checks only when their conditions changed. Waiting or an unattended run SHALL NOT imply authorization.

#### Scenario: One check needs a person's login

- **WHEN** a login blocks one journey while other journeys need no person
- **THEN** those other journeys complete, and the final handoff names the blocked journey and how to enable or manually complete it

#### Scenario: Help enables the pending check

- **WHEN** the person supplies the requested authorization without changing completed checks' conditions
- **THEN** only the pending journey and its dependents resume

#### Scenario: The person skips remaining manual checks

- **WHEN** the person chooses to skip selected or all remaining checks
- **THEN** the report names those checks as skipped and unverified, retains observed failures and coverage gaps, and no further help is requested for them unless the person reopens them

### Requirement: Safe simulations explain their evidence limits

For checks that cannot be completed directly, `/verify` SHALL attempt the strongest safe simulation possible with existing authorization, tools, and deployed test surfaces before asking for help. Simulation SHALL preserve the same staging and external-system safety boundaries. Its report SHALL identify simulated evidence, claims it supports, and real behavior it does not prove. Simulated effects SHALL NOT count as proof of unobserved real effects. If no safe simulation exists, the check SHALL remain unverified with its limitation explained.

#### Scenario: A sandbox can simulate delivery

- **WHEN** actual delivery requires help but an existing safe sandbox can exercise the request and response
- **THEN** verification exercises the sandbox, labels the resulting evidence as simulated, and leaves actual delivery unverified with the option to help or skip it

#### Scenario: No safe simulation is available

- **WHEN** a remaining check has no safely accessible simulation
- **THEN** its limitation is reported without fabricated evidence or unsafe actions, and the person can help or skip the check

### Requirement: Verification preserves staging and external systems

Verification SHALL use staging-only bindings and known sandbox destinations for mutating checks. Reversible writes and destructive journeys SHALL be limited to disposable fixtures or records owned by the invocation with known safe cleanup. Existing shared data, production resources, access controls beyond already authorized repair, and real messages, purchases, or paid resources SHALL require explicit authorization before being changed or triggered. If isolation or safe cleanup cannot be established, the affected checks SHALL remain unverified while independent safe checks continue.

#### Scenario: A disposable delete journey

- **WHEN** a delete scenario has an isolated staging fixture and a known restoration path
- **THEN** the journey runs without a permission prompt and the fixture is safely restored afterwards

#### Scenario: Staging points at a real integration

- **WHEN** a staging journey would send a real message or its integration destination cannot be established
- **THEN** its trigger is deferred for the final authorization handoff and independent safe checks still run
