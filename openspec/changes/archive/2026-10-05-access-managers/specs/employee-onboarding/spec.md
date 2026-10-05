# Spec Delta

## ADDED Requirements

### Requirement: The employer chooses who else manages Access

The employer SHALL be able to make a current person a manager, and only the employer SHALL make or unmake one. A manager SHALL be able to do in Access what the employer can: add, change and remove people, create, change, give and remove roles, and set app grants and key levels, for any person, themselves and other managers included. A manager SHALL NOT make or unmake a manager, remove a manager, or change or remove the employer, and no screen SHALL change who the employer is. Being a manager SHALL give no app, no key level and no other employer authority by itself. Where the employer chooses a manager, Access SHALL say that a manager can give themselves any app or key level. A manager's authority SHALL be read on every request: once the employer unmakes or removes a manager, that person's next management request SHALL be refused, and a removed person added again SHALL NOT be a manager. On the live app the verification service token SHALL never be a manager.

#### Scenario: A manager adds a person

- **WHEN** a manager saves a new person's email with Orders access
- **THEN** that person is assigned Orders only and their sign-in status is reported, as it would be for the employer

#### Scenario: A manager tries to pick or remove a manager

- **WHEN** a manager sends a request that makes someone a manager, unmakes one, removes one, or changes the employer
- **THEN** it is denied and nobody's access or authority changes

## MODIFIED Requirements

### Requirement: The employer manages employee grants through Access

The employer SHALL be the person whose verified signed-in email equals the owner email setup recorded in the installation's committed configuration; no private activation record, command or rollout list SHALL be required before Access opens. Only the employer and the managers the employer chose SHALL add, edit or remove employees or change selected-app grants. A new employee SHALL have no business apps preselected and SHALL receive no repository authority from app login. A newly built app SHALL appear in Access unassigned and SHALL require an explicit assignment. A current employee with no assigned business apps SHALL retain only their self-service setup/status. Public routing, service identity, request content and first visitation SHALL establish no employer authority. An installation with no recorded owner email SHALL keep its existing behavior and report Access setup unfinished.

#### Scenario: Employer adds a person

- **WHEN** the employer saves a person's email with Orders access
- **THEN** that person is assigned Orders only and the owner receives the ordinary app link to share and the actual admission status

#### Scenario: The owner opens Access for the first time

- **WHEN** the person whose sign-in email is the recorded owner email opens Access with no other setup done
- **THEN** the people list and Add person are available without a private record or command

#### Scenario: Employee attempts membership administration

- **WHEN** an ordinary employee invokes a membership or connection-management endpoint
- **THEN** it is denied without changing any employee or provider resource

### Requirement: A role gives several people the same access

The employer SHALL be able to name a role holding a set of apps and key levels and give it to people. A person SHALL have one role or their own set, never both. A person with a role SHALL have exactly the role's apps and levels, and a change to the role SHALL govern each such person's next request. Moving a person from a role to their own set, or removing a role people hold, SHALL leave each person with the access they had. People who existed before roles SHALL keep their own set until the employer gives them a role. Only the employer or a manager SHALL create, change, give or remove a role, a role SHALL never make its holder a manager, and giving a role SHALL NOT change who can sign in.

#### Scenario: The employer changes a role

- **WHEN** the employer removes an app from a role two people hold and saves
- **THEN** both people's next request to that app is denied, and a person with their own set is unaffected

#### Scenario: The employer removes a role people hold

- **WHEN** the employer removes a role that two people hold
- **THEN** each keeps the same apps and key levels as their own set
