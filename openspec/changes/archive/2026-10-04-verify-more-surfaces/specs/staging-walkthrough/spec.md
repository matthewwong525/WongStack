# Spec Delta

## MODIFIED Requirements

### Requirement: Nothing to walk costs nothing

`/verify` SHALL read the change's scenarios and any relevant existing verification recipes before any push or credential check. When no deployed probe or existing CI capture route can reach any scenario, the verdict SHALL be `NONE` in one line, with no save, preflight, or browser. A known route that is blocked or lacks usable evidence SHALL remain unverified rather than count as absent.

#### Scenario: A library-only change

- **WHEN** a change's scenarios have no deployed surface or existing CI behavior capture route
- **THEN** the verdict is `NONE` and nothing is pushed or launched

#### Scenario: An existing CI route has no evidence

- **WHEN** a scenario has a configured CI behavior capture route but its evidence is missing
- **THEN** the check is unverified and the verdict is `UNKNOWN`, unless a failure or timeout takes precedence

### Requirement: The walk targets this commit's deployed preview

When there is something to verify, `/verify` SHALL invoke `/save` first and bind evidence to that exact head revision. Deployed probes SHALL target the preview URL CI published for that revision, never a guessed URL or naming pattern. CI behavior probes SHALL use captured evidence whose actual source revision and run identity match the revision being checked. Missing evidence for one surface SHALL block only dependent checks.

#### Scenario: Uncommitted work

- **WHEN** `/verify` runs with uncommitted work and a reachable scenario
- **THEN** `/save` runs first, and verification targets its saved revision and the discovered evidence for that revision

#### Scenario: CI does not deploy

- **WHEN** no preview URL exists for this commit and a scenario needs the deployed app
- **THEN** that scenario is unverified, no URL is guessed, and independent CI behavior checks can still complete

### Requirement: Each scenario gets the strongest probe

The walk SHALL cover the change's delta scenarios plus those of any capability the branch diff touches, and a narrow selection of existing consumer scenarios connected to changed behavior by a confirmed caller or data contract, not the whole spec set. Each scenario SHALL get the strongest available browser journey, request probe, state probe through an existing command, or behavior capture from an existing CI route. Its `WHEN` SHALL define the exercised behavior and its `THEN`, verbatim, SHALL remain the pass criterion. A recipe or green CI check SHALL NOT replace that criterion. A scenario no probe reaches SHALL be listed by name as unverified. Repository code SHALL NOT run on the agent's machine to supply missing evidence.

#### Scenario: An API scenario

- **WHEN** a scenario describes an endpoint's status and body with no UI
- **THEN** it gets a request probe, and the request and response are its evidence

#### Scenario: A scenario only local code could observe

- **WHEN** a scenario is observable only by running the repo's code locally and has no existing CI behavior capture route
- **THEN** it is not walked, and the report lists it by name as unverified

### Requirement: A failed walk resets staging, then fixes in scope or stops

On `FAILURE` only, `/verify` SHALL reset staging to its seed only when it is an established disposable staging database, separate from production, and no overlapping work depends on its current data. Otherwise it SHALL preserve shared data and clean up only records it owns through known safe operations. It SHALL then fix a failure in this change's own scope, save, and walk again, at most twice, and SHALL report any other failure without fixing it; the report SHALL state the scope judgement. When an existing CI harness can cheaply reproduce an in-scope defect, the repair SHALL retain a focused regression check and evidence of that same check failing on the earlier source for the observed defect and passing on the repaired source. Where a lasting check is impractical, the report SHALL retain the available reproduction and explain the limitation without requiring new test infrastructure or weakening the delivery gate. A failure SHALL NOT prevent independent safe checks from completing. Additional consumer checks SHALL NOT expand repair authorization.

#### Scenario: An in-scope failure

- **WHEN** a journey contradicts its `THEN` in this change's own code
- **THEN** `/verify` safely restores its disposable test data, fixes, saves, and walks again, stopping after two failed attempts; a practical existing test path produces a retained regression with failing-before and passing-after evidence, otherwise the reproduction's limitation is reported

#### Scenario: An out-of-scope failure

- **WHEN** a journey fails on behavior this change did not introduce
- **THEN** `/verify` preserves shared data, reports the failure, and finishes independent safe checks without a fix

## ADDED Requirements

### Requirement: Reusable recipes guide capture without changing promises

Projects SHALL be able to retain verification recipes describing a feature's user entry point, capture route, prerequisites, isolation, and cleanup. A recipe SHALL refer to current scenarios rather than duplicate their expected behavior. Verification SHALL read recipes without editing the project; a missing recipe SHALL NOT disable the existing deployed probes. A recipe called proven SHALL have been exercised against the real feature with evidence retained through cleanup. Drift or product failures SHALL be reported honestly rather than silently changing the promise.

#### Scenario: A recipe is reused

- **WHEN** a later change checks a feature with a proven recipe
- **THEN** verification checks the recipe's references and prerequisites, uses its capture route, and grades against the current written scenario

