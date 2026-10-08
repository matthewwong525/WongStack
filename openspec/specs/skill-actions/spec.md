# Skill actions

## Purpose

Skill actions make a skill usable by every teammate: a skill does business work through company actions under its user's own login, and Access shows who can run each skill and what anyone else is missing.

## Requirements

### Requirement: A skill does business work through company actions

A skill that reads or changes business data SHALL do so by calling company actions under the login of the person running it, and SHALL declare the actions it calls. A skill SHALL NOT read a saved business-service key. The checks that gate publishing SHALL fail when a skill reads such a key, calls a company action it does not declare, or declares an action the app does not have, and SHALL name the skill. The guidance an assistant follows when asked for a skill SHALL say to build or reuse the action first.

#### Scenario: A teammate runs a skill the owner built

- **WHEN** a teammate who holds what a skill needs runs it on their own device, which holds no business key
- **THEN** the skill's work runs through the app under the teammate's login and returns the same result it does for the owner

#### Scenario: A skill reads a key itself

- **WHEN** a change adds a skill whose files name a saved business-service key's secret
- **THEN** the checks fail and name the skill, before the change can publish

### Requirement: A skill's calls are judged like any other call

Access SHALL store no grant for a skill and SHALL list none. The server SHALL judge each call a skill makes by the caller's own apps and key levels, exactly as it judges the same call from a screen or an assistant. A refused call SHALL say what the caller lacks.

#### Scenario: A person runs a skill that calls an app they hold

- **WHEN** a person who holds Orders runs a skill whose actions all belong to Orders
- **THEN** every call runs, with no skill named anywhere in Access

#### Scenario: A person runs a skill that calls an app they lack

- **WHEN** a person who does not hold Orders runs that skill
- **THEN** its first Orders call is refused before any business work
