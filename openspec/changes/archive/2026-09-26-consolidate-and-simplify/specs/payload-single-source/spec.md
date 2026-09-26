## MODIFIED Requirements

### Requirement: A generated surface is described as what the generator actually produces

Where the payload documents files produced by an external tool rather than copied from the payload, that description SHALL match what the currently supported version of the tool produces, and SHALL be re-checked when the tool's version moves. A claim that a file is generated is a claim a reader will act on — by expecting a command to exist, or by not copying something they then lack.

`openspec init --tools none` is the live instance: setup runs it, and it generates no `openspec-*` skills and no `/opsx:*` commands. Payload prose SHALL NOT offer either as an available surface.

#### Scenario: The manifest matches the generator

- **WHEN** the payload states that a directory or file is produced by an external tool
- **THEN** running that tool at the supported version produces it
- **AND** where it does not, the payload states what is actually produced

#### Scenario: A promised command surface exists

- **WHEN** payload prose tells a reader a command is available to them
- **THEN** a repo set up by following the payload has that command
- **AND** prose does not offer an entry point that a fresh setup lacks

