<!-- openspec-archive v1 2026-08-08-simplified-english-requirement -->
<!-- file proposal.md utf8 1618 -->
# Simplified English requirement

**Status:** ready-to-ship
**Open questions:** none

## Why

WongStack has a concise voice guide, but it does not require a controlled form of English. A best-effort ASD-STE100 rule will make agent-facing and user-facing prose easier to read and translate.

## What Changes

- Add a generic `AGENTS.md` rule that requires best-effort ASD-STE100 Simplified Technical English.
- Exempt code, commands, identifiers, quotations, and prescribed text that must remain exact.
- Release the payload change with a minor version bump and a changelog entry.

## Capabilities

### New Capabilities

- `simplified-technical-english`: Defines the payload-wide writing requirement and its exact-text exceptions.

### Modified Capabilities

None.

## Impact

The generic `WONG-STACK` block in `AGENTS.md`, `VERSION`, and `CHANGELOG.md` change. Downstream repositories receive the rule when they adopt or update the block through WongStack.

## Non-goals

This change does not bundle the ASD-STE100 specification, add an automated conformance checker, or claim formally verified compliance.

## Decision log

- **2026-08-08** — Added the shared ASD-STE100 instruction as a best-effort rule because the user confirmed that formal verification is not required. Exact-text exceptions protect code, commands, identifiers, quotations, and prescribed text. Released the payload behavior as version 9.7.0.
- **2026-08-08** — Archived the completed change for the `/ship` checkpoint. The `simplified-technical-english` capability was already synced to the main specifications, and all tasks were complete.

<!-- end proposal.md -->
<!-- file design.md utf8 1998 -->
## Context

The generic `WONG-STACK` block in `AGENTS.md` is the shared doctrine that the installer copies into target repositories. `wiki/voice.md` already asks for short, direct prose, but the shared rules do not name a controlled-English standard.

## Goals / Non-Goals

**Goals:**

- Put one clear ASD-STE100 rule in the generic doctrine.
- State that compliance is best effort.
- Protect exact technical text from rewriting.

**Non-Goals:**

- Distribute or reproduce the ASD-STE100 specification.
- Add a linter or claim certified compliance.
- Rewrite existing repository prose as part of this change.

## Decisions

### Put the rule in the generic `AGENTS.md` block

The rule belongs in the `## Rules` list because it governs agent output across all WongStack repositories. The installer already treats this block as the shared doctrine. A wiki-only rule would not be visible soon enough.

Alternative: Add the rule only to `wiki/voice.md`. This would limit the rule to wiki prose and would require agents to find that page before the rule could apply.

### Define best effort and exact-text exceptions in the rule

The rule will name ASD-STE100, state that best effort is sufficient, and exempt code, commands, identifiers, quotations, and prescribed text. This makes the requirement useful when the standard is not locally available and prevents technical corruption.

Alternative: Use only the sentence “Always use ASD-STE100 Simplified Technical English.” This is shorter, but it can imply formal verification and can cause agents to rewrite text that must stay exact.

## Risks / Trade-offs

- **Risk: Agents have different knowledge of ASD-STE100.** → State that compliance is best effort; do not claim formal conformance.
- **Risk: The new rule conflicts with exact source text.** → Exempt text that must remain exact.
- **Risk: Existing prose does not meet the new rule.** → Apply the rule to new and edited prose; do not make this small change a repository-wide rewrite.

<!-- end design.md -->
<!-- file tasks.md utf8 356 -->
## 1. AGENTS.md doctrine

- [x] 1.1 Add the best-effort ASD-STE100 requirement and exact-text exceptions to the generic `WONG-STACK` rules.

## 2. Release metadata

- [x] 2.1 Bump `VERSION` for the new payload behavior and add a newest-first `CHANGELOG.md` entry.

## 3. Verification

- [x] 3.1 Validate the OpenSpec change and run the payload link check.

<!-- end tasks.md -->
<!-- file specs/simplified-technical-english/spec.md utf8 1338 -->
## ADDED Requirements

### Requirement: Best-effort Simplified Technical English
The generic WongStack doctrine SHALL instruct agents to always use ASD-STE100 Simplified Technical English for user-facing prose and documentation. The doctrine SHALL state that best-effort compliance is sufficient when the full standard or its controlled vocabulary is not available.

#### Scenario: Agent writes ordinary prose
- **WHEN** an agent writes or edits user-facing prose or documentation under the WongStack doctrine
- **THEN** the agent uses ASD-STE100 Simplified Technical English to the best of its ability

#### Scenario: Formal verification is not available
- **WHEN** the repository does not provide the full ASD-STE100 rules or an approved vocabulary
- **THEN** the agent applies the instruction as a best-effort writing rule and does not claim verified conformance

### Requirement: Exact technical text stays exact
The doctrine MUST exempt code, commands, identifiers, quotations, and prescribed text that must keep an exact form from Simplified Technical English rewriting.

#### Scenario: Prose contains exact text
- **WHEN** user-facing prose includes code, a command, an identifier, a quotation, or prescribed wording
- **THEN** the agent keeps that text exact while it applies Simplified Technical English to the surrounding prose

<!-- end specs/simplified-technical-english/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-08

~~~
<!-- end .openspec.yaml -->
