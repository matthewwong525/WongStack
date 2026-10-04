## MODIFIED Requirements

### Requirement: Setup adds the owner's agent presets without overwriting
Setup SHALL add WongStack's agent presets to the machine's Paseo configuration when Paseo is installed and configured, then ask Paseo to reload it. A preset SHALL be added only when no existing preset has its id or its name, and only when its agent's command is installed. Every other setting and every existing preset SHALL stay unchanged. With Paseo absent or not yet configured, it SHALL change nothing and say so; a failure SHALL NOT stop the install.

#### Scenario: A machine with Claude only
- **WHEN** setup runs on a machine with Paseo and `claude` but no `codex`, and no presets
- **THEN** the two Claude presets are added, the two Codex presets are skipped as not installed, and the report names both

#### Scenario: A preset the person already has
- **WHEN** the person already has a preset named *[CLAUDE] Apply / Ship* using a different model
- **THEN** that preset is left exactly as it was and is reported as kept

#### Scenario: Run twice
- **WHEN** the presets step runs a second time on the same machine
- **THEN** the configuration file is unchanged and nothing is reported as added
