# Spec Delta

## REMOVED Requirements

### Requirement: Access works out who can run a skill

**Reason**: Access no longer lists skills; apps and keys are the only things given.

**Migration**: None; *A skill's calls are judged like any other call* keeps how each call is allowed.

## ADDED Requirements

### Requirement: A skill's calls are judged like any other call

Access SHALL store no grant for a skill and SHALL list none. The server SHALL judge each call a skill makes by the caller's own apps and key levels, exactly as it judges the same call from a screen or an assistant. A refused call SHALL say what the caller lacks.

#### Scenario: A person runs a skill that calls an app they hold

- **WHEN** a person who holds Orders runs a skill whose actions all belong to Orders
- **THEN** every call runs, with no skill named anywhere in Access

#### Scenario: A person runs a skill that calls an app they lack

- **WHEN** a person who does not hold Orders runs that skill
- **THEN** its first Orders call is refused before any business work
