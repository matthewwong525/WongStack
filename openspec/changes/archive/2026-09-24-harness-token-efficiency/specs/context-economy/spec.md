## ADDED Requirements

### Requirement: Billed usage is measurable per task

The meta-repo SHALL provide a dependency-free script that reads Claude Code transcripts and reports billed cost per task. A task SHALL be one main session plus every subagent it spawned. Each request SHALL be counted once, even when the transcript records it in several parts. Cost SHALL be computed from the recorded usage at list prices for input, 5-minute and 1-hour cache writes, cache reads, and output, and SHALL be reported by billing type, model, active skill, and main thread vs subagents. A model without a known price SHALL be listed and SHALL NOT be priced by a guess. The report SHALL classify prefix rewrites by what preceded them (a model switch, idle over one hour, idle five to sixty minutes, or other). A context-source split SHALL be labelled as an estimate. The script SHALL write no file and SHALL contact no service.

#### Scenario: A request is recorded in several parts

- **WHEN** a transcript holds several records with the same request id
- **THEN** that request's usage is counted once

#### Scenario: A session spawned subagents

- **WHEN** a main session has subagent transcripts
- **THEN** their cost counts toward that one task and is reported separately as subagent cost

#### Scenario: The prefix is rewritten after a long pause

- **WHEN** a request reads less than half of the previous context from cache, writes the rest, and follows the previous request by more than one hour on the same model
- **THEN** its cache-write cost is reported under idle over one hour

#### Scenario: A transcript uses an unknown model

- **WHEN** a request names a model with no price entry
- **THEN** the report lists that model and adds no invented cost for it

#### Scenario: The report is limited to one repository

- **WHEN** the user passes a working-directory filter
- **THEN** only tasks whose recorded working directory contains it are counted
