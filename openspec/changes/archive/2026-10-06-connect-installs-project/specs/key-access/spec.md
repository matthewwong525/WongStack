# Spec Delta

## ADDED Requirements

### Requirement: Project code is a key with one level

Access SHALL list Project code among the keys, offering Read as its only level, settable per person and per role like any key and usable with no app ticked. It SHALL count as saved when the installation holds a read-only credential for its one project, or is connected to its own repository in the employer's Cloudflare account. Ticking an app SHALL never give it. Its credential SHALL be usable for reading that one project only, and no action or mini app SHALL be handed it.

#### Scenario: The employer gives Project code to a role

- **WHEN** the employer sets Project code to Read on a role two people hold
- **THEN** both people may install the project on their next request, and a person outside the role may not

#### Scenario: The credential is not saved yet

- **WHEN** the employer opens Keys on an installation that can not yet hand its project out
- **THEN** Project code shows as not saved with the one step left, and nobody's connection changes
