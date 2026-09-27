# Spec Delta

## ADDED Requirements

### Requirement: A new workspace carries its part's name
Each workspace the agent opens SHALL show its part's short title as its name in Paseo's workspace list, the same title its agent gets, whether it branches off the default branch or checks out a saved change's branch. When Paseo opens the workspace but refuses the name, the workspace and its agent SHALL still run, and the report SHALL say the workspace kept Paseo's own name.

#### Scenario: Named after its part
- **WHEN** the agent opens a new workspace for the part "Release collisions"
- **THEN** Paseo's workspace list shows that workspace as "Release collisions", not a generated name like `nifty-leopard`

#### Scenario: The name is refused
- **WHEN** the workspace opens but Paseo refuses to rename it
- **THEN** the agent still reports the opened workspace and its agent, with a warning that it kept Paseo's name
