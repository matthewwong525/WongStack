# Spec Delta

## ADDED Requirements

### Requirement: A role gives several people the same access

The employer SHALL be able to name a role holding a set of apps and key levels and give it to people. A person SHALL have one role or their own set, never both. A person with a role SHALL have exactly the role's apps and levels, and a change to the role SHALL govern each such person's next request. Moving a person from a role to their own set, or removing a role people hold, SHALL leave each person with the access they had. People who existed before roles SHALL keep their own set until the employer gives them a role. Only the employer SHALL create, change, give or remove a role, and giving a role SHALL NOT change who can sign in.

#### Scenario: The employer changes a role

- **WHEN** the employer removes an app from a role two people hold and saves
- **THEN** both people's next request to that app is denied, and a person with their own set is unaffected

#### Scenario: The employer removes a role people hold

- **WHEN** the employer removes a role that two people hold
- **THEN** each keeps the same apps and key levels as their own set
