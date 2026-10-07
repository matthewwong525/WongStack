# Spec Delta

## MODIFIED Requirements

### Requirement: Access works out who can run a skill

Access SHALL list each skill that declares company actions with what it needs: each area and key at the level its actions need, and Project code. A person or role SHALL count as able to run a skill only when their current areas and key levels cover all of it. A skill that declares a key's direct-use action SHALL also need that key's direct-use choice to permit the action, and SHALL count as one nobody can run while the choice does not. Access SHALL store no grant for a skill, and the server SHALL judge each call of a skill by the caller's areas and key levels alone, with the key's direct-use choice for a direct call. For each person or role that cannot run a skill, Access SHALL name what is missing, and SHALL name a direct-use choice that stops a skill once, for the skill, as the employer's to change. An installation with no such skill SHALL say so and say how to get one.

#### Scenario: A person lacks one thing a skill needs

- **WHEN** a skill changes things with Stripe and a person holds its area at Look up & change, Project code, and Stripe at Read
- **THEN** Access shows that person as unable to run the skill and names Stripe: Read & write as what is missing

#### Scenario: A person's level is lowered

- **WHEN** the employer lowers an area a skill needs from Look up & change to Look up for a role and saves
- **THEN** the skill shows as one the role's holders cannot run, and their next call of its changing action is refused

#### Scenario: A skill uses a key directly and direct use is off

- **WHEN** a skill declares Notion's direct look-up, Notion's direct-use choice is off, and a person holds Notion: Read and Project code
- **THEN** Access shows the skill as one nobody can run yet and names Notion: direct use is off, and after the employer picks look-ups only that person shows as able to run it
