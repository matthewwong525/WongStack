## Purpose

Provide recurring, evidence-based repository spot checks that improve maintainability and catch supported defects through the existing delivery workflow.

## ADDED Requirements

### Requirement: Bounded review with disclosed coverage
The skill SHALL review recent changes and a rotating maintained area unless the user narrows scope. It SHALL use prior maintenance and active work records to avoid duplicate work and SHALL disclose exclusions, missing history, and incomplete reads.

#### Scenario: Weekly run with unchanged area inventory
- **WHEN** broad runs occur in successive weeks with multiple maintained areas
- **THEN** the rotation start advances reproducibly through the area list, the run prefers an area outside recent changes when available, and each run also reviews recent changes

#### Scenario: First run or unavailable baseline
- **WHEN** no usable prior maintenance revision exists
- **THEN** the run uses a stated bounded recent-history fallback and still selects a rotation area

#### Scenario: No change was saved last week
- **WHEN** the prior run found no eligible improvement
- **THEN** the next week's rotation can advance without requiring a maintenance-state commit

### Requirement: Read-only survey with explicit limits
The survey SHALL collect bounded current tracked-file leads without installing tools, contacting services, modifying repository files, or emitting secret values. It SHALL report its supported inputs, exclusions, and failures and SHALL NOT label a repository safe from an empty result.

#### Scenario: Unsupported source language or failed read
- **WHEN** files cannot be analyzed by a survey check
- **THEN** the report exposes the coverage gap and the agent investigates it or states it as unverified

#### Scenario: Escaped scope
- **WHEN** a scope or symlink resolves outside the repository
- **THEN** the survey refuses that read and does not scan the external target

### Requirement: Evidence-based maintenance selection
The skill SHALL investigate and rank candidates with concrete evidence, impact, expected behavior, and a verification probe. Eligible work SHALL include documentation, consolidation, reliability, security, measured performance, and workflow maintenance. It SHALL permit no change when no worthwhile candidate is supported.

#### Scenario: Security pattern with existing protection
- **WHEN** a sensitive pattern is found but investigation shows an effective existing check
- **THEN** the pattern alone does not justify a vulnerability finding or repair

#### Scenario: No worthwhile candidate
- **WHEN** investigation produces no supported eligible improvement
- **THEN** the run reports no change and its coverage limits without manufacturing a cleanup

### Requirement: Explicit execution context
Interactive runs SHALL present investigated candidates and ask one group of material questions before selection is handed off. Explicitly unattended runs SHALL use supported defaults, label them assumed, and defer decisions outside maintenance authority. An unanswered interactive question SHALL remain pending.

#### Scenario: Interactive user has not answered
- **WHEN** a material selection question remains unanswered
- **THEN** the run does not reinterpret silence as unattended execution or permission

#### Scenario: External unattended job
- **WHEN** the invocation or trusted host context explicitly establishes unattended execution
- **THEN** the run can choose an eligible candidate with recorded assumptions without waiting for interactive answers

### Requirement: One change through existing delivery
A normal run SHALL pass one coherent selected intent to `/ship`, preserve all delivery gates, and report blockers. It SHALL require a clean dedicated current checkout and sufficient active-work context before delivery. It SHALL NOT take over unrelated work, perform its own git mutations, or select another fix after delivery starts.

#### Scenario: Active work or freshness cannot be verified
- **WHEN** required context is unavailable or the checkout contains unrelated unfinished work
- **THEN** normal delivery stops with the condition reported

#### Scenario: Delivery fails a gate
- **WHEN** the existing workflow blocks the selected change
- **THEN** the run reports blocked and preserves the work without a weaker delivery path

### Requirement: Audit-only and staged outcomes
Audit-only runs SHALL report ranked findings without edits, fetches, delivery, or durable report creation. A larger improvement SHALL be split only into independently correct stages, with discoverable continuation and completion recorded in the normal change history.

#### Scenario: Audit-only on a dirty checkout
- **WHEN** the user invokes audit-only on local work
- **THEN** the run reports the revision and dirty state with findings and leaves the checkout unchanged

#### Scenario: Final stage completes
- **WHEN** a staged improvement's last independently correct change ships
- **THEN** its record identifies the terminal stage and contains no next-stage instruction

### Requirement: Portable payload and external cadence
The skill SHALL ship in the core payload and discover target repository conventions without requiring ClaymooApp paths or a particular stack. Scheduling SHALL remain external, with documented checkout, serialization, and unattended-context requirements.

#### Scenario: Documentation-only target repository
- **WHEN** the target has documentation and process files but no application source tree
- **THEN** the skill can investigate relevant maintenance without requiring an app runtime

#### Scenario: Existing target-owned improve skill
- **WHEN** setup or sync encounters a local skill with the same name
- **THEN** normal collision/adaptation rules preserve local work rather than silently replacing it
