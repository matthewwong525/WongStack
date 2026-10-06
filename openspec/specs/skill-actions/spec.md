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

### Requirement: Access works out who can run a skill

Access SHALL list each skill that declares company actions with what it needs: each area and key at the level its actions need, and Project code. A person or role SHALL count as able to run a skill only when their current areas and key levels cover all of it. Access SHALL store no grant for a skill, and the server SHALL judge each call of a skill by the caller's areas and key levels alone. For each person or role that cannot run a skill, Access SHALL name what is missing. An installation with no such skill SHALL say so and say how to get one.

#### Scenario: A person lacks one thing a skill needs

- **WHEN** a skill changes things with Stripe and a person holds its area at Look up & change, Project code, and Stripe at Read
- **THEN** Access shows that person as unable to run the skill and names Stripe: Read & write as what is missing

#### Scenario: A person's level is lowered

- **WHEN** the employer lowers an area a skill needs from Look up & change to Look up for a role and saves
- **THEN** the skill shows as one the role's holders cannot run, and their next call of its changing action is refused