#### Scenario: The described entry point has changed

- **WHEN** a recipe's source or scenario reference no longer exists
- **THEN** the affected check is unverified with the drift named, independent checks continue, and verification does not edit the recipe or weaken the expected behavior

### Requirement: CI behavior evidence proves an observation at an exact revision

CI behavior evidence SHALL identify the repository, actual source revision, run and attempt, capture route, exercised scenario, input and environment, command, and raw observed result. Evidence from another revision, an older superseded attempt, an unaccounted source checkout, or an incomplete or invalid capture SHALL NOT support a pass. A process exit code or suite status alone SHALL NOT prove a scenario. Downloaded artifacts SHALL be read as evidence and SHALL NOT execute code on the agent host. Existing credential scrubbing and owned-folder cleanup SHALL cover imported evidence.

#### Scenario: The command succeeds but the promised output is absent

- **WHEN** a valid CI capture shows a successful command whose raw output contradicts the scenario's expected result
- **THEN** verification reports the contradiction as a failure rather than treating CI success as proof

#### Scenario: An earlier attempt supplied a passing capture

- **WHEN** the current revision's newest run attempt lacks valid evidence but an older attempt has a passing capture
- **THEN** the check remains unverified and the older capture is not substituted

### Requirement: Before and after proof uses comparable observations

For an explicit fix or preservation claim, verification SHALL compare available observations from the named earlier revision and the changed revision using the same behavior, inputs, capture method, and relevant environment. The report SHALL identify both revisions, results, and comparison limitations. A head-only pass SHALL NOT prove an unobserved repair. New behavior absent from the earlier revision SHALL be judged from its head evidence with the absence stated. Relevant existing preservation scenarios SHALL be selected narrowly from the affected behavior, without a whole-app sweep.

#### Scenario: A fix has comparable evidence

- **WHEN** the same failing user action is captured on the earlier revision and succeeds as promised on the changed revision under comparable conditions
- **THEN** the report shows both observations and the observed improvement beside the written claim

#### Scenario: The earlier check used different inputs

- **WHEN** the earlier and changed captures use different inputs or incompatible capture methods
- **THEN** the comparison stays unverified, its limitation is named, and independently valid head observations remain in the report

### Requirement: Related consumers are checked through confirmed contracts

Verification SHALL examine the material assumptions connecting changed behavior to its consumers and select a small set of existing checks that can disprove them. Selected checks SHALL name the concrete caller or data-contract relationship and their canonical expected behavior, including consumers in another capability. Speculative relationships SHALL NOT justify a whole-app sweep. Missing expectations or unavailable observation routes SHALL be reported as coverage gaps rather than invented promises. An unrelated consumer failure SHALL remain outside repair scope.

#### Scenario: An API change feeds another screen

- **WHEN** a changed API field has a confirmed consumer in a screen covered by another capability
- **THEN** verification selects the relevant existing screen scenario, records the relationship, and reports what its evidence shows alongside the change's own checks

#### Scenario: A suspected consumer has no established relationship

- **WHEN** a possible consumer is suggested without a confirmed caller or data-contract relationship
- **THEN** verification does not expand the run on that speculation and retains the targeted selected checks

### Requirement: Lasting effects are observed after the initiating action

When a written expectation promises a persisted or externally consumed result, verification SHALL capture the initiating action and a fresh observation of the promised result through its real consumer. A success message, cached view, or producer self-report SHALL NOT establish that effect. A contradicted readback SHALL be a failure; unavailable readback SHALL retain the existing blocked or partly-shown evidence limits. Read-only promises SHALL NOT acquire invented persistence requirements. All follow-up observations SHALL preserve existing data and external-system safety boundaries.

#### Scenario: A save reports success but loses its value

- **WHEN** a save action reports success but a fresh read after reload shows that the promised stored value is missing or changed
- **THEN** verification reports failure with both observations, even though the initial action appeared successful

#### Scenario: An export survives independently

- **WHEN** a scenario promises an exported file and verification reads the resulting file's bytes independently of the export's success response
- **THEN** that readback is evidence for the promised file contents, with the initiating action and follow-up identified

### Requirement: A broader check reports all surfaces together

A run combining deployed and CI behavior probes SHALL issue one final report covering each scenario's written expectation, observed result, probe, environment and revision, comparisons, and remaining gaps. A missing preview SHALL NOT prevent a CI-only run. A blocked reachable probe SHALL remain unverified and SHALL affect the overall verdict under the existing five-verdict precedence. Head changes SHALL prevent evidence for the previous head being presented as verification of the new head.

#### Scenario: No preview but valid command-line evidence

- **WHEN** every selected scenario is a command-line check with valid CI behavior evidence for the saved head and no preview exists
- **THEN** verification grades that evidence and reports the result without requiring or inventing a preview

#### Scenario: One web check is blocked

- **WHEN** a selected web check lacks its preview while an independent command-line check has valid evidence
- **THEN** the command-line check completes and the report names the web check as unverified, with overall `UNKNOWN` unless failure or timeout takes precedence
